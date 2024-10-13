import "../override.css";
import {
  ApiClient,
  asyncInit,
  Loader,
  LoaderButton,
  query as q,
  waitAnimationTick,
  type UserInfo,
} from "../common.ts";
import { initSidebar } from "../sidebar.ts";
import type { CreateUserInfo } from "../../../server/api/models.ts";

class UsersTable {
  private rowTemplate: HTMLTemplateElement = q("#user-row"); // TODO: use TemplateElement
  private tbody: HTMLElement = this.rowTemplate.parentElement!;
  private loader = new Loader("user-table");

  public async init() {
    await this.clean();
    await this.loader.wrapAction(async () => {
      const users = await ApiClient.getUsers();
      for (const user of users) {
        this.addRow(user);
      }
    });
  }

  private addRow(user: UserInfo) {
    const instance = this.rowTemplate.content.cloneNode(true);
    const [login, canCreateUsers, canCreateRooms, actions] = (
      instance as HTMLElement
    ).querySelectorAll("td");

    login.textContent = user.login;
    canCreateUsers.textContent = user.canCreateUsers ? "✅" : "❌";
    canCreateRooms.textContent = user.canCreateRooms ? "✅" : "❌";

    const actionsButton = actions.querySelector("button")!;
    actionsButton.onclick = (ev) => {
      ev.preventDefault();
      this.loader.wrapAction(async () => {
        try {
          await ApiClient.deleteUser(user.login);
        } finally {
          await this.init();
        }
      });
    };

    this.tbody.appendChild(instance);
  }

  private async clean(): Promise<void> {
    for (const node of this.tbody.childNodes) {
      if (node.nodeType == Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName != "TEMPLATE") {
          el.remove();
        }
      }
    }
    await waitAnimationTick();
  }
}

class AddUserForm {
  private login: HTMLInputElement = q("#add-user-login");
  private passowrd: HTMLInputElement = q("#add-user-password");
  private canCreateRooms: HTMLInputElement = q("#add-user-can-create-rooms");
  private canCreateUsers: HTMLInputElement = q("#add-user-can-create-users");

  public init(usersTable: UsersTable) {
    const addUserButton = new LoaderButton("add-user");
    addUserButton.onClick = async () => {
      const userData = await ApiClient.createUser(this.serializeForm());
      console.log("userData:", userData);
      usersTable.init();
    };
  }

  private serializeForm(): CreateUserInfo {
    return {
      login: this.login.value,
      password: this.passowrd.value,
      canCreateRooms: this.canCreateRooms.checked,
      canCreateUsers: this.canCreateUsers.checked,
    };
  }
}

asyncInit(async () => {
  initSidebar();

  const usersTable = new UsersTable();
  usersTable.init();

  const addUserForm = new AddUserForm();
  addUserForm.init(usersTable);
});
