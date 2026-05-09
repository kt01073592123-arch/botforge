import { describe, it, expect } from "vitest";
import { redactPayload, redactText } from "@/lib/redact";

describe("redact", () => {
  it("telefon raqamini maskalash", () => {
    expect(redactText("Mening raqamim +998901234567")).toContain("[PHONE]");
    expect(redactText("90 123-45-67")).toContain("[PHONE]");
  });

  it("email maskalash", () => {
    expect(redactText("aloqa: test@example.com")).toContain("[EMAIL]");
  });

  it("kredit karta maskalash", () => {
    expect(redactText("4111 1111 1111 1111")).toContain("[CARD]");
  });

  it("PII keylari [REDACTED] bilan almashtiriladi", () => {
    const out = redactPayload({
      from: { id: 42, first_name: "Ali", username: "ali_v" },
      contact: { phone_number: "+998901234567" },
    }) as any;
    expect(out.from.id).toBe(42);
    expect(out.from.first_name).toBe("[REDACTED]");
    expect(out.from.username).toBe("[REDACTED]");
    expect(out.contact.phone_number).toBe("[REDACTED]");
  });

  it("nested object'ni rekursiv tekshirish", () => {
    const out = redactPayload({
      message: {
        text: "raqamim 998901234567",
        from: { first_name: "Vali" },
      },
    }) as any;
    expect(out.message.text).toContain("[PHONE]");
    expect(out.message.from.first_name).toBe("[REDACTED]");
  });

  it("primitive qiymatlar saqlanadi", () => {
    expect(redactPayload(42)).toBe(42);
    expect(redactPayload(null)).toBe(null);
    expect(redactPayload(true)).toBe(true);
  });
});
