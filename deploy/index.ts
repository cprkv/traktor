import "@std/dotenv/load";
import * as path from "@std/path";
import * as fs from "@std/fs";
import { NodeSSH } from "node-ssh";

function getEnv(name: string): string {
  const r = Deno.env.get(name);
  if (!r) {
    throw new Error(`env variable is not set: ${name}`);
  }
  return r;
}

const HOST = getEnv("HOST");
const USER = getEnv("USER");
const PRIVKEY = getEnv("PRIVKEY");
const PASSWORD = getEnv("PASSWORD");

async function exec(ssh: NodeSSH, cmd: string) {
  console.log("cmd:", cmd.replaceAll(PASSWORD, "***"));
  const { stderr, stdout, code } = await ssh.execCommand(cmd);
  if (stderr && stderr.length) console.error(stderr);
  if (stdout && stdout.length) console.log(stdout);
  if (code != 0) {
    throw new Error(`exit code: ${code}`);
  }
  return stdout;
}

const buildDir = path.join(import.meta.dirname!, "..", "bin");
if (!(await fs.exists(buildDir))) {
  throw new Error(`build not found: ${buildDir}`);
}

const sudo = `echo "${PASSWORD}" | sudo -S -E`;

const ssh = new NodeSSH();
const con = await ssh.connect({
  host: HOST,
  username: USER,
  privateKeyPath: PRIVKEY,
});
console.log("connected!");

// NOTE: this is due to fucked up chunked transfer somewhere in ssh2 or node-ssh.
//       this number should be as big as transfer data.
const chunkSize = 256 * 1024 * 1024;
const transferOptions = {
  chunkSize,
  step: (_total: number, _nb: number, fsize: number): void => {
    if (fsize > chunkSize) {
      throw new Error(`file is too big: ${fsize}. Please increase chunk size`);
    }
  },
};

function validate(p: string): boolean {
  console.log(`uploading file: ${p}`);
  return true;
}

try {
  await exec(ssh, `rm -r /home/k/traktor || true`);
  console.log("uploading files...");
  await con.putDirectory(buildDir, "/home/k/traktor", { transferOptions, validate });
  await exec(ssh, `${sudo} systemctl stop traktor`);
  await exec(ssh, `${sudo} rm -r /home/traktor/traktor/{dist,server} || true`);
  await exec(ssh, `${sudo} rsync -rv --chown=traktor:traktor /home/k/traktor /home/traktor`);
  await exec(ssh, `${sudo} chmod -R 400 /home/traktor/traktor/{dist,.env}`);
  await exec(ssh, `${sudo} chmod 500 /home/traktor/traktor/server`);
  await exec(ssh, `${sudo} chmod 600 /home/traktor/traktor/traktor.db`);
  await exec(ssh, `${sudo} find /home/traktor/traktor -type d -exec chmod u+x {} +`);
  await exec(ssh, `${sudo} systemctl start traktor`);
} finally {
  con.dispose();
}
