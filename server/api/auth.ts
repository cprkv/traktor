import { Context, Status } from "oak";
import { hashPasswordVerify } from "./hash-passowrd.ts";
import * as jwt from "./jwt.ts";
import type { AuthLoginInfo, UserInfo } from "./models.ts";
import { DB } from "../db.ts";
import { httpLog } from "../log.ts";

export class Authentication {
  private db: DB;
  private ctx: Context;

  constructor(ctx: Context, db: DB) {
    this.ctx = ctx;
    this.db = db;
  }

  async getAuthenticatedUser(): Promise<UserInfo> {
    const auth = await this.ctx.cookies.get("auth");
    if (!auth) {
      this.ctx.throw(Status.Unauthorized);
    }
    try {
      const userInfo = await jwt.verify(auth);
      const user = this.db.users.find(userInfo.login);
      if (
        !user ||
        userInfo.canCreateRooms != user.canCreateRooms ||
        userInfo.canCreateUsers != user.canCreateUsers
      ) {
        console.log("bad user:", user);
        this.ctx.throw(Status.Unauthorized);
      }
      return userInfo;
    } catch (err) {
      httpLog.debug(`get authenticated user error: ${err}`);
      this.ctx.throw(Status.Unauthorized);
    }
  }

  async authenticateUser({
    login,
    password,
  }: AuthLoginInfo): Promise<UserInfo> {
    try {
      const user = this.db.users.find(login)!;
      if (!(await hashPasswordVerify(user.hash, password))) {
        httpLog.debug(`hash password verify failed!`);
        return this.ctx.throw(Status.Unauthorized);
      }
      const userInfo: UserInfo = {
        login: user.login,
        canCreateRooms: user.canCreateRooms,
        canCreateUsers: user.canCreateUsers,
      };
      const token = await jwt.issue(userInfo);
      await this.ctx.cookies.set("auth", token, {
        httpOnly: true,
      });
      return userInfo;
    } catch (err) {
      httpLog.debug(`authenticate user error: ${err}`);
      return this.ctx.throw(Status.Unauthorized);
    }
  }

  async deauthenticate() {
    await this.ctx.cookies.delete("auth", {
      httpOnly: true,
    });
  }
}
