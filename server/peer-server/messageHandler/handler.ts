import type { Client } from "../models/client.ts";
import type { IMessage } from "../models/message.ts";

export type Handler = (
  client: Client | undefined,
  message: IMessage
) => boolean;

export interface IMessageHandler {
  handle: Handler;
}
