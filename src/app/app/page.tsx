"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppIndex() {
  const r = useRouter();
  useEffect(() => {
    r.replace("/app/bots");
  }, [r]);
  return null;
}
