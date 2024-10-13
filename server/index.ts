import { DB } from "./db.ts";
import { Authentication } from "./api/auth.ts";
import { makeApiRoutes, type RoomCounter } from "./api/server.ts";
import { PeerServer } from "./peer-server/index.ts";
import { peerjsLog } from "./log.ts";
import { Application, Router } from "oak";
import { errorMiddleware, logMiddleware, serveStatic } from "./middlewares.ts";
import { DB_DIR, HOST, PORT, PUBLIC_DIR } from "./env.ts";

const db = new DB(DB_DIR);

// TODO: This is fucked up. inconsistend, not updatable in real time and awefull written.
//       Fix it with socket events.
const roomCounter = new Map<string, number>();

class RoomCounterImpl implements RoomCounter {
  getRoomCount(roomName: string): number {
    return roomCounter.get(roomName) || 0;
  }
}

const apiRouter = makeApiRoutes(db, new RoomCounterImpl());

// TODO: This somewhat works, but it is not good for dev server.
//       Dev server expects upgrade to be done either way.
//       So this should be fixed as:
//         accept ws connection
//         if auth failed:
//           close ws connection with error
//           (no http answer!)
const peerServer = PeerServer({
  authHandler: async (ctx) => {
    await new Authentication(ctx, db).getAuthenticatedUser();
  },
});

function onClientsChanged(room: string) {
  const roomClients = peerServer.realm
    .getClients()
    .filter((x) => x.room == room);

  const roomClientIds = roomClients.map((x) => x.getId());
  peerjsLog.debug`room ${room}  client ids: ${roomClientIds}`;
  roomCounter.set(room, roomClientIds.length);

  for (const client of roomClients) {
    client.send({
      type: "TRAKTOR_CLIENTS_CHANGED",
      ids: roomClientIds,
    });
  }
}

peerServer.on("connection", (client) => {
  peerjsLog.debug`client connected: ${client.getId()} (room: ${client.room})`;
  onClientsChanged(client.room);
});
peerServer.on("disconnect", (client) => {
  peerjsLog.debug`client disconnected: ${client.getId()} (room: ${
    client.room
  })`;
  onClientsChanged(client.room);
});
peerServer.on("error", (err) => {
  peerjsLog.error`error happend: ${err.message}`;
});
const peerRouter = peerServer.start();

const commonRouter = new Router();
commonRouter.get("/", (ctx) => {
  ctx.response.redirect("/pages/main.html");
});
commonRouter.use("/api", apiRouter.routes(), apiRouter.allowedMethods());
commonRouter.use("/peerjs", peerRouter.routes(), peerRouter.allowedMethods());

const app = new Application();
app.use(logMiddleware);
app.use(errorMiddleware);
app.use(await serveStatic(PUBLIC_DIR));
app.use(commonRouter.routes());
app.use(commonRouter.allowedMethods());

app.listen({ port: PORT, hostname: HOST });
console.log(`server is listening on http://${HOST}:${PORT}/`);
