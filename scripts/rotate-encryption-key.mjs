#!/usr/bin/env node
// Encryption key rotation — barcha bot tokenlarini eski kalit bilan decrypt qilib,
// yangi kalit bilan re-encrypt qiladi.
//
// FOYDALANISH:
//   OLD_ENCRYPTION_KEY=<eski_hex_64> NEW_ENCRYPTION_KEY=<yangi_hex_64> \
//   DATABASE_URL=<postgres> node scripts/rotate-encryption-key.mjs --dry-run
//
//   Tasdiq uchun --dry-run olib tashlang. Eski tokenlarni decrypt qilib, yangi bilan
//   shifrlab qaytadan yozadi. ENCRYPTION_KEY env'ni ham yangiga almashtiring.
//
// XAVFSIZLIK: Script ishlayotgan paytda yangi botlar yaratilmasin. Vercel'da
// maintenance window'da bajarish tavsiya etiladi.

import crypto from "node:crypto";
import postgres from "postgres";

const ALGO = "aes-256-gcm";
const DRY_RUN = process.argv.includes("--dry-run");

function getKey(envName) {
  const v = process.env[envName];
  if (!v || !/^[0-9a-fA-F]{64}$/.test(v)) {
    throw new Error(`${envName} 64 hex char (32 bayt) bo'lishi kerak`);
  }
  return Buffer.from(v, "hex");
}

function decrypt(key, encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

function encrypt(key, plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: ct.toString("base64"),
    iv: iv.toString("base64"),
    authTag: tag.toString("base64"),
  };
}

async function main() {
  console.log(DRY_RUN ? "🟡 DRY RUN — hech narsa yozilmaydi" : "🔴 LIVE — tokenlar yangilanadi");

  const oldKey = getKey("OLD_ENCRYPTION_KEY");
  const newKey = getKey("NEW_ENCRYPTION_KEY");
  if (oldKey.equals(newKey)) {
    console.error("Eski va yangi kalit bir xil — to'xtatildi.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL kerak");
    process.exit(1);
  }
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  try {
    const rows = await sql`
      select bot_id, encrypted_token, iv, auth_tag
      from public.bot_secrets
    `;
    console.log(`Topildi: ${rows.length} ta token`);

    let ok = 0;
    let fail = 0;
    for (const r of rows) {
      try {
        const plain = decrypt(oldKey, r.encrypted_token, r.iv, r.auth_tag);
        const fresh = encrypt(newKey, plain);
        if (!DRY_RUN) {
          await sql`
            update public.bot_secrets
            set encrypted_token = ${fresh.encrypted},
                iv = ${fresh.iv},
                auth_tag = ${fresh.authTag},
                rotated_at = now()
            where bot_id = ${r.bot_id}
          `;
        }
        ok++;
        console.log(`  ✓ ${r.bot_id}`);
      } catch (e) {
        fail++;
        console.error(`  ✗ ${r.bot_id}: ${e.message}`);
      }
    }
    console.log(`\nNatija: ${ok} muvaffaqiyat, ${fail} xato`);
    if (fail > 0 && !DRY_RUN) {
      console.error("⚠️ Xato bo'lgan botlar uchun ENCRYPTION_KEY ni hali eskisi bilan qoldiring va sababini tekshiring.");
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
