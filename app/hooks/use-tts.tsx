"use client"

import { useCallback, useRef, useState } from "react"
import { franc } from "franc-min"

// Map franc language codes to our TTS language codes
const LANG_MAP: Record<string, string> = {
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

function detectLanguage(text: string): string {
  try {
    const detected = franc(text, { minLength: 10 })
    const mapped = LANG_MAP[detected]
    console.log(`🌐 Detected language: ${detected} → ${mapped || "en"}`)
    return mapped || "en"
  } catch (error) {
    console.warn("Failed to detect language, defaulting to English", error)
    return "en"
  }
}

export function useTTS(apiUrl?: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Get API URL from settings or use default
  const getApiUrl = () => {
    if (apiUrl) return apiUrl

    try {
      const settings = localStorage.getItem("voiceSettings")
      if (settings) {
        const parsed = JSON.parse(settings)
        return parsed.apiUrl || process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8002"
      }
    } catch (e) {
      console.warn("Failed to read voice settings", e)
    }
    return process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8002"
  }

  const speak = useCallback(
    async (text: string, language?: string) => {
      // Auto-detect language if not provided
      const detectedLanguage = language || detectLanguage(text)
      // Stop any ongoing speech
      stop()

      setIsPlaying(true)
      abortControllerRef.current = new AbortController()

      try {
        const currentApiUrl = getApiUrl()
        console.log(`🔊 TTS Request: "${text.substring(0, 50)}..." in ${detectedLanguage}`)

        // Call the TTS API
        const response = await fetch(`${currentApiUrl}/api/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, language: detectedLanguage }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.statusText}`)
        }

        const data = await response.json()
        const audioBase64 = data.audio_base64
        const sampleRate = data.sample_rate || 24000

        // Decode base64 to audio
        const binaryString = atob(audioBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        // Convert int16 to float32
        const int16Array = new Int16Array(bytes.buffer)
        const float32Array = new Float32Array(int16Array.length)
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0
        }

        // Create audio context if needed
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate })
        }

        // Create audio buffer
        const audioBuffer = audioContextRef.current.createBuffer(
          1,
          float32Array.length,
          sampleRate
        )
        audioBuffer.getChannelData(0).set(float32Array)

        // Play audio
        const source = audioContextRef.current.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContextRef.current.destination)

        audioSourcesRef.current.push(source)

        source.onended = () => {
          setIsPlaying(false)
          audioSourcesRef.current = audioSourcesRef.current.filter((s) => s !== source)
        }

        source.start()
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("TTS aborted")
        } else {
          console.error("TTS error:", error)
        }
        setIsPlaying(false)
      }
    },
    []
  )

  const stop = useCallback(() => {
    // Abort ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Stop all audio sources
    audioSourcesRef.current.forEach((source) => {
      try {
        source.stop()
      } catch (e) {
        // Ignore if already stopped
      }
    })
    audioSourcesRef.current = []

    setIsPlaying(false)
  }, [])

  return {
    speak,
    stop,
    isPlaying,
  }
}
