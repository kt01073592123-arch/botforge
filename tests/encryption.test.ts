import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken, maskToken } from "@/lib/encryption";

describe("encryption", () => {
  it("round-trip: encrypt → decrypt natijasi asl matnga teng", () => {
    const plain = "1234567890:AAA-BBB-CCC-DDD-EEE-FFF";
    const enc = encryptToken(plain);
    expect(enc.encrypted).toBeTruthy();
    expect(enc.iv).toBeTruthy();
    expect(enc.authTag).toBeTruthy();
    const dec = decryptToken(enc);
    expect(dec).toBe(plain);
  });

  it("har encrypt unikal IV qaytaradi (deterministik emas)", () => {
    const plain = "test_token";
    const a = encryptToken(plain);
    const b = encryptToken(plain);
    expect(a.iv).not.toBe(b.iv);
    expect(a.encrypted).not.toBe(b.encrypted);
  });

  it("buzilgan authTag → decrypt error", () => {
    const enc = encryptToken("hello");
    const bad = { ...enc, authTag: Buffer.alloc(16).toString("base64") };
    expect(() => decryptToken(bad)).toThrow();
  });

  it("maskToken format to'g'ri", () => {
    expect(maskToken("12345:ABCDEFGHIJKL")).toBe("12345:ABCD****IJKL");
    expect(maskToken("invalid")).toBe("********");
  });
});
