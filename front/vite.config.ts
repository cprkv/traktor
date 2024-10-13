import { UserConfig, defineConfig } from "vite";
import injectHTML from "vite-plugin-html-inject";

export default defineConfig((): UserConfig => {
  const config = JSON.parse(
    new TextDecoder().decode(Deno.readFileSync("./config.json"))
  );
  return {
    plugins: [injectHTML()],
    build: {
      rollupOptions: {
        input: [
          "pages/main.html",
          "pages/login.html",
          "pages/room.html",
          "pages/rooms.html",
          "pages/users.html",
        ],
      },
    },
    server: {
      open: "pages/main.html",
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8888/",
        },
        "/peerjs": {
          target: "http://127.0.0.1:8888/",
          ws: true,
        },
      },
    },
    define: {
      "process.env.__TURN_URL__": JSON.stringify(config.turn.url),
      "process.env.__TURN_USERNAME__": JSON.stringify(config.turn.username),
      "process.env.__TURN_PASSWORD__": JSON.stringify(config.turn.password),
      "process.env.__HOST__": JSON.stringify(config.host),
    },
  };
});
