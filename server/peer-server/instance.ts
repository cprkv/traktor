import { EventEmitter } from "node:events";
import { Realm, IRealm } from "./models/realm.ts";
import { CheckBrokenConnections } from "./services/checkBrokenConnections.ts";
import { MessagesExpire } from "./services/messagesExpire.ts";
import { WebSocketServer } from "./services/webSocketServer.ts";
import { MessageHandler } from "./messageHandler/index.ts";
import { Client } from "./models/client.ts";
import type { IMessage } from "./models/message.ts";
import type { IConfig } from "./config.ts";
import type { Router } from "oak";

type Events = {
  connection: [Client];
  disconnect: [Client];
  message: [Client, IMessage];
  error: [Error];
};

export class PeerInstance extends EventEmitter<Events> {
  public readonly realm: IRealm;
  private readonly config: IConfig;

  constructor(config: IConfig) {
    super();
    this.realm = new Realm();
    this.config = config;
  }

  public start(): Router {
    const messageHandler = new MessageHandler(this.realm);
    const messagesExpire = new MessagesExpire(
      this.realm,
      this.config,
      messageHandler
    );

    const checkBrokenConnections = new CheckBrokenConnections(
      this.realm,
      this.config
    );
    checkBrokenConnections.on("close", (client) =>
      this.emit("disconnect", client)
    );

    const webSocketServer = new WebSocketServer(this.realm, this.config);
    webSocketServer.on("connection", (client: Client) => {
      const messageQueue = this.realm.getMessageQueueById(client.getId());
      if (messageQueue) {
        let message: IMessage | undefined;
        while ((message = messageQueue.readMessage())) {
          messageHandler.handle(client, message);
        }
        this.realm.clearMessageQueue(client.getId());
      }
      this.emit("connection", client);
    });
    webSocketServer.on("message", (client: Client, message: IMessage) => {
      this.emit("message", client, message);
      messageHandler.handle(client, message);
    });
    webSocketServer.on("close", (client: Client) => {
      this.emit("disconnect", client);
    });
    webSocketServer.on("error", (error: Error) => {
      this.emit("error", error);
    });

    const router = webSocketServer.start();
    messagesExpire.startMessagesExpiration();
    checkBrokenConnections.start();

    return router;
  }
}
