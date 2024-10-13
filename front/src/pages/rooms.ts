import "../override.css";
import {
  ApiClient,
  asyncInit,
  Loader,
  LoaderButton,
  query as q,
  waitAnimationTick,
  fomatDate,
  TemplateElement,
} from "../common.ts";
import { initSidebar } from "../sidebar.ts";
import type { CreateRoomInfo, RoomInfo } from "../../../server/api/models.ts";

class RoomsTable {
  private rowTemplate = new TemplateElement("#room-row");
  private loader = new Loader("rooms-table");
  private rows: HTMLElement[] = [];

  public async init() {
    await this.clean();
    await this.loader.wrapAction(async () => {
      const rooms = await ApiClient.getRooms();
      for (const room of rooms) {
        this.addRow(room);
      }
    });
  }

  private addRow(room: RoomInfo) {
    const instance = this.rowTemplate.instantiate((el) => {
      const [name, createdBy, createdAt, actions] = el.querySelectorAll("td");
      name.textContent = room.name;
      createdBy.textContent = room.createdBy;
      createdAt.textContent = fomatDate(new Date(room.createdAt));
      actions.querySelector("button")!.onclick = (ev) => {
        ev.preventDefault();
        this.loader.wrapAction(async () => {
          try {
            await ApiClient.deleteRoom(room.name);
          } finally {
            await this.init();
          }
        });
      };
    });
    this.rows.push(instance);
  }

  private async clean(): Promise<void> {
    for (const el of this.rows) {
      el.remove();
    }
    this.rows = [];
    await waitAnimationTick();
  }
}

class AddRoomsForm {
  private name: HTMLInputElement = q("#add-room-name");

  public init(roomsTable: RoomsTable) {
    const addRoomButton = new LoaderButton("add-room");
    addRoomButton.onClick = async () => {
      await ApiClient.createRoom(this.serializeForm());
      roomsTable.init();
    };
  }

  private serializeForm(): CreateRoomInfo {
    return { name: this.name.value };
  }
}

asyncInit(async () => {
  initSidebar();

  const roomsTable = new RoomsTable();
  roomsTable.init();

  const addRoomsForm = new AddRoomsForm();
  addRoomsForm.init(roomsTable);
});
