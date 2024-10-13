// deno run -A ./cli-add-user.ts

import { hashPassword } from "./api/hash-passowrd.ts";
import { DB } from "./db.ts";
import { DB_DIR } from "./env.ts";

const db = new DB(DB_DIR);

try {
  const login = prompt("login:")!;
  const password = prompt("password:")!;
  const hash = await hashPassword(password);
  console.log(hash);
  db.users.add(login, {
    login,
    hash,
    canCreateRooms: true,
    canCreateUsers: true,
  });
} finally {
  db.close();
}
