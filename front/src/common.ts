import {
  UserInfo,
  type CreateRoomInfo,
  type CreateUserInfo,
  type RoomInfo,
} from "../../server/api/models.ts";
export type { UserInfo };

export function asyncInit(func: () => Promise<void>) {
  console.log("init started");
  func()
    .then(() => {
      console.log("init done");
    })
    .catch((err) => {
      console.log("init done with error:", err);
      throw err;
    });
}

export function getCurrentRoomName(): string | null {
  const url = new URL(location.href);
  return url.searchParams.get("name");
}

export function waitAnimationTick(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function waitInfinite(): Promise<void> {
  return new Promise(() => {});
}

export function waitSeconds(seconds: number): Promise<void> {
  return waitMilliseconds(seconds * 1000);
}

export function waitMilliseconds(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function query<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`element by selector "${selector}" not found`);
  return el;
}

export function fomatDate(date: Date): string {
  function pad(num: number) {
    const str = num.toString();
    if (str.length < 2) return "0" + str;
    return str;
  }
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}.${MM}.${dd} ${hh}:${mm}`;
}

export class Navigation {
  public static login = "/pages/login.html";
  public static main = "/pages/main.html";

  public static redirectToLogin() {
    location.href = this.login;
  }

  public static redirectToMain() {
    location.href = this.main;
  }

  public static roomLink(name: string) {
    return `/pages/room.html?name=${encodeURIComponent(name)}`;
  }
}

export interface ArrayModifications {
  added: string[];
  deleted: string[];
}

export function arrayDiff(
  initialArray: string[],
  modifiedArray: string[]
): ArrayModifications {
  const deleted = initialArray.filter((x) => !modifiedArray.includes(x));
  const added = modifiedArray.filter((x) => !initialArray.includes(x));
  return { added, deleted };
}

export enum ErrorType {
  JSON_EXPECTED = "JSON_EXPECTED",
  UNKNOWN = "UNKNOWN",
}

class Cached<T> {
  private _value: T | null = null;
  private _func: () => Promise<T>;

  constructor(func: () => Promise<T>) {
    this._func = func;
  }

  public get value(): Promise<T> {
    if (this._value) {
      return Promise.resolve(this._value);
    }
    return this._func().then((x) => (this._value = x));
  }

  public resetCache() {
    this._value = null;
  }
}

export class ApiClient {
  private static userInfoCached = new Cached(() =>
    fetch(`/api/userInfo`)
      .then(checkResponseError)
      .then(responseAsJson<UserInfo>)
  );

  private static roomsCached = new Cached(() =>
    fetch(`/api/rooms`)
      .then(checkResponseError)
      .then(responseAsJson<RoomInfo[]>)
  );

  static getUserInfo(): Promise<UserInfo> {
    return this.userInfoCached.value;
  }

  static auth(login: string, password: string): Promise<UserInfo> {
    return fetch(`/api/auth`, {
      method: "POST",
      body: JSON.stringify({ login, password }),
      headers: { "Content-Type": "application/json" },
    })
      .then(checkResponseError)
      .then(responseAsJson<UserInfo>);
  }

  static async logout(): Promise<void> {
    await fetch(`/api/auth`, { method: "DELETE" }).then(checkResponseError);
  }

  static getUsers(): Promise<UserInfo[]> {
    return fetch(`/api/users`)
      .then(checkResponseError)
      .then(responseAsJson<UserInfo[]>);
  }

  static createUser(userInfo: CreateUserInfo): Promise<void> {
    return fetch(`/api/users`, {
      method: "POST",
      body: JSON.stringify(userInfo),
      headers: { "Content-Type": "application/json" },
    })
      .then(checkResponseError)
      .then(responseAsJson<void>);
  }

  static deleteUser(login: string): Promise<void> {
    return fetch(`/api/users/${login}`, { method: "DELETE" })
      .then(checkResponseError)
      .then(responseAsJson<void>);
  }

  static getRooms(ignoreCache: boolean = true): Promise<RoomInfo[]> {
    if (ignoreCache) {
      this.roomsCached.resetCache();
    }
    return this.roomsCached.value;
  }

  static createRoom(userInfo: CreateRoomInfo): Promise<void> {
    return fetch(`/api/rooms`, {
      method: "POST",
      body: JSON.stringify(userInfo),
      headers: { "Content-Type": "application/json" },
    })
      .then(checkResponseError)
      .then(responseAsJson<void>);
  }

  static deleteRoom(name: string): Promise<void> {
    return fetch(`/api/rooms/${name}`, { method: "DELETE" })
      .then(checkResponseError)
      .then(responseAsJson<void>);
  }
}

async function checkResponseError(response: Response): Promise<Response> {
  if (!response.ok) {
    try {
      const reason = await response.json();
      if (
        reason &&
        typeof reason == "object" &&
        reason.hasOwnProperty("message")
      ) {
        return Promise.reject(reason.message);
      }
      return Promise.reject(JSON.stringify(reason));
    } catch (err) {
      console.error("error retrieve text for error:", err);
      Promise.reject(ErrorType.UNKNOWN);
    }
  }
  return Promise.resolve(response);
}

async function responseAsJson<T>(response: Response) {
  try {
    const json = await response.json();
    return json as T;
  } catch (err) {
    console.error(err);
    return Promise.reject(ErrorType.JSON_EXPECTED);
  }
}

/**
 * @example
 *   <div class="mb-3">
 *     <load src="/pages/components/loader.html" prefix="user-table" />
 *   </div>
 * @example
 *   const loader = new Loader("user-table");
 *   await loader.begin();
 *   await waitSeconds(1);
 *   await loader.endWithError("amogus");
 *   await waitSeconds(1);
 *   await loader.end();
 */
export class Loader {
  private loader: HTMLElement;
  private error: HTMLElement;
  private errorReason: HTMLElement;

  constructor(prefix: string) {
    this.loader = query(`#${prefix}-loader`);
    this.error = query(`#${prefix}-error`);
    this.errorReason = this.error.querySelector("span")!;
  }

  public async wrapAction(action: () => Promise<void>) {
    await this.begin();
    try {
      await action();
      await this.end();
    } catch (err) {
      await this.endWithError(err + "");
    }
  }

  public begin(): Promise<void> {
    this.loader.classList.add("visible");
    this.error.classList.remove("visible");
    return waitAnimationTick();
  }

  public endWithError(error: string): Promise<void> {
    this.loader.classList.remove("visible");
    this.error.classList.add("visible");
    this.errorReason.textContent = error;
    return waitAnimationTick();
  }

  public end(): Promise<void> {
    this.loader.classList.remove("visible");
    this.error.classList.remove("visible");
    return waitAnimationTick();
  }
}

