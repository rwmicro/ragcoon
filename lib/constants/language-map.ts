import { franc } from "franc-min"

// Map franc (ISO 639-3) language codes to our TTS/Voice language codes (ISO 639-1)
export const LANG_MAP: Record<string, string> = {
  eng: "en",
  fra: "fr",
  spa: "es",
  jpn: "ja",
  cmn: "zh", // Chinese Mandarin
  hin: "hi",
  ita: "it",
  por: "pt",
  ind: "id",
  arb: "ar",
}

export function detectLanguage(text: string, fallback = "en"): string {
  try {
    const detected = franc(text, { minLength: 10 })
    return LANG_MAP[detected] ?? fallback
  } catch {
    return fallback
  }
}
