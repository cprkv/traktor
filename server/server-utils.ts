import { Status, STATUS_TEXT, type Context } from "oak";

export function responseJson<T extends object>(
  ctx: Context,
  result: T,
  status: Status = Status.OK
) {
  ctx.response.type = "json";
  ctx.response.status = status;
  ctx.response.body = result;
}

export function responseError(
  ctx: Context,
  status: Status = Status.BadRequest,
  message: string | undefined = undefined
) {
  responseJson(ctx, { message: message ?? STATUS_TEXT[status] }, status);
}

export function requireNotNull<T>(ctx: Context, obj: T, field: keyof T) {
  if (
    !obj ||
    !Object.hasOwn(obj, field) ||
    obj[field] == null ||
    obj[field] == undefined
  ) {
    return ctx.throw(
      Status.BadRequest,
      `Value of '${field.toString()}' is none`
    );
  }
}

export function requireStringLength<T>(
  ctx: Context,
  obj: T,
  field: keyof T,
  min: number | null,
  max: number | null
) {
  requireNotNull(ctx, obj, field);
  const str = obj[field] as string;
  if (min && str.length < min) {
    ctx.throw(Status.BadRequest, `Value of '${field.toString()}' is too small`);
  }
  if (max && str.length > max) {
    ctx.throw(Status.BadRequest, `Value of '${field.toString()}' is too big`);
  }
}
