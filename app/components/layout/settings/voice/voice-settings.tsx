"use client"

import { useState, useEffect, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Microphone, SpeakerHigh } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { TTSProviderSelector } from "./tts-provider-selector"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { Switch } from "@/components/ui/switch"

interface VoiceLanguage {
  code: string
  name: string
  ttsVoice?: string
}

const DEFAULT_LANGUAGES: VoiceLanguage[] = [
  { code: "ar", name: "🇸🇦 العربية (Arabic)", ttsVoice: "default" },
  { code: "zh", name: "🇨🇳 中文 (Chinese)", ttsVoice: "zf_xiaobei" },
  { code: "da", name: "🇩🇰 Dansk (Danish)", ttsVoice: "default" },
  { code: "nl", name: "🇳🇱 Nederlands (Dutch)", ttsVoice: "default" },
  { code: "en", name: "🇬🇧 English", ttsVoice: "bf_emma" },
  { code: "fi", name: "🇫🇮 Suomi (Finnish)", ttsVoice: "default" },
  { code: "fr", name: "🇫🇷 Français (French)", ttsVoice: "ff_siwis" },
  { code: "de", name: "🇩🇪 Deutsch (German)", ttsVoice: "default" },
  { code: "el", name: "🇬🇷 Ελληνικά (Greek)", ttsVoice: "default" },
  { code: "he", name: "🇮🇱 עברית (Hebrew)", ttsVoice: "default" },
  { code: "hi", name: "🇮🇳 हिन्दी (Hindi)", ttsVoice: "hf_alpha" },
  { code: "ms", name: "🇲🇾 Bahasa Melayu (Indonesian/Malay)", ttsVoice: "default" },
  { code: "it", name: "🇮🇹 Italiano (Italian)", ttsVoice: "if_sara" },
  { code: "ja", name: "🇯🇵 日本語 (Japanese)", ttsVoice: "jf_alpha" },
  { code: "ko", name: "🇰🇷 한국어 (Korean)", ttsVoice: "default" },
  { code: "no", name: "🇳🇴 Norsk (Norwegian)", ttsVoice: "default" },
  { code: "pl", name: "🇵🇱 Polski (Polish)", ttsVoice: "default" },
  { code: "pt", name: "🇵🇹 Português (Portuguese)", ttsVoice: "pf_dora" },
  { code: "ru", name: "🇷🇺 Русский (Russian)", ttsVoice: "default" },
  { code: "es", name: "🇪🇸 Español (Spanish)", ttsVoice: "ef_dora" },
  { code: "sv", name: "🇸🇪 Svenska (Swedish)", ttsVoice: "default" },
  { code: "sw", name: "🇹🇿 Kiswahili (Swahili)", ttsVoice: "default" },
  { code: "tr", name: "🇹🇷 Türkçe (Turkish)", ttsVoice: "default" },
]

// Test phrases for each language (all 23 Chatterbox-supported languages + others)
const TEST_PHRASES: Record<string, string> = {
  ar: "مرحبا، هذا اختبار لنظام تحويل النص إلى كلام.",
  zh: "你好，这是文本转语音系统的测试。",
  da: "Hej, dette er en test af tekst-til-tale systemet.",
  nl: "Hallo, dit is een test van het tekst-naar-spraak systeem.",
  en: "Hello, this is a test of the text to speech system.",
  fi: "Hei, tämä on teksti puheeksi -järjestelmän testi.",
  fr: "Bonjour, ceci est un test du système de synthèse vocale.",
  de: "Hallo, dies ist ein Test des Text-zu-Sprache-Systems.",
  el: "Γεια σας, αυτή είναι μια δοκιμή του συστήματος μετατροπής κειμένου σε ομιλία.",
  he: "שלום, זהו מבחן של מערכת המרת טקסט לדיבור.",
  hi: "नमस्ते, यह टेक्स्ट टू स्पीच सिस्टम का परीक्षण है।",
  ms: "Halo, ini adalah ujian sistem teks ke ucapan.",
  it: "Ciao, questo è un test del sistema di sintesi vocale.",
  ja: "こんにちは、これはテキスト読み上げシステムのテストです。",
  ko: "안녕하세요, 이것은 텍스트 음성 변환 시스템의 테스트입니다.",
  no: "Hei, dette er en test av tekst-til-tale systemet.",
  pl: "Cześć, to jest test systemu zamiany tekstu na mowę.",
  pt: "Olá, este é um teste do sistema de conversão de texto em fala.",
  ru: "Здравствуйте, это тест системы преобразования текста в речь.",
  es: "Hola, esta es una prueba del sistema de texto a voz.",
  sv: "Hej, detta är ett test av text-till-tal systemet.",
  sw: "Hujambo, hii ni jaribio la mfumo wa kubadilisha maandishi kuwa sauti.",
  tr: "Merhaba, bu metin okuma sisteminin bir testidir.",
}

