"use client";

import { useEffect, useState } from "react";
import { getLang, t as translate, type Lang } from "@/lib/i18n";

export function useT() {
  const [lang, setLang] = useState<Lang>("uz");
  useEffect(() => {
    setLang(getLang());
  }, []);
  return {
    lang,
    t: (key: string) => translate(key, lang),
  };
}
