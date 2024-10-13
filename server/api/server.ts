import { Router, Status } from "oak";
import { DB } from "../db.ts";
import { Authentication } from "./auth.ts";
import type {
  AuthLoginInfo,
  CreateRoomInfo,
  CreateUserInfo,
} from "./models.ts";
import { hashPassword } from "./hash-passowrd.ts";
import { requireStringLength, responseJson } from "../server-utils.ts";

export interface ServeFrontSettings {
  port: number;
  staticDir: string;
  host: string;
}

export interface RoomCounter {
  getRoomCount: (roomName: string) => number;
}

export function makeApiRoutes(db: DB, roomCounter: RoomCounter) {
  const router = new Router();

  router.get("/userInfo", async (ctx) => {
    const auth = new Authentication(ctx, db);
    const userInfo = await auth.getAuthenticatedUser();
    return responseJson(ctx, userInfo);
  });

  router.post("/auth", async (ctx) => {
    const info: AuthLoginInfo = await ctx.request.body.json();
    const auth = new Authentication(ctx, db);
    const userInfo = await auth.authenticateUser(info);
    return responseJson(ctx, userInfo);
  });

  router.delete("/auth", async (ctx) => {
    const auth = new Authentication(ctx, db);
    await auth.deauthenticate();
    return responseJson(ctx, {});
  });

  router.get("/users", async (ctx) => {
    const auth = new Authentication(ctx, db);
    const currentUser = await auth.getAuthenticatedUser();
    if (!currentUser.canCreateUsers) {
      return ctx.throw(Status.Unauthorized);
    }
    return responseJson(ctx, db.users.getAll());
  });

  router.post("/users", async (ctx) => {
    const auth = new Authentication(ctx, db);
    const currentUser = await auth.getAuthenticatedUser();
    if (!currentUser.canCreateUsers) {
      return ctx.throw(Status.Unauthorized);
    }
    const newUserInfo: CreateUserInfo = await ctx.request.body.json();
    requireStringLength(ctx, newUserInfo, "login", 3, 18);
    requireStringLength(ctx, newUserInfo, "password", 8, 64);
    if (db.users.find(newUserInfo.login)) {
      return ctx.throw(Status.Conflict);
    }
    const hash = await hashPassword(newUserInfo.password);
    db.users.add(newUserInfo.login, { ...newUserInfo, hash });
    return responseJson(ctx, {});
  });

  router.delete("/users/:login", async (ctx) => {
    const auth = new Authentication(ctx, db);
    const currentUser = await auth.getAuthenticatedUser();
    if (!currentUser.canCreateUsers) {
      return ctx.throw(Status.Unauthorized);
    }
    if (!db.users.find(ctx.params.login)) {
      return ctx.throw(Status.NotFound);
    }
    if (ctx.params.login == currentUser.login) {
      return ctx.throw(Status.BadRequest, "You can't delete yourself!");
    }
    db.users.delete(ctx.params.login);
    return responseJson(ctx, {});
  });

  router.get("/rooms", async (ctx) => {
    const auth = new Authentication(ctx, db);
    await auth.getAuthenticatedUser();
    return responseJson(
      ctx,
      db.rooms.getAll().map((x) => {
        return { ...x, count: roomCounter.getRoomCount(x.name) };
      })
    );
  });

  router.post("/rooms", async (ctx) => {
    const auth = new Authentication(ctx, db);
    const currentUser = await auth.getAuthenticatedUser();
    if (!currentUser.canCreateRooms) {
      return ctx.throw(Status.Unauthorized);
    }
    const newRoomInfo: CreateRoomInfo = await ctx.request.body.json();
    requireStringLength(ctx, newRoomInfo, "name", 3, 20);
    if (db.rooms.find(newRoomInfo.name)) {
      return ctx.throw(Status.Conflict);
    }
    db.rooms.add(newRoomInfo.name, {
      ...newRoomInfo,
      createdAt: new Date().getTime(),
      createdBy: currentUser.login,
    });
    return responseJson(ctx, {});
  });

  router.delete("/rooms/:name", async (ctx) => {
    const auth = new Authentication(ctx, db);
    const currentUser = await auth.getAuthenticatedUser();
    if (!currentUser.canCreateRooms) {
      return ctx.throw(Status.Unauthorized);
    }
    if (!db.rooms.find(ctx.params.name)) {
      return ctx.throw(Status.NotFound);
    }
    // TODO: may be check room author?
    db.rooms.delete(ctx.params.name);
    return responseJson(ctx, {});
  });

  return router;
}
