import { default as EventEmitter } from "node:events";
import type { IConfig } from "../config.ts";
import type { Client } from "../models/client.ts";
import type { IRealm } from "../models/realm.ts";

const DEFAULT_CHECK_INTERVAL = 300;

type CustomConfig = Pick<IConfig, "aliveTimeout">;

type Events = {
  close: [Client];
};

export class CheckBrokenConnections extends EventEmitter<Events> {
  public readonly checkInterval: number;
  private timeoutId: number | null = null;
  private readonly realm: IRealm;
  private readonly config: CustomConfig;

  constructor(
    realm: IRealm,
    config: CustomConfig,
    checkInterval: number = DEFAULT_CHECK_INTERVAL
  ) {
    super();
    this.realm = realm;
    this.config = config;
    this.checkInterval = checkInterval;
  }

  public start(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.checkConnections();
      this.timeoutId = null;
      this.start();
    }, this.checkInterval);
  }

  public stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private checkConnections(): void {
    const clientsIds = this.realm.getClientsIds();
    const now = new Date().getTime();
    const { aliveTimeout: aliveTimeout } = this.config;

    for (const clientId of clientsIds) {
      const client = this.realm.getClientById(clientId);
      if (!client) {
        continue;
      }

      const timeSinceLastPing = now - client.getLastPing();
      if (timeSinceLastPing < aliveTimeout) {
        continue;
      }

      try {
        client.getSocket()?.close();
      } finally {
        this.realm.clearMessageQueue(clientId);
        this.realm.removeClientById(clientId);
        client.setSocket(null);
        this.emit("close", client);
      }
    }
  }
}
