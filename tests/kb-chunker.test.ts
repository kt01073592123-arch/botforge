import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/ai/embeddings";

describe("chunkText", () => {
  it("kichik matn → bitta chunk", () => {
    const out = chunkText("Salom, qisqa matn.", 500, 60);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("Salom, qisqa matn.");
  });

  it("uzun matn → bir nechta chunk, overlap bilan", () => {
    const sentences = Array.from({ length: 50 }, (_, i) => `Bu ${i + 1}-jumla.`).join(" ");
    const out = chunkText(sentences, 100, 20);
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) {
      expect(c.length).toBeLessThanOrEqual(120); // maxLen + biroz
    }
  });

  it("bo'sh matn → bo'sh array", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("CRLF line endings → tozalanadi", () => {
    const out = chunkText("a\r\nb\r\nc");
    expect(out[0]).toBe("a\nb\nc");
  });
});
