import "../override.css";
import { Peer, type PeerOptions, type MediaConnection } from "peerjs";
import {
  ApiClient,
  arrayDiff,
  asyncInit,
  getCurrentRoomName,
  iteratorFind,
  query as q,
  TemplateElement,
} from "../common.ts";
import { initSidebar } from "../sidebar.ts";

function isSharingScreen() {
  const shareScreenToggle = q<HTMLInputElement>("#room-share-screen");
  return shareScreenToggle.checked;
}

function playJoinSound() {
  const snd = new Audio("/sfx/tuturu.mp3");
  snd.play();
}

function playLeaveSound() {
  const snd = new Audio("/sfx/nyaa.mp3");
  snd.play();
}

function playErrorSound() {
  const snd = new Audio("/sfx/puk.mp3");
  snd.play();
}

class ErrorContainer {
  private errorElement = q("#room-error");
  private errorMessageElement = q("#room-error-message");
  private errorMessageDetails = q("#room-error-details");

  public set(message: string, type: string | null | undefined = undefined) {
    this.errorMessageElement.textContent = message;
    if (type) {
      this.errorMessageDetails.textContent = type;
    } else {
      this.errorMessageDetails.textContent = "";
    }
    if (!this.errorElement.classList.contains("visible")) {
      this.errorElement.classList.add("visible");
    }
  }

  public setError(err: unknown) {
    playErrorSound();
    // peer error
    if (
      err instanceof Error &&
      typeof err == "object" &&
      err.hasOwnProperty("type")
    ) {
      const { type } = err as { type: string } & Error;
      if (type == "unavailable-id") {
        return this.set(
          "Вы уже подключились к разговору из этой учётной записи. Выйдите из него и попробуйте снова"
        );
      } else {
        return this.set(err.message, type);
      }
    }

    if (err instanceof Error) {
      return this.set(err.toString());
    } else {
      return this.set(JSON.stringify(err));
    }
  }
}
const errorContainer = new ErrorContainer();

interface IClient {
  delete: () => void;
}

class RemoteClient implements IClient {
  public readonly id: string;
  private element: HTMLElement;
  public audio: HTMLAudioElement;
  public video: HTMLVideoElement;
  private connection: MediaConnection | null = null;
  private volume: HTMLInputElement;

  constructor(
    peer: Peer,
    id: string,
    localStream: MediaStream,
    element: HTMLElement
  ) {
    this.id = id;
    this.element = element;
    this.audio = this.element.querySelector(".traktor-room-remote-stream")!;
    this.video = this.element.querySelector(
      ".traktor-room-remote-stream-video"
    )!;

    this.volume = this.element.querySelector(".traktor-room-member-volume")!;
    this.volume.oninput = () => {
      this.audio.volume = +this.volume.value;
      this.video.volume = +this.volume.value;
    };

    setTimeout(() => this.call(peer, id, localStream), 300);
  }

  public delete() {
    this.connection?.close();
    this.element.remove();
    playLeaveSound();
  }

  private call(peer: Peer, id: string, localStream: MediaStream) {
    console.log(`sending local stream to ${id}`);
    this.connection = peer.call(id, localStream, {
      sdpTransform: (sdp: string) => {
        console.log("sdpTransform:", sdp);
        return sdp.replace(
          "useinbandfec=1",
          "useinbandfec=1;maxaveragebitrate=510000"
        );
      },
    });
    this.connection.on("error", (err) => {
      errorContainer.setError(err);
    });
    this.connection.on("close", () => {
      console.log("connection to peer closed");
      const nameEl = this.element.querySelector(".card-title")!;
      nameEl.textContent += " (CLOSED)";
    });
  }
}

class SelfClient implements IClient {
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    this.element.classList.add("d-none");
  }

  public delete() {
    this.element.remove();
  }
}

function putSelfFirstSorting(selfId: string) {
  return function (a: string, b: string) {
    if (a == selfId) {
      return -1000;
    }
    if (b == selfId) {
      return +1000;
    }
    return 0;
  };
}

class ClientRender {
  private template = new TemplateElement("#traktor-room-card-template");
  private clientMap: Map<string, IClient> = new Map<string, IClient>();
  private selfId: string;
  private localStream: MediaStream;

  constructor(selfId: string, localStream: MediaStream) {
    this.selfId = selfId;
    this.localStream = localStream;
  }

  public refresh(peer: Peer, clientIds: string[]) {
    const { deleted, added } = arrayDiff([...this.clientMap.keys()], clientIds);
    added.sort(putSelfFirstSorting(this.selfId));
    for (const id of deleted) {
      this.clientMap.get(id)!.delete();
      this.clientMap.delete(id);
    }
    for (const id of added) {
      this.clientMap.set(id, this.instantiateClient(peer, id));
    }
  }

