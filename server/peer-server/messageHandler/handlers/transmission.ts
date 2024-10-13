import { MessageType } from "../../enums.ts";
import type { IRealm } from "../../models/realm.ts";
import type { Handler } from "../handler.ts";

export const makeTransmissionHandler = (realm: IRealm): Handler => {
  const handle: Handler = (client, message) => {
    const type = message.type;
    const srcId = message.src;
    const dstId = message.dst;
    const destinationClient = realm.getClientById(dstId);

    if (destinationClient) {
      // User is connected!
      const socket = destinationClient.getSocket();

      try {
        if (socket) {
          const data = JSON.stringify(message);
          socket.send(data);
        } else {
          // Neither socket no res available. Peer dead?
          throw new Error("Peer dead");
        }
      } catch {
        // This happens when a peer disconnects without closing connections and
        // the associated WebSocket has not closed.
        // Tell other side to stop trying.
        if (socket) {
          socket.close();
        } else {
          realm.removeClientById(destinationClient.getId());
        }

        handle(client, {
          type: MessageType.LEAVE,
          src: dstId,
          dst: srcId,
        });
      }
    } else {
      // Wait for this client to connect/reconnect (XHR) for important messages.
      const ignoredTypes = [MessageType.LEAVE, MessageType.EXPIRE];

      if (!ignoredTypes.includes(type) && dstId) {
        realm.addMessageToQueue(dstId, message);
      } else if (type === MessageType.LEAVE && !dstId) {
        realm.removeClientById(srcId);
      } else {
        // Unavailable destination specified with message LEAVE or EXPIRE
        // Ignore
      }
    }

    return true;
  };

  return handle;
};
