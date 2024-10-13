const commonHashParams = {
  name: "PBKDF2",
  hash: "SHA-256",
  iterations: 600000, // In 2023, OWASP recommended to use 600,000 iterations for PBKDF2-HMAC-SHA256
};

export interface PasswordHash {
  key: Array<number>;
  salt: Array<number>;
}

const MAX_PASSOWRD_LENGTH = 64;

export async function hashPassword(password: string): Promise<PasswordHash> {
  if (password.length > MAX_PASSOWRD_LENGTH) {
    throw new Error("password is too long");
  }
  const pwUtf8 = new TextEncoder().encode(password);
  const pwKey = await crypto.subtle.importKey(
    "raw",
    pwUtf8,
    commonHashParams.name,
    false,
    ["deriveBits"]
  );
  const saltUint8 = crypto.getRandomValues(new Uint8Array(16));
  const keyBuffer = await crypto.subtle.deriveBits(
    {
      ...commonHashParams,
      salt: saltUint8,
    },
    pwKey,
    256
  );
  const key = Array.from(new Uint8Array(keyBuffer));
  const salt = Array.from(new Uint8Array(saltUint8));
  return { key, salt };
}

function compare<T>(a: Array<T>, b: Array<T>) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export async function hashPasswordVerify(
  hash: PasswordHash,
  password: string
): Promise<boolean> {
  if (password.length > MAX_PASSOWRD_LENGTH) {
    throw new Error("password is too long");
  }
  const pwUtf8 = new TextEncoder().encode(password);
  const pwKey = await crypto.subtle.importKey(
    "raw",
    pwUtf8,
    commonHashParams.name,
    false,
    ["deriveBits"]
  );
  const salt = new Uint8Array(hash.salt);
  const keyBuffer = await crypto.subtle.deriveBits(
    {
      ...commonHashParams,
      salt: salt,
    },
    pwKey,
    256
  );
  return compare(Array.from(new Uint8Array(keyBuffer)), hash.key);
}
