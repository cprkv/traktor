declare global {
  const process: {
    env: {
      __TURN_URL__: string;
      __TURN_USERNAME__: string;
      __TURN_PASSWORD__: string;
      __HOST__: string;
    };
  };
}
export {};
