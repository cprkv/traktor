import type { UserInfo } from "./models.ts";
import * as fs from "@std/fs";
import * as djwt from "djwt";
import dayjs from "dayjs";
import { STORE_JWT } from "../env.ts";

const devKeyPath = "./jwt.json";

// ---- PARAMS ----
const algorithm: HmacKeyGenParams = {
  name: "HMAC",
  length: 1024,
  hash: { name: "SHA-512" },
};
const extractable = STORE_JWT;
const keyUsages: KeyUsage[] = ["sign", "verify"];
const header: djwt.Header = { alg: "HS512", type: "JWT" };

let jwtKey: CryptoKey | null = null;

if (STORE_JWT && (await fs.exists(devKeyPath))) {
  console.log("dev jwt key already exists, reusing");
  const jsonKeyBuffer = await Deno.readFile(devKeyPath);
  const jsonKeyText = new TextDecoder("utf-8").decode(jsonKeyBuffer);
  const jsonKey = JSON.parse(jsonKeyText);
  jwtKey = await crypto.subtle.importKey(
    "jwk",
    jsonKey,
    algorithm,
    extractable,
    keyUsages
  );
}

if (!jwtKey) {
  jwtKey = await crypto.subtle.generateKey(algorithm, extractable, keyUsages);

  if (STORE_JWT) {
    const jsonKey = await crypto.subtle.exportKey("jwk", jwtKey);
    const jsonKeyText = JSON.stringify(jsonKey);
    const jsonKeyBuffer = new TextEncoder().encode(jsonKeyText);
    await Deno.writeFile(devKeyPath, jsonKeyBuffer);
  }
}

export async function issue(userInfo: UserInfo): Promise<string> {
  const payload: djwt.Payload = {
    ...userInfo,
    exp: djwt.getNumericDate(dayjs().add(1, "day").toDate()),
    iat: djwt.getNumericDate(0),
  };
  return await djwt.create(header, payload, jwtKey);
}

export async function verify(token: string): Promise<UserInfo> {
  const payload = (await djwt.verify(token, jwtKey)) as djwt.Payload & UserInfo;
  return {
    login: payload.login,
    canCreateRooms: payload.canCreateRooms,
    canCreateUsers: payload.canCreateUsers,
  };
}
