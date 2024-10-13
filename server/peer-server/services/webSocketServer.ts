import { EventEmitter } from "node:events";
import { Errors, MessageType } from "../enums.ts";
import { Client } from "../models/client.ts";
import type { IConfig } from "../config.ts";
import type { IRealm } from "../models/realm.ts";
import { IMessage } from "../models/message.ts";
import { peerjsLog } from "../../log.ts";
import { Router, Status } from "oak";

type WebSocketEvents = {
  connection: [Client];
  close: [Client];
  message: [Client, IMessage];
  error: [Error];
};

export class WebSocketServer extends EventEmitter<WebSocketEvents> {
  private readonly realm: IRealm;
  private readonly config: IConfig;

  constructor(realm: IRealm, config: IConfig) {
    super();
    this.setMaxListeners(0);
    this.realm = realm;
    this.config = config;
  }

  start(): Router {
    const router = new Router();
    router.get("/", async (ctx) => {
      peerjsLog.debug`got peerjs connection`;
      if (!ctx.isUpgradable) {
        ctx.throw(Status.PreconditionFailed);
      }
      await this.config.authHandler(ctx);
      const socket = ctx.upgrade();
      const url = ctx.request.url;
      socket.addEventListener("open", () => {
        this._onSocketConnection(socket, url);
      });
      socket.addEventListener("error", (ev: Event) => {
        peerjsLog.debug`socket error: ${ev}`;

        if (ev instanceof ErrorEvent) {
          this._onSocketError(new Error(ev.message));
        } else if (Object.hasOwn(ev, "message")) {
          const messagable = ev as { message: string } & Event;
          if (messagable.message) {
            this._onSocketError(new Error(messagable.message));
          } else {
            this._onSocketError(new Error(ev.type));
          }
        } else {
          this._onSocketError(new Error(ev.type));
        }
      });
    });
    return router;
  }

  private _onSocketConnection(socket: WebSocket, requestUrl: URL): void {
    peerjsLog.debug`new socket connection: ${requestUrl.href}`;

    // NOTE: We are only interested in the query, the base url is therefore not relevant
    const { searchParams } = new URL(requestUrl ?? "", "https://peerjs");

    // NOTE (vadik): also has { key }
    const { id, token, key } = Object.fromEntries(searchParams.entries());

    if (!id || !token) {
      this._send(socket, MessageType.ERROR, Errors.INVALID_WS_PARAMETERS);
      socket.close();
      return;
    }

    // TODO (vadik): check authentication
    // if (key !== this.config.key) {
    //   this._sendErrorAndClose(socket, Errors.INVALID_KEY);
    //   return;
    // }

    let client = this.realm.getClientById(id);

    if (client && token !== client.getToken()) {
      // ID-taken, invalid token
      this._send(socket, MessageType.ID_TAKEN, Errors.ID_TAKEN);
      socket.close();
      return;
    }

    if (!client) {
      client = this._registerClient(socket, id, token, key);
    }

    if (client) {
      this._configureWS(socket, client);
    }
  }

  private _onSocketError(error: Error): void {
    this.emit("error", error);
  }

  private _registerClient(
    socket: WebSocket,
    id: string,
    token: string,
    room: string
  ): Client | undefined {
    const clientsCount = this.realm.getClientsIds().length;
    if (clientsCount >= this.config.concurrentLimit) {
      this._send(socket, MessageType.ERROR, Errors.CONNECTION_LIMIT_EXCEED);
      socket.close();
      return;
    }
    const newClient: Client = new Client(id, token, room);
    this.realm.addClient(newClient);
    this._send(socket, MessageType.OPEN);
    return newClient;
  }

  private _configureWS(socket: WebSocket, client: Client): void {
    client.setSocket(socket);

    socket.addEventListener("close", () => {
      if (client.getSocket() === socket) {
        this.realm.removeClientById(client.getId());
        this.emit("close", client);
      }
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data.toString()) as Writable<IMessage>;
        message.src = client.getId();
        this.emit("message", client, message);
      } catch (e) {
        if (e instanceof Error) {
          this.emit("error", e);
        } else {
          this.emit("error", new Error(e + ""));
        }
      }
    });

    this.emit("connection", client);
  }

  private _send(
    socket: WebSocket,
    type: string,
    msg: string | undefined = undefined
  ) {
    peerjsLog.debug`socket send ${type} ${msg}`;
    const payload = { msg };
    socket.send(JSON.stringify({ type, payload }));
  }
}

type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};
