import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";
import { verifyInitData } from "@/lib/telegram";

const BOT_TOKEN = "1234567890:TEST_TOKEN_FOR_VITEST_ONLY";

beforeAll(() => {
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
});

function buildInitData(params: Record<string, string>, token = BOT_TOKEN): string {
  const dataCheckString = Object.keys(params)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const usp = new URLSearchParams({ ...params, hash });
  return usp.toString();
}

describe("verifyInitData", () => {
  it("to'g'ri imzolangan initData → ok=true", () => {
    const initData = buildInitData({
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 42, first_name: "Test", username: "tester" }),
      query_id: "q1",
    });
    const r = verifyInitData(initData);
    expect(r.ok).toBe(true);
    expect(r.user?.id).toBe(42);
  });

  it("buzilgan hash → ok=false", () => {
    let initData = buildInitData({
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 1, first_name: "X" }),
    });
    initData = initData.replace(/hash=[^&]+/, "hash=" + "0".repeat(64));
    const r = verifyInitData(initData);
    expect(r.ok).toBe(false);
  });

  it("eskirgan auth_date (24h+) → ok=false", () => {
    const initData = buildInitData({
      auth_date: String(Math.floor(Date.now() / 1000) - 86400 - 100),
      user: JSON.stringify({ id: 1, first_name: "X" }),
    });
    const r = verifyInitData(initData);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/eskirgan/);
  });

  it("bo'sh initData → ok=false", () => {
    const r = verifyInitData("");
    expect(r.ok).toBe(false);
  });
});
