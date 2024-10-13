import type { Handler } from "../handler.ts";

export const HeartbeatHandler: Handler = (client): boolean => {
  if (client) {
    const nowTime = new Date().getTime();
    client.setLastPing(nowTime);
  }
  return true;
};
