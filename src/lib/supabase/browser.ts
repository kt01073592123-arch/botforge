"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "../env";

export function browserClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
