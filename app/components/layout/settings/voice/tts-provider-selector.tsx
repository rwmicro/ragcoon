"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SpeakerHigh, CheckCircle, Warning } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface TTSProvider {
  id: string
  name: string
  description: string
  supported_languages: string[]
  quality: string
  features?: string[]
}

interface Voice {
  id: string
  name: string
  language: string
  gender: string
  accent?: string
  quality_grade?: string
  description: string
}

const TTS_PROVIDERS_INFO: Record<string, TTSProvider> = {
  kokoro: {
    id: "kokoro",
    name: "Kokoro-82M",
    description: "Fast, lightweight multilingual TTS (82M parameters). Best for: quick responses, multilingual apps, low-resource environments.",
    supported_languages: ["en", "ja", "zh", "es", "fr", "hi", "it", "pt"],
    quality: "Good (B-/C)",
    features: ["⚡ Fast", "🌍 8 Languages", "💾 Low VRAM (1-2GB)", "🖥️ CPU Friendly"]
  },
  chatterbox: {
    id: "chatterbox",
    name: "Chatterbox Multilingual",
    description: "Production-grade multilingual TTS from ResembleAI with emotion control and zero-shot cloning. Best for: professional multilingual content, high-quality narration, emotion-rich speech.",
    supported_languages: ["ar", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi", "it", "ja", "ko", "ms", "nl", "no", "pl", "pt", "ru", "sv", "sw", "tr", "zh"],
    quality: "Excellent (A)",
    features: ["🎭 23 Languages", "🎯 Emotion control", "🎤 Zero-shot cloning", "⚡ High quality"]
  },
  "f5-tts": {
    id: "f5-tts",
    name: "F5-TTS",
    description: "State-of-the-art zero-shot voice cloning with flow matching. Best for: custom voices, highest quality, creative projects.",
    supported_languages: ["en", "zh", "ja", "es", "fr", "de", "ko"],
    quality: "Excellent (A+)",
    features: ["🎤 Voice cloning", "✨ Best quality", "🌍 7 Languages", "🚀 Requires GPU"]
  }
}

export function TTSProviderSelector({
  apiUrl = process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8002",
  onProviderChange
}: {
  apiUrl?: string
  onProviderChange?: (provider: string) => void
}) {
  const [currentProvider, setCurrentProvider] = useState<string>("kokoro")
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en")
  const [f5ModelVariant, setF5ModelVariant] = useState<string>("F5TTS_v1_Base")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Load saved F5 model variant from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("f5ModelVariant")
    if (saved) {
      setF5ModelVariant(saved)
    }
  }, [])

  // Fetch available providers on mount
  useEffect(() => {
    fetchProviders()
  }, [apiUrl])

  // Fetch voices when provider or language changes
  useEffect(() => {
    if (isConnected) {
      fetchVoices(selectedLanguage)
    }
  }, [currentProvider, selectedLanguage, isConnected])

  const fetchProviders = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${apiUrl}/api/voice/tts/providers`)

      if (!response.ok) {
        throw new Error("Failed to fetch providers")
      }

      const data = await response.json()

      setAvailableProviders(data.providers)
      setCurrentProvider(data.current)
      setVoices(data.available_voices || [])
      setIsConnected(true)

      // Select default voice
      if (data.available_voices && data.available_voices.length > 0) {
        setSelectedVoice(data.available_voices[0].id)
      }

    } catch {
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVoices = async (language?: string) => {
    try {
      const url = language
        ? `${apiUrl}/api/voice/tts/voices?language=${language}`
        : `${apiUrl}/api/voice/tts/voices`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch voices")
      }

      const data = await response.json()
      setVoices(data.voices || [])

      // Select first voice if available
      if (data.voices && data.voices.length > 0) {
        setSelectedVoice(data.voices[0].id)
      }

    } catch (error) {
      console.error("Error fetching voices:", error)
    }
  }

  const switchProvider = async (providerId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Build URL with model_variant for F5-TTS
      let url = `${apiUrl}/api/voice/tts/switch?provider=${providerId}`
      if (providerId === "f5-tts") {
        url += `&model_variant=${f5ModelVariant}`
      }

      const response = await fetch(url, { method: "POST" })

      if (!response.ok) {
        throw new Error("Failed to switch provider")
      }

      const data = await response.json()

      setCurrentProvider(providerId)
      setVoices(data.voices || [])

      if (data.voices && data.voices.length > 0) {
        setSelectedVoice(data.voices[0].id)
      }

      // Save to localStorage
      localStorage.setItem("ttsProvider", providerId)
      localStorage.setItem("ttsVoice", data.voices[0]?.id || "")
      if (providerId === "f5-tts") {
        localStorage.setItem("f5ModelVariant", f5ModelVariant)
      }

      if (onProviderChange) {
        onProviderChange(providerId)
      }

    } catch (error) {
      console.error("Error switching provider:", error)
      setError(error instanceof Error ? error.message : "Failed to switch provider")
    } finally {
      setIsLoading(false)
    }
  }

  const testVoice = async () => {
    if (!selectedVoice) return

    let audioContext: AudioContext | null = null

    try {
      setIsLoading(true)

      const testText = "Hello, this is a test of the text to speech system."

      const response = await fetch(`${apiUrl}/api/voice/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testText,
          language: selectedLanguage,
          voice_id: selectedVoice,
        }),
      })

      if (!response.ok) {
        throw new Error("TTS test failed")
      }

      const data = await response.json()

      // Play audio
      const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))
      audioContext = new AudioContext()
      const audioBuffer = await audioContext.decodeAudioData(audioBytes.buffer)
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)

      // Close AudioContext when audio finishes playing
      source.onended = () => {
        audioContext?.close()
      }

      source.start()

    } catch (error) {
      console.error("Error testing voice:", error)
      setError("Failed to test voice")
      // Close AudioContext if error occurs
      audioContext?.close()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SpeakerHigh className="h-5 w-5" />
          TTS Provider Selection
        </CardTitle>
        <CardDescription>
          Choose your text-to-speech engine and voice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                Connected to Voice API
              </span>
            </>
          ) : (
            <>
              <Warning className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                Not connected to Voice API
              </span>
            </>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="tts-provider">TTS Provider</Label>
          <Select
            value={currentProvider}
            onValueChange={switchProvider}
            disabled={isLoading || !isConnected}
          >
            <SelectTrigger id="tts-provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.map((providerId) => {
                const info = TTS_PROVIDERS_INFO[providerId]
                return (
                  <SelectItem key={providerId} value={providerId}>
                    <div className="flex items-center gap-2">
                      <span>{info?.name || providerId}</span>
                      <Badge variant="secondary" className="text-xs">
                        {info?.quality}
                      </Badge>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Provider Info */}
          {currentProvider && TTS_PROVIDERS_INFO[currentProvider] && (
            <div className="mt-2 p-3 bg-muted rounded-md space-y-2">
              <p className="text-sm text-muted-foreground">
                {TTS_PROVIDERS_INFO[currentProvider].description}
              </p>
              <div className="flex flex-wrap gap-2">
                {TTS_PROVIDERS_INFO[currentProvider].features?.map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Languages: {TTS_PROVIDERS_INFO[currentProvider].supported_languages.join(", ")}
              </div>
            </div>
          )}
        </div>

        {/* F5-TTS Model Variant Selection */}
        {currentProvider === "f5-tts" && (
          <div className="space-y-2">
            <Label htmlFor="f5-model">F5-TTS Model Variant</Label>
            <Select
              value={f5ModelVariant}
              onValueChange={(value) => {
                setF5ModelVariant(value)
                // Auto-reload provider with new model
                if (isConnected) {
                  switchProvider("f5-tts")
                }
              }}
              disabled={isLoading || !isConnected}
            >
              <SelectTrigger id="f5-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="F5TTS_v1_Base">
                  <div className="flex items-center gap-2">
                    <span>Base Model</span>
                    <Badge variant="secondary" className="text-xs">~300MB</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="F5TTS_v1_Large">
                  <div className="flex items-center gap-2">
                    <span>Large Model</span>
                    <Badge variant="secondary" className="text-xs">~1GB</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
              {f5ModelVariant === "F5TTS_v1_Base" ? (
                <>
                  <p className="font-semibold text-primary">⚡ Base Model (Faster)</p>
                  <p className="text-muted-foreground">• Smaller size (~300MB)</p>
                  <p className="text-muted-foreground">• Faster inference</p>
                  <p className="text-muted-foreground">• Good quality for most use cases</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-primary">✨ Large Model (Best Quality)</p>
                  <p className="text-muted-foreground">• Larger size (~1GB)</p>
                  <p className="text-muted-foreground">• Slower inference</p>
                  <p className="text-muted-foreground">• Highest quality output</p>
                  <p className="text-muted-foreground">• Better for professional use</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Language Selection */}
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
            disabled={isLoading || !isConnected}
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {/* Show all languages but indicate which are supported by current provider */}
              <SelectItem value="ar" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ar")}>
                🇸🇦 العربية (Arabic) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ar") && "• Not available"}
              </SelectItem>
              <SelectItem value="zh" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("zh")}>
                🇨🇳 中文 (Chinese) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("zh") && "• Not available"}
              </SelectItem>
              <SelectItem value="da" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("da")}>
                🇩🇰 Dansk (Danish) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("da") && "• Not available"}
              </SelectItem>
              <SelectItem value="nl" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("nl")}>
                🇳🇱 Nederlands (Dutch) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("nl") && "• Not available"}
              </SelectItem>
              <SelectItem value="en">
                🇬🇧 English {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("en") && "(⚠️ Not supported)"}
              </SelectItem>
              <SelectItem value="fi" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("fi")}>
                🇫🇮 Suomi (Finnish) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("fi") && "• Not available"}
              </SelectItem>
              <SelectItem value="fr" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("fr")}>
                🇫🇷 Français (French) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("fr") && "• Not available"}
              </SelectItem>
              <SelectItem value="de" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("de")}>
                🇩🇪 Deutsch (German) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("de") && "• Not available"}
              </SelectItem>
              <SelectItem value="el" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("el")}>
                🇬🇷 Ελληνικά (Greek) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("el") && "• Not available"}
              </SelectItem>
              <SelectItem value="he" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("he")}>
                🇮🇱 עברית (Hebrew) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("he") && "• Not available"}
              </SelectItem>
              <SelectItem value="hi" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("hi")}>
                🇮🇳 हिन्दी (Hindi) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("hi") && "• Not available"}
              </SelectItem>
              <SelectItem value="ms" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ms")}>
                🇲🇾 Bahasa Melayu (Indonesian/Malay) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ms") && "• Not available"}
              </SelectItem>
              <SelectItem value="it" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("it")}>
                🇮🇹 Italiano (Italian) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("it") && "• Not available"}
              </SelectItem>
              <SelectItem value="ja" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ja")}>
                🇯🇵 日本語 (Japanese) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ja") && "• Not available"}
              </SelectItem>
              <SelectItem value="ko" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ko")}>
                🇰🇷 한국어 (Korean) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ko") && "• Not available"}
              </SelectItem>
              <SelectItem value="no" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("no")}>
                🇳🇴 Norsk (Norwegian) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("no") && "• Not available"}
              </SelectItem>
              <SelectItem value="pl" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("pl")}>
                🇵🇱 Polski (Polish) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("pl") && "• Not available"}
              </SelectItem>
              <SelectItem value="pt" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("pt")}>
                🇵🇹 Português (Portuguese) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("pt") && "• Not available"}
              </SelectItem>
              <SelectItem value="ru" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ru")}>
                🇷🇺 Русский (Russian) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("ru") && "• Not available"}
              </SelectItem>
              <SelectItem value="es" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("es")}>
                🇪🇸 Español (Spanish) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("es") && "• Not available"}
              </SelectItem>
              <SelectItem value="sv" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("sv")}>
                🇸🇪 Svenska (Swedish) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("sv") && "• Not available"}
              </SelectItem>
              <SelectItem value="sw" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("sw")}>
                🇹🇿 Kiswahili (Swahili) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("sw") && "• Not available"}
              </SelectItem>
              <SelectItem value="tr" disabled={!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("tr")}>
                🇹🇷 Türkçe (Turkish) {!TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes("tr") && "• Not available"}
              </SelectItem>
            </SelectContent>
          </Select>
          {selectedLanguage && !TTS_PROVIDERS_INFO[currentProvider]?.supported_languages.includes(selectedLanguage) && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ This language is not supported by {TTS_PROVIDERS_INFO[currentProvider]?.name}. Please select a different provider or language.
            </p>
          )}
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <Label htmlFor="voice">Voice</Label>
          <Select
            value={selectedVoice}
            onValueChange={(value) => {
              setSelectedVoice(value)
              localStorage.setItem("ttsVoice", value)
            }}
            disabled={isLoading || !isConnected || voices.length === 0}
          >
            <SelectTrigger id="voice">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div className="flex items-center gap-2">
                    <span>{voice.name}</span>
                    {voice.quality_grade && (
                      <Badge variant="secondary" className="text-xs">
                        {voice.quality_grade}
                      </Badge>
                    )}
                    {voice.accent && (
                      <span className="text-xs text-muted-foreground">
                        ({voice.accent})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedVoice && voices.find((v) => v.id === selectedVoice) && (
            <p className="text-xs text-muted-foreground mt-1">
              {voices.find((v) => v.id === selectedVoice)?.description}
            </p>
          )}
        </div>

        {/* Test Button */}
        <Button
          onClick={testVoice}
          disabled={isLoading || !isConnected || !selectedVoice}
          className="w-full"
        >
          <SpeakerHigh className="h-4 w-4 mr-2" />
          Test Voice
        </Button>

        {/* Retry Connection */}
        {!isConnected && (
          <Button
            onClick={fetchProviders}
            variant="outline"
            disabled={isLoading}
            className="w-full"
          >
            Retry Connection
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
