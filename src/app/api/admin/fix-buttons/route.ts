// BIR MARTALIK: bot_templates.default_buttons va bot_data.custom_buttons'da
// "Mini App" / "Do'kon" tugmalariga web_app:true bayrog'ini qo'yadi.
// Migration qo'llangach FAYL O'CHIRILADI.

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_TIME_SECRET = "3bb120d735854eb18c27b044a4bcd442";

type Btn = string | { text: string; web_app?: boolean; url?: string };

function isMiniAppText(t: string): boolean {
  const l = t.toLowerCase();
  return (
    l.includes("mini app") ||
    l.includes("miniapp") ||
    l.includes("do'kon") ||
    l.includes("do‘kon") ||
    l.includes("dokon") ||
    l.includes("katalog") ||
    l.includes("savat") ||
    l.includes("shop")
  );
}

function fixButtons(raw: unknown): { changed: boolean; buttons: Btn[] } {
  let arr: unknown = raw;
  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      return { changed: false, buttons: [] };
    }
  }
  if (!Array.isArray(arr)) return { changed: false, buttons: [] };

  let changed = false;
  const out: Btn[] = arr.map((b) => {
    if (typeof b === "string") {
      if (isMiniAppText(b)) {
        changed = true;
        return { text: b, web_app: true };
      }
      return b;
    }
    if (b && typeof b === "object" && typeof (b as { text?: unknown }).text === "string") {
      const obj = b as { text: string; web_app?: boolean; url?: string };
      if (isMiniAppText(obj.text) && !obj.web_app) {
        changed = true;
        return { ...obj, web_app: true };
      }
      return obj;
    }
    return b as Btn;
  });
  return { changed, buttons: out };
}

export async function POST(req: Request) {
  const auth = req.headers.get("x-migrate-secret");
  if (auth !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const s = sql();

    // 1) bot_templates.default_buttons
    const tpls = (await s`
      select id, default_buttons from public.bot_templates where default_buttons is not null
    `) as Array<{ id: string; default_buttons: unknown }>;

    let tplFixed = 0;
    for (const t of tpls) {
      const { changed, buttons } = fixButtons(t.default_buttons);
      if (changed) {
        await s`
          update public.bot_templates
             set default_buttons = ${JSON.stringify(buttons)}::jsonb
           where id = ${t.id}
        `;
        tplFixed++;
      }
    }

    // 2) bot_data.custom_buttons
    const datas = (await s`
      select bot_id, custom_buttons from public.bot_data where custom_buttons is not null
    `) as Array<{ bot_id: string; custom_buttons: unknown }>;

    let dataFixed = 0;
    for (const d of datas) {
      const { changed, buttons } = fixButtons(d.custom_buttons);
      if (changed) {
        await s`
          update public.bot_data
             set custom_buttons = ${JSON.stringify(buttons)}::jsonb
           where bot_id = ${d.bot_id}
        `;
        dataFixed++;
      }
    }

    return NextResponse.json({
      ok: true,
      templates_total: tpls.length,
      templates_fixed: tplFixed,
      bot_data_total: datas.length,
      bot_data_fixed: dataFixed,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
