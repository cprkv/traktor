import { MessageType } from "../enums.ts";
import { HeartbeatHandler, makeTransmissionHandler } from "./handlers/index.ts";
import { HandlersRegistry } from "./handlersRegistry.ts";
import type { Client } from "../models/client.ts";
import type { IMessage } from "../models/message.ts";
import type { IRealm } from "../models/realm.ts";
import type { Handler, IMessageHandler } from "./handler.ts";

export class MessageHandler implements IMessageHandler {
  private readonly handlersRegistry = new HandlersRegistry();

  constructor(realm: IRealm) {
    const transmissionHandler = makeTransmissionHandler(realm);

    const handleTransmission: Handler = (
      client,
      { type, src, dst, payload }
    ): boolean => {
      // NOTE (vadik): intentionally copy msg specific fields (why?)
      return transmissionHandler(client, {
        type,
        src,
        dst,
        payload,
      });
    };

    this.handlersRegistry
      .registerHandler(MessageType.HEARTBEAT, HeartbeatHandler)
      .registerHandler(MessageType.OFFER, handleTransmission)
      .registerHandler(MessageType.ANSWER, handleTransmission)
      .registerHandler(MessageType.CANDIDATE, handleTransmission)
      .registerHandler(MessageType.LEAVE, handleTransmission)
      .registerHandler(MessageType.EXPIRE, handleTransmission);
  }

  public handle(client: Client | undefined, message: IMessage): boolean {
    return this.handlersRegistry.handle(client, message);
  }
}
