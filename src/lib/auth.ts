// JWT-based session: HS256 sign with SUPABASE service-role JWT secret would be ideal,
// lekin biz custom token ishlatamiz. JWT formatida — Supabase RLS qabul qilishi uchun
// `sub` claim foydalanuvchi `app_users.id` (uuid) ga teng bo‘lib, ENCRYPTION_KEY bilan HS256
// imzolanadi. Server cookie sifatida saqlanadi.
//
// Eslatma: Supabase tomonida custom JWT ni qabul qilish uchun anon key emas, service-role
// kalitidan foydalanamiz. RLS uchun JWT ichidagi `sub` ni `current_setting('request.jwt.claim.sub')`
// orqali o‘qiymiz (migration: current_app_user_id()).

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE_NAME = "bf_session";

export type Session = {
  uid: string;        // app_users.id
  tg: number;         // telegram_id
  iat: number;
  exp: number;
};

function b64url(buf: Buffer | string) {
  return (Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

function signingKey(): Buffer {
  // ENCRYPTION_KEY — 32 bayt (token shifrlash uchun); shu yerda imzo uchun ham yetadi.
  return Buffer.from(env().ENCRYPTION_KEY, "hex");
}

export function signSession(payload: Omit<Session, "iat" | "exp">, ttlSec = 60 * 60 * 24 * 30): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body: Session = { ...payload, iat: now, exp: now + ttlSec };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const sig = b64url(
    crypto.createHmac("sha256", signingKey()).update(`${h}.${p}`).digest()
  );
  return `${h}.${p}.${sig}`;
}

export function verifySession(token: string): Session | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = b64url(
    crypto.createHmac("sha256", signingKey()).update(`${h}.${p}`).digest()
  );
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(b64urlDecode(p).toString("utf8")) as Session;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const t = c.get(COOKIE_NAME)?.value;
  if (!t) return null;
  return verifySession(t);
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new AuthError("Avtorizatsiya talab qilinadi");
  return s;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
