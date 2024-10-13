import { MessageType } from "../enums.ts";
import type { IConfig } from "../config.ts";
import type { IMessageHandler } from "../messageHandler/handler.ts";
import type { IRealm } from "../models/realm.ts";

export class MessagesExpire {
  private readonly realm: IRealm;
  private readonly config: IConfig;
  private readonly messageHandler: IMessageHandler;
  private timeoutId: number | null = null;

  constructor(realm: IRealm, config: IConfig, messageHandler: IMessageHandler) {
    this.realm = realm;
    this.config = config;
    this.messageHandler = messageHandler;
  }

  public startMessagesExpiration(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Clean up outstanding messages
    this.timeoutId = setTimeout(() => {
      this.pruneOutstanding();
      this.timeoutId = null;
      this.startMessagesExpiration();
    }, this.config.cleanupOutMsgs);
  }

  public stopMessagesExpiration(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private pruneOutstanding(): void {
    const destinationClientsIds = this.realm.getClientsIdsWithQueue();
    const now = new Date().getTime();
    const maxDiff = this.config.expireTimeout;
    const seen: Record<string, boolean> = {};

    for (const destinationClientId of destinationClientsIds) {
      const messageQueue = this.realm.getMessageQueueById(destinationClientId);
      if (!messageQueue) {
        continue;
      }

      const lastReadDiff = now - messageQueue.getLastReadAt();
      if (lastReadDiff < maxDiff) {
        continue;
      }

      const messages = messageQueue.getMessages();

      for (const message of messages) {
        const seenKey = `${message.src}_${message.dst}`;

        if (!seen[seenKey]) {
          this.messageHandler.handle(undefined, {
            type: MessageType.EXPIRE,
            src: message.dst,
            dst: message.src,
          });

          seen[seenKey] = true;
        }
      }

      this.realm.clearMessageQueue(destinationClientId);
    }
  }
}
