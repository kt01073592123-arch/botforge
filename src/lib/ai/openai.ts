// OpenAI klient — minimalist wrapper.

import OpenAI from "openai";
import { env } from "../env";

let cached: OpenAI | null = null;

export function openai(): OpenAI {
  if (cached) return cached;
  cached = new OpenAI({ apiKey: env().OPENAI_API_KEY });
  return cached;
}
