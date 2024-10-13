import { Context } from "oak";

export interface IConfig {
  readonly expireTimeout: number;
  readonly aliveTimeout: number;
  readonly concurrentLimit: number;
  readonly cleanupOutMsgs: number;
  readonly authHandler: (ctx: Context) => Promise<void>;
}

const defaultConfig: IConfig = {
  expireTimeout: 5000,
  aliveTimeout: 90000,
  concurrentLimit: 5000,
  cleanupOutMsgs: 1000,
  authHandler: () => Promise.resolve(),
};

export default defaultConfig;
