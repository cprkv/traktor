import type { MessageType } from "../enums.ts";
import type { Client } from "../models/client.ts";
import type { IMessage } from "../models/message.ts";
import type { Handler, IMessageHandler } from "./handler.ts";

export class HandlersRegistry implements IMessageHandler {
  private readonly handlers = new Map<MessageType, Handler>();

  public registerHandler(
    messageType: MessageType,
    handler: Handler
  ): HandlersRegistry {
    if (this.handlers.has(messageType)) {
      console.warn(`handler for type ${messageType} already registered`);
      return this;
    }
    this.handlers.set(messageType, handler);
    return this;
  }

  public handle(client: Client | undefined, message: IMessage): boolean {
    const { type } = message;
    const handler = this.handlers.get(type);
    if (!handler) {
      return false;
    }
    return handler(client, message);
  }
}
