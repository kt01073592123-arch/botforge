"use client";

import { useEffect, useState } from "react";
import { LANGS, getLang, setLang, type Lang } from "@/lib/i18n";

export default function LangSwitch() {
  const [lang, set] = useState<Lang>("uz");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    set(getLang());
  }, []);

  const cur = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 rounded-lg text-xs border border-border bg-panel"
      >
        {cur.flag} {cur.code.toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 panel min-w-[140px] py-1 z-20">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-border"
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
