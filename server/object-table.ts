import { DB as SQLite } from "sqlite";
import { dbLog } from "./log.ts";

export interface IObjectTable<T extends object> {
  add(name: string, value: T): void;
  find(name: string): T | null;
  getAll(): T[];
  delete(name: string): void;
  get rowName(): string;
}

export class DBLog<T extends object> implements IObjectTable<T> {
  private origin: IObjectTable<T>;

  constructor(origin: IObjectTable<T>) {
    this.origin = origin;
  }

  add(name: string, value: T): void {
    try {
      this.origin.add(name, value);
      dbLog.debug`${this.rowName} add(${name}, ${value}) = OK`;
    } catch (err) {
      dbLog.debug`${this.rowName} add(${name}, ${value}) = ${err}`;
      throw err;
    }
  }

  find(name: string): T | null {
    try {
      const result = this.origin.find(name);
      dbLog.debug`${this.rowName} find(${name}) = ${result}`;
      return result;
    } catch (err) {
      dbLog.debug`${this.rowName} find(${name}) = ${err}`;
      throw err;
    }
  }

  getAll(): T[] {
    try {
      const result = this.origin.getAll();
      dbLog.debug`${this.rowName} getAll() = ${result}`;
      return result;
    } catch (err) {
      dbLog.debug`${this.rowName} getAll() = ${err}`;
      throw err;
    }
  }

  delete(name: string): void {
    try {
      this.origin.delete(name);
      dbLog.debug`${this.rowName} delete(${name}) = OK`;
    } catch (err) {
      dbLog.debug`${this.rowName} delete(${name}) = ${err}`;
      throw err;
    }
  }

  get rowName(): string {
    return this.origin.rowName;
  }
}

export class ObjectTable<T extends object> implements IObjectTable<T> {
  private db: SQLite;
  private _rowName: string;

  constructor(db: SQLite, rowName: string) {
    this.db = db;
    this._rowName = rowName;
    this.init();
  }

  find(name: string): T | null {
    const rows = this.db.query<[string]>(
      `SELECT info FROM ${this.rowName} WHERE name = ?`,
      [name]
    );
    if (rows.length == 0) {
      return null;
    }
    if (rows.length > 1) {
      throw new Error(`too many rows`);
    }
    const [userInfo] = rows[0];
    return JSON.parse(userInfo) as T;
  }

  getAll(): T[] {
    const rows = this.db.query<[string]>(`SELECT info FROM ${this.rowName}`);
    return rows.map(([value]) => JSON.parse(value) as T);
  }

  delete(name: string) {
    this.db.transaction(() => {
      this.db.query<[string]>(`DELETE FROM ${this.rowName} WHERE name = ?`, [
        name,
      ]);
    });
  }

  add(name: string, value: T) {
    this.db.transaction(() => {
      this.db.query(`INSERT INTO ${this.rowName} (name, info) VALUES (?, ?)`, [
        name,
        JSON.stringify(value),
      ]);
    });
  }

  get rowName(): string {
    return this._rowName;
  }

  private init() {
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS ${this.rowName} (
        name TEXT PRIMARY KEY,
        info TEXT
      );
    `);
  }
}