/**
 * @example
 *  <load
 *    src="/pages/components/loader-button.html"
 *    prefix="login"
 *    text="Login"
 *    btn-class="btn-lg"   // optional
 *  />
 * @example
 *  const button = new LoaderButton("add-user");
 *  button.onClick = async () => {
 *    alert("action!");
 *    return Promise.reject("Unknown Error");  // will be printed as error
 *  };
 */
export class LoaderButton extends Loader {
  private button: HTMLButtonElement;
  private success: HTMLElement;

  constructor(prefix: string) {
    super(prefix);
    this.button = query(`#${prefix}-button`);
    this.success = query(`#${prefix}-success`);
  }

  public set onClick(action: () => Promise<void>) {
    this.button.onclick = async (ev) => {
      ev.preventDefault();
      await this.begin();
      try {
        await action();
        await this.end();
      } catch (err) {
        await this.endWithError(err + "");
      }
    };
  }

  public override begin(): Promise<void> {
    this.button.disabled = true;
    this.success.classList.remove("visible");
    return super.begin();
  }

  public override endWithError(error: string): Promise<void> {
    this.button.disabled = false;
    return super.endWithError(error);
  }

  public override end(): Promise<void> {
    this.button.disabled = false;
    this.success.classList.add("visible");
    return super.end();
  }
}

export class TemplateElement<T extends HTMLElement = HTMLElement> {
  private template: HTMLTemplateElement;
  private templateParent: HTMLElement;

  constructor(selector: string) {
    this.template = query(selector);
    this.templateParent = this.template.parentElement!;
  }

  public instantiate(action: ((el: T) => void) | null = null): T {
    const instance = this.template.content.cloneNode(true) as DocumentFragment;
    const element = iteratorFind(
      instance.childNodes.values(),
      (x) => x.nodeType == Node.ELEMENT_NODE
    )! as T;

    // console.log("template instance:", element);

    if (!element) {
      throw new Error(`no child node with element type!`);
    }

    // NOTE: setup action, to change data in nodes before dom insert
    if (action) {
      action(element);
    }

    this.templateParent.appendChild(element);
    return element;
  }
}

export function iteratorFind<T>(it: Iterator<T>, predicate: (v: T) => boolean) {
  let cur = it.next();
  while (!cur.done) {
    if (predicate(cur.value)) {
      return cur.value;
    }
    cur = it.next();
  }
  return null;
}
