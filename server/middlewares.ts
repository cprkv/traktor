import {
  HttpError,
  isHttpError,
  type Middleware,
  Status,
  STATUS_TEXT,
} from "oak";
import { walk } from "@std/fs";
import * as path from "@std/path";
import * as mediaTypes from "@std/media-types";
import { httpLog } from "./log.ts";
import { responseError } from "./server-utils.ts";

interface File {
  buffer: Uint8Array;
  contentType: string;
}

export async function serveStatic(dir: string): Promise<Middleware> {
  const staticFilesMap = new Map<string, File>();
  const filesETag = "W/" + new Date().getTime().toString();

  for await (const file of walk(dir)) {
    if (file.isFile) {
      const url = "/" + path.relative(dir, file.path).replaceAll("\\", "/");
      const buffer = await Deno.readFile(file.path);
      const ext = path.extname(file.name);
      const contentType = mediaTypes.contentType(ext);
      if (!contentType)
        throw new Error(`unknown content type for file: ${ext}`);
      staticFilesMap.set(url, { buffer, contentType });
    }
  }

  httpLog.info`serving static files ${staticFilesMap.keys()}`;

  return async (context, next) => {
    const urlPath = context.request.url.pathname;
    const file = staticFilesMap.get(urlPath);

    if (file) {
      const ifNoneMatch = context.request.headers.get("If-None-Match");
      if (ifNoneMatch && ifNoneMatch == filesETag) {
        context.response.status = Status.NotModified;
        return;
      }
      context.response.body = file.buffer;
      context.response.headers.set("Content-Type", file.contentType);
      context.response.headers.set("ETag", filesETag);
    } else {
      await next();
    }
  };
}

export const logMiddleware: Middleware = async (ctx, next) => {
  httpLog.debug(`${ctx.request.method} ${ctx.request.url}`);
  await next();
  httpLog.debug(
    `(response): ${ctx.request.method} ${ctx.request.url} -> ${ctx.response.status}`
  );
};

export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      const httpErr = err as HttpError;
      responseError(
        ctx,
        httpErr.status,
        httpErr.message ?? STATUS_TEXT[httpErr.status]
      );
    } else {
      console.error("error middleware (unknown error):", err);
      responseError(
        ctx,
        Status.InternalServerError,
        STATUS_TEXT[Status.InternalServerError]
      );
    }
  }
};
