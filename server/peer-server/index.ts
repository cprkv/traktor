import type { IConfig } from "./config.ts";
import defaultConfig from "./config.ts";
import { PeerInstance } from "./instance.ts";
import type { Client } from "./models/client.ts";
import type { IMessage } from "./models/message.ts";

function PeerServer(options: Partial<IConfig> = {}): PeerInstance {
  const config: IConfig = {
    ...defaultConfig,
    ...options,
  };
  return new PeerInstance(config);
}

export { PeerServer };
export type { MessageType } from "./enums.ts";
export type { IConfig, PeerInstance, Client, IMessage };
