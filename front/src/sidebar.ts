import type { RoomInfo } from "../../server/api/models.ts";
import {
  ApiClient,
  arrayDiff,
  getCurrentRoomName,
  Navigation,
  query as q,
  TemplateElement,
} from "./common.ts";

export async function initSidebar() {
  const sidebarLogin: HTMLElement = q("#sidebar-login");
  const sidebarManageRooms: HTMLElement = q("#sidebar-manage-rooms");
  const sidebarManageUsers: HTMLElement = q("#sidebar-manage-users");
  const logout: HTMLAnchorElement = q("#sidebar-logout");

  logout.onclick = async (ev) => {
    ev.preventDefault();
    try {
      await ApiClient.logout();
    } finally {
      Navigation.redirectToLogin();
    }
  };

  try {
    const userInfo = await ApiClient.getUserInfo();
    console.log("userInfo:", userInfo);
    sidebarLogin.textContent = userInfo.login;

    if (userInfo.canCreateRooms) {
      sidebarManageRooms.classList.remove("d-none");
    }
    if (userInfo.canCreateUsers) {
      sidebarManageUsers.classList.remove("d-none");
    }
  } catch (err) {
    console.error(err);
    Navigation.redirectToLogin(); // TODO: don't redirect, show modal
  }

  await refreshRooms();

  setInterval(async () => {
    try {
      await refreshRooms();
    } catch (err) {
      console.error(err);
    }
  }, 5000);
}

class RoomRender {
  private rootElement: HTMLAnchorElement;
  private nameElement: HTMLElement;
  private counterElement: HTMLElement;
  private initialized: boolean = false;
  private lastCount: number = -1;

  constructor(rootElement: HTMLAnchorElement) {
    this.rootElement = rootElement;
    this.nameElement = rootElement.querySelector(".traktor-room-name")!;
    this.counterElement = rootElement.querySelector(".traktor-room-counter")!;
  }

  update(room: RoomInfo) {
    if (!this.initialized) {
      const currentRoomName = getCurrentRoomName();
      this.rootElement.href = Navigation.roomLink(room.name);
      if (currentRoomName == room.name) {
        this.rootElement.classList.add("active");
      }
      this.nameElement.textContent = room.name;
      this.initialized = true;
    }

    if (room.count != this.lastCount) {
      if (room.count) {
        this.counterElement.classList.remove("d-none");
        this.counterElement.textContent = room.count.toString();
      } else {
        if (!this.counterElement.classList.contains("d-none")) {
          this.counterElement.classList.add("d-none");
        }
      }
      this.lastCount = room.count;
    }
  }

  delete() {
    this.rootElement.remove();
  }
}

const roomLinkTemplate = new TemplateElement<HTMLAnchorElement>("#room-link");
const roomsState = new Map<string, RoomRender>();

async function refreshRooms() {
  const rooms = await ApiClient.getRooms();

  const { added, deleted } = arrayDiff(
    [...roomsState.keys()],
    rooms.map((x) => x.name)
  );

  for (const roomName of added) {
    roomsState.set(roomName, new RoomRender(roomLinkTemplate.instantiate()));
  }
  for (const roomName of deleted) {
    roomsState.get(roomName)?.delete();
    roomsState.delete(roomName);
  }
  for (const room of rooms) {
    roomsState.get(room.name)!.update(room);
  }
}
