import { DB as SQLite } from "sqlite";
import type { PasswordHash } from "./api/hash-passowrd.ts";
import { dbLog } from "./log.ts";
import { DBLog, ObjectTable, type IObjectTable } from "./object-table.ts";
import * as path from "@std/path";

export interface DBUser {
  login: string;
  hash: PasswordHash;
  canCreateRooms: boolean;
  canCreateUsers: boolean;
}

export interface DBRoom {
  name: string;
  createdBy: string;
  createdAt: number;
}

export class DB {
  private db: SQLite;
  public readonly users: IObjectTable<DBUser>;
  public readonly rooms: IObjectTable<DBRoom>;

  constructor(dir: string) {
    const databasePath = path.join(dir, "traktor.db");
    dbLog.debug`open database ${databasePath}`;
    this.db = new SQLite(databasePath);
    this.users = new DBLog(new ObjectTable(this.db, "users"));
    this.rooms = new DBLog(new ObjectTable(this.db, "rooms"));
  }

  close() {
    console.log("closing database");
    this.db.close();
  }
}
