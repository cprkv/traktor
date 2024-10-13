import { configure, getConsoleSink, getLogger } from "@logtape/logtape";

await configure({
  sinks: { console: getConsoleSink() },
  loggers: [
    { category: "http", level: "warning", sinks: ["console"] },
    { category: "db", level: "warning", sinks: ["console"] },
    { category: "peerjs", level: "warning", sinks: ["console"] },
    { category: "logtape", sinks: ["console"], level: "error" },
  ],
});

export const httpLog = getLogger("http");
export const dbLog = getLogger("db");
export const peerjsLog = getLogger("peerjs");
