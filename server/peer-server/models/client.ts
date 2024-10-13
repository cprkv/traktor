export class Client {
  private readonly id: string;
  private readonly token: string;
  private socket: WebSocket | null = null;
  private lastPing: number = new Date().getTime();
  public readonly room: string;

  constructor(id: string, token: string, room: string) {
    this.id = id;
    this.token = token;
    this.room = room;
  }

  public getId(): string {
    return this.id;
  }

  public getToken(): string {
    return this.token;
  }

  public getSocket(): WebSocket | null {
    return this.socket;
  }

  public setSocket(socket: WebSocket | null): void {
    this.socket = socket;
  }

  public getLastPing(): number {
    return this.lastPing;
  }

  public setLastPing(lastPing: number): void {
    this.lastPing = lastPing;
  }

  public send<T>(data: T): void {
    this.socket?.send(JSON.stringify(data));
  }
}
