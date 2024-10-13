import { load } from "@std/dotenv";

await load({
  envPath: ".env",
  export: true,
});
await load({
  envPath: ".env.user",
  export: true,
});
await load({
  envPath: ".env.prod",
  export: true,
});

export const HOST = getString("HOST");
export const PORT = getNumber("PORT");
export const PUBLIC_DIR = getString("PUBLIC_DIR");
export const DB_DIR = getString("DB_DIR");
export const STORE_JWT = getBoolean("STORE_JWT");

console.log("HOST:", HOST);
console.log("PORT:", PORT);
console.log("PUBLIC_DIR:", PUBLIC_DIR);
console.log("DB_DIR:", DB_DIR);
console.log("STORE_JWT:", STORE_JWT);

function getString(name: string): string {
  const r = Deno.env.get(name);
  if (!r) {
    throw new Error(`env variable is not set: ${name}`);
  }
  return r;
}

function getNumber(name: string): number {
  return +getString(name);
}

function getBoolean(name: string): boolean {
  const v = getString(name);
  if (v == "true") {
    return true;
  } else if (v == "false") {
    return false;
  }
  throw new Error(`unknown value for env variable ${name}: ${v}`);
}
