import type { IMessageQueue } from "./messageQueue.ts";
import { MessageQueue } from "./messageQueue.ts";
import { randomUUID } from "node:crypto";
import type { Client } from "./client.ts";
import type { IMessage } from "./message.ts";

export interface IRealm {
  getClients(): Client[];
  getClientsIds(): string[];
  getClientById(clientId: string): Client | undefined;
  getClientsIdsWithQueue(): string[];
  addClient(client: Client): void;
  removeClientById(id: string): boolean;
  getMessageQueueById(id: string): IMessageQueue | undefined;
  addMessageToQueue(id: string, message: IMessage): void;
  clearMessageQueue(id: string): void;
  generateClientId(generateClientId?: () => string): string;
}

export class Realm implements IRealm {
  private readonly clients = new Map<string, Client>();
  private readonly messageQueues = new Map<string, IMessageQueue>();

  public getClientsIds(): string[] {
    return [...this.clients.keys()];
  }

  public getClients(): Client[] {
    return [...this.clients.values()];
  }

  public getClientById(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  public getClientsIdsWithQueue(): string[] {
    return [...this.messageQueues.keys()];
  }

  public addClient(client: Client): void {
    this.clients.set(client.getId(), client);
  }

  public removeClientById(id: string): boolean {
    const client = this.getClientById(id);
    if (!client) {
      return false;
    }
    this.clients.delete(id);
    return true;
  }

  public getMessageQueueById(id: string): IMessageQueue | undefined {
    return this.messageQueues.get(id);
  }

  public addMessageToQueue(id: string, message: IMessage): void {
    if (!this.getMessageQueueById(id)) {
      this.messageQueues.set(id, new MessageQueue());
    }
    this.getMessageQueueById(id)?.addMessage(message);
  }

  public clearMessageQueue(id: string): void {
    this.messageQueues.delete(id);
  }

  public generateClientId(generateClientId?: () => string): string {
    const generateId = generateClientId ? generateClientId : randomUUID;
    let clientId = generateId();
    while (this.getClientById(clientId)) {
      clientId = generateId();
    }
    return clientId;
  }
}
