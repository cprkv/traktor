# Traktor

💾 Small 💻 self-hosted 🎧 VoIP 🌎 web service for 💹 high-quality 📣 voice 📞 calls. Built on top of slightly modified [peerjs](https://peerjs.com/).

![Screenshot](docs/screenshot.png)

## Prerequisites

- deno 2.0.2
- powershell

## Development setup

- setup `front/config.json` with respective contents:
  ```json
  {
    "turn": {
      "url": "TURN_DOMAIN:3478",
      "username": "TURN_USERNAME",
      "password": "TURN_PASSWORD"
    },
    "host": "TRAKTOR_APP_DOMAIN"
  }
  ```
  This file will be used in dev and deploy environments. I made [small guide](docs/turn.md) how I configure my server with coturn.
- server:
  ```powershell
  cd server
  deno run dev
  ```
- front:
  ```powershell
  cd front
  deno run dev
  ```

## Management

For the first time you need to add user with admin rights from local terminal (before deploy):

```powershell
cd server
deno -A cli-add-user.ts
```

After that database will be initialized. On deploy all users will be copied with database. To create more users you can use management page (`http://TRAKTOR_APP_DOMAIN/pages/users.html`)

After adding users, you should create rooms where any user could connect. Do that in manage rooms page (`http://TRAKTOR_APP_DOMAIN/pages/rooms.html`)

## Deploy

> This project is not driven by Docker and deploy is done by simple deno script which uses SSH. I'm sure your setup differs from this a lot, so feel free to adopt [`deploy/index.ts`](deploy/index.ts) for your needs, or make Dockerfile for the project. Below I describe how I run this scripts. Note: my server is using ssh key authentication.

- On server create service file: [`/etc/systemd/system/traktor.service`](docs/traktor.service)
- On server setup nginx: [`vim /etc/nginx/conf.d/TRAKTOR_APP_DOMAIN.conf`](docs/traktor_nginx.conf)
- On server create `/home/traktor/traktor/.env` file:
  ```
  HOST="127.0.0.1"
  PORT=8888
  PUBLIC_DIR="./dist"
  DB_DIR="."
  STORE_JWT=false
  ```
- Locally, create `deploy/.env` file:
  ```bash
  HOST="SERVER_ADDR"
  USER="user"
  PASSWORD="password"
  PRIVKEY="C:/ssh/private_key"
  ```
- Locally, run deploy:
  ```powershell
  ./build.ps1
  cd deploy
  deno -A index.ts
  ```