  public get selfClient(): SelfClient {
    return iteratorFind(
      this.clientMap.values(),
      (x) => x instanceof SelfClient
    )! as SelfClient;
  }

  public getRemoteClientById(id: string): RemoteClient | null {
    return iteratorFind(
      this.clientMap.values(),
      (x) => x instanceof RemoteClient && x.id == id
    ) as RemoteClient | null;
  }

  private instantiateClient(peer: Peer, id: string): IClient {
    const element = this.template.instantiate((element) => {
      const nameEl = element.querySelector(".card-title")!;
      nameEl.textContent = id;
    });
    if (id == this.selfId) {
      return new SelfClient(element);
    } else {
      return new RemoteClient(peer, id, this.localStream, element);
    }
  }
}

async function initPeer(roomName: string) {
  try {
    let localStream: MediaStream;

    if (isSharingScreen()) {
      localStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          noiseSuppression: false,
          autoGainControl: false,
          echoCancellation: false,
          channelCount: 2,
          suppressLocalAudioPlayback: true,
        },
        systemAudio: "include",
      } as any);
      if (localStream.getAudioTracks().length == 0) {
        console.error("capture system audio failed!");
      }
    } else {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          autoGainControl: false,
          echoCancellation: true,
          // noiseSuppression: false,
          // autoGainControl: false,
          // echoCancellation: false,
          channelCount: 1,
        },
      });
    }

    const userInfo = await ApiClient.getUserInfo();
    const clientRender = new ClientRender(userInfo.login, localStream);

    const opts: PeerOptions = {
      host: process.env.__HOST__,
      port: 443,
      debug: 1, // log level
      secure: true,
      key: roomName!,
      config: {
        iceServers: [
          {
            urls: `turn:${process.env.__TURN_URL__}`,
            username: process.env.__TURN_USERNAME__,
            credential: process.env.__TURN_PASSWORD__,
          },
        ],
        sdpSemantics: "unified-plan",
      },
    };

    const url = new URL(location.href);
    const isDeployed = url.protocol == "https:";
    if (!isDeployed) {
      opts.host = url.hostname;
      opts.port = +url.port;
      opts.secure = false;
      opts.debug = 1;
    }
    const peer = new Peer(userInfo.login, opts);

    type SocketMessage = { type: string };
    type ClientsChangedMessage = SocketMessage & { ids: string[] };

    peer.socket.on("message", (message: SocketMessage) => {
      if (message.type == "TRAKTOR_CLIENTS_CHANGED") {
        const clientsChanged = message as ClientsChangedMessage;
        console.log("clients changed", clientsChanged.ids);
        clientRender.refresh(peer, clientsChanged.ids);
      }
    });

    peer.on("error", (err) => {
      console.error("peer error:", err);
      errorContainer.setError(err);
    });

    // don't accept incoming audio from other clients when sharing screen
    if (!isSharingScreen()) {
      peer.on("call", (call: MediaConnection) => {
        call.answer(localStream);
        call.on("stream", (stream) => {
          const client = clientRender.getRemoteClientById(call.peer);
          if (!client) {
            return console.error("no client found by id:", call.connectionId);
          }
          if (stream.getVideoTracks().length > 0) {
            console.log(`call: ${call.peer} is sharing video`);
            client.audio.remove();
            client.video.srcObject = stream;
            client.video.autoplay = true;
            client.video.volume = 1;
            client.video.muted = false;
          } else {
            console.log(`call: ${call.peer} is sharing audio`);
            client.video.remove();
            client.audio.srcObject = stream;
            client.audio.autoplay = true;
            client.audio.volume = 1;
            client.audio.muted = false;
          }
          playJoinSound();
        });
        call.on("close", () => {
          console.log("call close");
        });
      });
    }
  } catch (err) {
    console.error("init error:", err);
    errorContainer.setError(err);
  }
}

asyncInit(async () => {
  initSidebar();

  const roomName = getCurrentRoomName();
  if (!roomName) {
    errorContainer.set("Нету комнаты");
    return;
  }

  const roomNameElement = q<HTMLElement>("#room-name");
  roomNameElement.textContent = roomName;

  const rooms = await ApiClient.getRooms(false);
  if (rooms.find((x) => x.name == roomName) == null) {
    errorContainer.set(
      "Таких комнат не бывает. Попробуйте другую, эту найти не вышло"
    );
    return;
  }

  const roomEnterMessage = q<HTMLElement>("#room-enter-message");
  const roomEnterButton = q<HTMLButtonElement>("#room-enter-button");
  roomEnterButton.onclick = (ev) => {
    ev.preventDefault();
    roomEnterButton.disabled = true;
    initPeer(roomName);
    roomEnterMessage.classList.add("hidden");
  };
});
