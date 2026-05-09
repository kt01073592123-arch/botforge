// PII redaction — webhook_logs va boshqa loglarda shaxsiy ma'lumotlarni maskalash.
// Telefon, email, ism, kredit karta, IBAN — hammasi mask qilinadi.
// Foydalanish: redactPayload(update) → log uchun xavfsiz versiya.

const PHONE_RE = /(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{2,4}[\s-]?\d{2,4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

const PII_KEYS = new Set([
  "phone",
  "phone_number",
  "email",
  "first_name",
  "last_name",
  "username",
  "address",
  "passport",
  "card",
  "card_number",
  "iban",
]);

function redactString(s: string): string {
  return s
    .replace(CARD_RE, "[CARD]")
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(PHONE_RE, (m) => (m.replace(/\D/g, "").length >= 7 ? "[PHONE]" : m));
}

export function redactPayload(input: unknown, depth = 0): unknown {
  if (depth > 10) return "[TOO_DEEP]";
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return redactString(input);
  if (typeof input === "number" || typeof input === "boolean") return input;

  if (Array.isArray(input)) {
    return input.map((v) => redactPayload(v, depth + 1));
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) {
        // Faqat bor/yo'qligini ko'rsatamiz, qiymatni emas
        out[k] = typeof v === "string" && v ? "[REDACTED]" : v;
      } else {
        out[k] = redactPayload(v, depth + 1);
      }
    }
    return out;
  }

  return input;
}

// Faqat string redaction (alerts.ts uchun)
export function redactText(s: string): string {
  return redactString(s);
}