// Fallback voice mappings (will be overridden by API data)
const AVAILABLE_VOICES = {
  en: ["af_bella", "bf_emma"],
  ar: ["default"],
  da: ["default"],
  de: ["default"],
  el: ["default"],
  es: ["ef_dora"],
  fi: ["default"],
  fr: ["ff_siwis"],
  he: ["default"],
  hi: ["hf_alpha"],
  it: ["if_sara"],
  ja: ["jf_alpha"],
  ko: ["default"],
  ms: ["default"],
  nl: ["default"],
  no: ["default"],
  pl: ["default"],
  pt: ["pf_dora"],
  ru: ["default"],
  sv: ["default"],
  sw: ["default"],
  tr: ["default"],
  zh: ["zf_xiaobei"],
}

export function VoiceSettings() {
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8002")
  const [sttModel, setSttModel] = useState("openai/whisper-small")
  const [ttsModel, setTtsModel] = useState("hexgrad/Kokoro-82M")
  const [currentTtsProvider, setCurrentTtsProvider] = useState("kokoro")
  const [availableVoices, setAvailableVoices] = useState<Record<string, string[]>>({})
  const [languages, setLanguages] = useState<VoiceLanguage[]>(DEFAULT_LANGUAGES)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedMicId, setSelectedMicId] = useState<string>("")
  const { preferences, setEnableTTS, setEnableSTT } = useUserPreferences()

  // Refs to track and stop current audio playback
  const currentAudioContextRef = useRef<AudioContext | null>(null)
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Load settings on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem("voiceSettings")
      if (saved) {
        const settings = JSON.parse(saved)
        setApiUrl(settings.apiUrl || process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8002")
        setSttModel(settings.sttModel || "openai/whisper-small")
        setTtsModel(settings.ttsModel || "hexgrad/Kokoro-82M")
        setLanguages(settings.languages || DEFAULT_LANGUAGES)
        setSelectedMicId(settings.selectedMicId || "")
      }
    } catch (e) {
      console.error("Failed to load voice settings", e)
    }
  }, [])

  // Get audio input devices
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const getDevices = async () => {
      try {
        // Request microphone permission first to get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter((device) => device.kind === "audioinput")
        setAudioInputDevices(audioInputs)
        if (audioInputs.length > 0 && !selectedMicId) {
          setSelectedMicId(audioInputs[0].deviceId)
        }
        // Stop the stream after getting device list
        stream.getTracks().forEach(track => track.stop())
      } catch (err) {
        console.error("Failed to enumerate audio devices:", err)
      }
    }
    getDevices()
  }, [])

  // Check API connection on mount and when URL changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    checkConnection()
  }, [apiUrl])

  const checkConnection = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/voice/health`)
      if (response.ok) {
        const data = await response.json()
        setIsConnected(true)
        // Support both v1 and v2 API formats
        const sttModelFromApi = data.models_loaded?.stt_model || data.stt_model || sttModel
        setSttModel(sttModelFromApi)
        console.log("✅ Voice API connected:", data)
        // Fetch voices after successful connection
        fetchVoices()
      } else {
        setIsConnected(false)
        console.log("⚠️ Voice API health check failed:", response.status, response.statusText)
      }
    } catch (error) {
      setIsConnected(false)
      console.error("❌ Voice API not reachable:", error)
    }
  }

  const fetchVoices = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/voice/tts/voices`)
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Fetched voices:", data)

        // Group voices by language
        const voicesByLang: Record<string, string[]> = {}
        data.voices.forEach((voice: any) => {
          const lang = voice.language
          if (!voicesByLang[lang]) {
            voicesByLang[lang] = []
          }
          voicesByLang[lang].push(voice.id)
        })

        setAvailableVoices(voicesByLang)
        setCurrentTtsProvider(data.provider || currentTtsProvider)

        // Update languages list with supported languages from provider
        const supportedLangs = Object.keys(voicesByLang)
        if (supportedLangs.length > 0) {
          // Keep existing language names but update voices
          const updatedLanguages = languages.map(lang => {
            if (supportedLangs.includes(lang.code) && voicesByLang[lang.code].length > 0) {
              // Keep current voice if it's still available, otherwise use first voice
              const currentVoiceAvailable = voicesByLang[lang.code].includes(lang.ttsVoice || '')
              return {
                ...lang,
                ttsVoice: currentVoiceAvailable ? lang.ttsVoice : voicesByLang[lang.code][0]
              }
            }
            return lang
          })
          setLanguages(updatedLanguages)
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch voices:", error)
    }
  }

  const handleProviderChange = (provider: string) => {
    console.log("🔄 Provider changed to:", provider)
    setCurrentTtsProvider(provider)

    // Save provider preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('ttsProvider', provider)
    }

    // Fetch voices for the new provider
    fetchVoices()
  }

  const handleUpdateVoice = (code: string, voice: string) => {
    setLanguages(
      languages.map((lang) =>
        lang.code === code ? { ...lang, ttsVoice: voice } : lang
      )
    )
  }

  const handleTestTTS = async (languageCode: string) => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Stop any currently playing audio
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop()
        currentAudioSourceRef.current.disconnect()
      } catch (e) {
        // Audio might already be stopped
      }
      currentAudioSourceRef.current = null
    }

    if (currentAudioContextRef.current) {
      try {
        await currentAudioContextRef.current.close()
      } catch (e) {
        // Context might already be closed
      }
      currentAudioContextRef.current = null
    }

    setIsLoading(true)
    try {
      // Get language-specific test phrase
      const testText = TEST_PHRASES[languageCode] || TEST_PHRASES.en
      console.log(`🔊 Testing TTS for ${languageCode}: "${testText}"`)

      const response = await fetch(`${apiUrl}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText, language: languageCode }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ TTS Test successful")
        // Play the audio
        const audioBase64 = data.audio_base64
        const binaryString = atob(audioBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const int16Array = new Int16Array(bytes.buffer)
        const float32Array = new Float32Array(int16Array.length)
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0
        }

        const audioContext = new AudioContext({ sampleRate: 24000 })
        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000)
        audioBuffer.getChannelData(0).set(float32Array)
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)

        // Store references for cleanup
        currentAudioContextRef.current = audioContext
        currentAudioSourceRef.current = source

        // Auto-cleanup when audio finishes
        source.onended = () => {
          audioContext.close()
          currentAudioContextRef.current = null
          currentAudioSourceRef.current = null
        }

        source.start()
      }
    } catch (error) {
      console.error("❌ TTS Test failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Ref for save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const saveSettings = () => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Save to localStorage for now
    localStorage.setItem(
      "voiceSettings",
      JSON.stringify({
        apiUrl,
        sttModel,
        ttsModel,
        languages,
        selectedMicId,
      })
    )
    console.log("✅ Settings saved")
    setIsSaved(true)

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => setIsSaved(false), 2000)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microphone size={24} />
            Voice Settings
          </CardTitle>
          <CardDescription>
            Configure Speech-to-Text and Text-to-Speech settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Connection */}
          <div className="space-y-2">
            <Label htmlFor="apiUrl">Voice API URL</Label>
            <div className="flex gap-2">
              <Input
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8002"
              />
              <Button onClick={checkConnection} variant="outline">
                Test
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <span className={isConnected ? "text-green-500" : "text-red-500"}>
                {isConnected ? "● Connected" : "○ Disconnected"}
              </span>
            </p>
          </div>

          {/* Global Toggles */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Speech-to-Text</Label>
                <p className="text-xs text-muted-foreground">
                  Show microphone and voice conversation buttons
                </p>
              </div>
              <Switch
                checked={preferences.enableSTT}
                onCheckedChange={setEnableSTT}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Text-to-Speech</Label>
                <p className="text-xs text-muted-foreground">
                  Show read aloud button and enable voice responses
                </p>
              </div>
              <Switch
                checked={preferences.enableTTS}
                onCheckedChange={setEnableTTS}
              />
            </div>
          </div>

          <Tabs defaultValue="stt" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stt">
                <Microphone className="mr-2" size={16} />
                Speech-to-Text
              </TabsTrigger>
              <TabsTrigger value="tts">
                <SpeakerHigh className="mr-2" size={16} />
                Text-to-Speech
              </TabsTrigger>
            </TabsList>

            {/* STT Settings */}
            <TabsContent value="stt" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sttModel">STT Model</Label>
                <Select value={sttModel} onValueChange={setSttModel}>
                  <SelectTrigger id="sttModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai/whisper-tiny">Whisper Tiny (fastest)</SelectItem>
                    <SelectItem value="openai/whisper-base">Whisper Base</SelectItem>
                    <SelectItem value="openai/whisper-small">Whisper Small (recommended)</SelectItem>
                    <SelectItem value="openai/whisper-medium">Whisper Medium</SelectItem>
                    <SelectItem value="openai/whisper-large-v3">Whisper Large v3 (best quality)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Larger models provide better accuracy but require more resources
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="micInput">Microphone Input</Label>
                <Select value={selectedMicId || undefined} onValueChange={setSelectedMicId}>
                  <SelectTrigger id="micInput">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioInputDevices.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No microphones detected
                      </SelectItem>
                    ) : (
                      audioInputDevices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the microphone to use for voice input
                </p>
              </div>
            </TabsContent>

            {/* TTS Settings */}
            <TabsContent value="tts" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ttsModel">TTS Model</Label>
                <Select value={ttsModel} onValueChange={setTtsModel}>
                  <SelectTrigger id="ttsModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hexgrad/Kokoro-82M">Kokoro-82M (multilingual)</SelectItem>
                    <SelectItem value="facebook/mms-tts">Facebook MMS-TTS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* TTS Provider Selection */}
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <SpeakerHigh size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-sm">TTS Provider Selection</h4>
                      <p className="text-xs text-muted-foreground">
                        Choose your TTS engine below. Each provider supports different languages and voice qualities. The voice list will update automatically when you switch providers.
                      </p>
                    </div>
                  </div>
                </div>

                <TTSProviderSelector
                  apiUrl={apiUrl}
                  onProviderChange={handleProviderChange}
                />
              </div>

              {/* Language Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Supported Languages & Voices</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure TTS voices for languages with multiple voice options • Current Provider: <span className="font-semibold text-primary">{currentTtsProvider || 'Not connected'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Object.keys(availableVoices).length > 0 ? (
                        (() => {
                          const languagesWithMultipleVoices = Object.keys(availableVoices).filter(
                            lang => availableVoices[lang].length > 1
                          ).length
                          const totalVoices = Object.values(availableVoices).flat().length
                          return languagesWithMultipleVoices > 0 ? (
                            <>✅ {languagesWithMultipleVoices} languages with voice selection • {totalVoices} total voices available</>
                          ) : (
                            <>ℹ️ Current provider uses default voices only. All languages have a single voice option.</>
                          )
                        })()
                      ) : (
                        <>⚠️ No voices loaded. Check API connection.</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
                  {(() => {
                    const languagesWithChoices = languages.filter((lang) => {
                      const availableVoicesForLang = availableVoices[lang.code] || []
                      // Only show languages with MORE than one voice option
                      // If only one voice is available, there's no choice to make
                      return availableVoicesForLang.length > 1
                    })

                    if (languagesWithChoices.length === 0) {
                      return (
                        <div className="col-span-full">
                          <Card className="border-dashed">
                            <CardContent className="pt-8 pb-8 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="rounded-full bg-muted p-4">
                                  <SpeakerHigh size={32} className="text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                  <p className="font-semibold">No Voice Selection Available</p>
                                  <p className="text-sm text-muted-foreground max-w-md">
                                    The current TTS provider ({currentTtsProvider || 'unknown'}) uses default voices for all languages.
                                    There are no voice options to customize.
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    💡 Try switching to a different provider (like Kokoro or F5-TTS) above for more voice options.
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )
                    }

                    return languagesWithChoices.map((lang, index) => {
                      const availableVoicesForLang = availableVoices[lang.code] || []
                      const hasVoices = availableVoicesForLang.length > 0
                      return (
                        <Card
                          key={lang.code}
                          className={cn(
                            "group relative overflow-hidden border-2 transition-all duration-300",
                            hasVoices
                              ? "hover:border-primary/50 hover:shadow-lg"
                              : "opacity-60 border-dashed"
                          )}
                        >
                          {/* Status badge */}
                          {!hasVoices && (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                                Not available
                              </span>
                            </div>
                          )}

                          {/* Background gradient */}
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 transition-opacity",
                            hasVoices ? "from-primary/5 group-hover:opacity-100" : "from-muted/20"
                          )} />

                          <CardContent className="relative pt-4 pb-4">
                            <div className="flex flex-col gap-3">
                              {/* Header with language info */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg">
                                    {String(index + 1).padStart(2, '0')}
                                  </div>
                                  <div>
                                    <p className="font-bold text-base leading-tight">{lang.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded inline-block mt-1">
                                      {lang.code}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Voice selection with preview */}
                              <div className="space-y-2">
                                <Label htmlFor={`voice-${lang.code}`} className="text-xs font-semibold text-muted-foreground">
                                  Voice Selection
                                </Label>

                                {/* Voice options as radio buttons/cards */}
                                <div className="space-y-2">
                                  {availableVoicesForLang.length > 0 ? (
                                    availableVoicesForLang.map((voice: string) => (
                                      <div
                                        key={voice}
                                        onClick={() => handleUpdateVoice(lang.code, voice)}
                                        className={cn(
                                          "flex items-center justify-between p-2.5 rounded-lg border-2 cursor-pointer transition-all",
                                          lang.ttsVoice === voice
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border hover:border-primary/30 hover:bg-accent/50"
                                        )}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            handleUpdateVoice(lang.code, voice)
                                          }
                                        }}
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div
                                            className={cn(
                                              "flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors",
                                              lang.ttsVoice === voice
                                                ? "border-primary bg-primary"
                                                : "border-muted-foreground/30"
                                            )}
                                          >
                                            {lang.ttsVoice === voice && (
                                              <div className="w-full h-full rounded-full bg-white scale-50" />
                                            )}
                                          </div>
                                          <span className={cn(
                                            "font-mono text-sm truncate",
                                            lang.ttsVoice === voice ? "font-semibold" : "font-normal"
                                          )}>
                                            {voice}
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleTestTTS(lang.code)
                                          }}
                                          disabled={isLoading || !isConnected}
                                          className="h-7 px-2 gap-1 hover:bg-primary/10"
                                        >
                                          <SpeakerHigh size={14} />
                                          <span className="text-xs">Play</span>
                                        </Button>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                                      <p className="text-xs text-muted-foreground italic text-center">
                                        ⚠️ No voices available for this language with the current provider ({currentTtsProvider || 'unknown'})
                                      </p>
                                      <p className="text-xs text-muted-foreground text-center mt-1">
                                        Try switching to a different TTS provider above.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Test phrase preview */}
                                <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground italic border border-dashed">
                                  "{TEST_PHRASES[lang.code]?.substring(0, 50)}..."
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  })()}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={isSaved}>
              {isSaved ? "✓ Saved!" : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
