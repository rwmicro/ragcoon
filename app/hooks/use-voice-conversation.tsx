"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { franc } from "franc-min"

export type ConversationStatus = "idle" | "listening" | "processing" | "speaking"

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

interface UseVoiceConversationProps {
  onTranscript?: (text: string) => void
  onResponse?: (text: string) => void
  onError?: (error: string) => void
  apiUrl?: string
  silenceThreshold?: number // ms of silence before sending
  minSpeechDuration?: number // minimum ms of speech to consider
}

export function useVoiceConversation({
  onTranscript,
  onResponse,
  onError,
  apiUrl = process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8002",
  silenceThreshold = 1500, // 1.5s of silence
  minSpeechDuration = 500, // 0.5s minimum speech
}: UseVoiceConversationProps = {}) {
  const [status, setStatus] = useState<ConversationStatus>("idle")
  const [isActive, setIsActive] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [frequencyData, setFrequencyData] = useState<{
    bass: number
    mid: number
    treble: number
  }>({ bass: 0, mid: 0, treble: 0 })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  // VAD state
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const speechStartTimeRef = useRef<number | null>(null)
  const isSpeakingRef = useRef(false)
  const processingRef = useRef(false)

  // TTS state
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const ttsAudioContextRef = useRef<AudioContext | null>(null)

  // Analyze audio levels and detect speech
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isActive) {
      setAudioLevel(0)
      setFrequencyData({ bass: 0, mid: 0, treble: 0 })
      return
    }

    const analyser = analyserRef.current

    // Initialize data array if needed
    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
    }
    const dataArray = dataArrayRef.current
    analyser.getByteFrequencyData(dataArray)

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    const normalizedLevel = average / 255

    setAudioLevel(normalizedLevel)

    // Extract frequency bands (bass, mid, treble)
    const bufferLength = dataArray.length
    const bassEnd = Math.floor(bufferLength * 0.15) // 0-15% of spectrum
    const midEnd = Math.floor(bufferLength * 0.5) // 15-50% of spectrum
    // treble is 50-100%

    let bassSum = 0
    let midSum = 0
    let trebleSum = 0

    for (let i = 0; i < bufferLength; i++) {
      if (i < bassEnd) {
        bassSum += dataArray[i]
      } else if (i < midEnd) {
        midSum += dataArray[i]
      } else {
        trebleSum += dataArray[i]
      }
    }

    const bassAvg = bassSum / bassEnd / 255
    const midAvg = midSum / (midEnd - bassEnd) / 255
    const trebleAvg = trebleSum / (bufferLength - midEnd) / 255

    const currentFreqData = {
      bass: bassAvg,
      mid: midAvg,
      treble: trebleAvg,
    }

    setFrequencyData(currentFreqData)

    // Voice Activity Detection - use adaptive threshold based on frequency content
    // Voice is primarily in mid-range frequencies
    const voiceFreqLevel = currentFreqData.mid
    const speechThreshold = 0.015 // Lowered threshold for better sensitivity
    const isSpeaking = voiceFreqLevel > speechThreshold && normalizedLevel > 0.01

    if (isSpeaking && !processingRef.current) {
      // Speech detected
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true
        speechStartTimeRef.current = Date.now()
        setStatus("listening")
        console.log("🎤 Speech detected")
      }

      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    } else if (isSpeakingRef.current && !processingRef.current) {
      // Silence detected after speech
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          const speechDuration = Date.now() - (speechStartTimeRef.current || 0)

          if (speechDuration >= minSpeechDuration) {
            console.log(`🛑 Silence detected after ${speechDuration}ms of speech`)
            processAudio()
          } else {
            console.log(`⏭️  Speech too short (${speechDuration}ms), ignoring`)
          }

          isSpeakingRef.current = false
          speechStartTimeRef.current = null
          silenceTimerRef.current = null
        }, silenceThreshold)
      }
    }

    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio)
    }
  }, [isActive, silenceThreshold, minSpeechDuration])

  // Process recorded audio and send to STT
  const processAudio = useCallback(async () => {
    if (processingRef.current || !mediaRecorderRef.current || audioChunksRef.current.length === 0) {
      return
    }

    processingRef.current = true
    setStatus("processing")

    let audioContext: AudioContext | null = null

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
      console.log(`📦 Processing audio blob: ${audioBlob.size} bytes`)

      // Clear chunks for next recording
      audioChunksRef.current = []

      // Convert to float32 array
      const arrayBuffer = await audioBlob.arrayBuffer()
      audioContext = new AudioContext({ sampleRate: 16000 })
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const float32Array = audioBuffer.getChannelData(0)

      // Create a new blob with the float32 audio data
      const audioBlob2 = new Blob([float32Array.buffer as ArrayBuffer], { type: "audio/raw" })

      // Send to STT API using FormData
      const formData = new FormData()
      formData.append("audio_file", audioBlob2, "audio.raw")

      const response = await fetch(`${apiUrl}/api/voice/stt`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`STT API error: ${response.statusText}`)
      }

      const result = await response.json()
      const transcript = result.text?.trim()

      // Close AudioContext immediately after use
      await audioContext.close()

      if (transcript && transcript.length > 0) {
        console.log(`📝 Transcript: "${transcript}"`)
        onTranscript?.(transcript)
      } else {
        console.log("⚠️  Empty transcript, resuming listening")
        setStatus("listening")
      }
    } catch (error) {
      console.error("❌ Error processing audio:", error)
      onError?.("Failed to process audio")
      setStatus("listening")
      // Ensure AudioContext is closed even on error
      if (audioContext) {
        await audioContext.close().catch(() => {})
      }
    } finally {
      processingRef.current = false
    }
  }, [apiUrl, onTranscript, onError])

  // Speak response using TTS
  const speakResponse = useCallback(
    async (text: string, language?: string) => {
      // Auto-detect language if not provided
      const detectedLanguage = language || detectLanguage(text)
      console.log(`🔊 Speaking response in ${detectedLanguage}: "${text.substring(0, 50)}..."`)

      setStatus("speaking")

      try {
        // Stop any ongoing TTS
        audioSourcesRef.current.forEach((source) => {
          try {
            source.stop()
          } catch (e) {
            // Ignore
          }
        })
        audioSourcesRef.current = []

        // Call TTS API
        const response = await fetch(`${apiUrl}/api/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, language: detectedLanguage }),
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
        if (!ttsAudioContextRef.current) {
          ttsAudioContextRef.current = new AudioContext({ sampleRate })
        }

        // Create and play audio buffer
        const audioBuffer = ttsAudioContextRef.current.createBuffer(
          1,
          float32Array.length,
          sampleRate
        )
        audioBuffer.getChannelData(0).set(float32Array)

        const source = ttsAudioContextRef.current.createBufferSource()
        source.buffer = audioBuffer
        source.connect(ttsAudioContextRef.current.destination)

        audioSourcesRef.current.push(source)

        source.onended = () => {
          console.log("✅ TTS finished")
          setStatus("listening")
          audioSourcesRef.current = audioSourcesRef.current.filter((s) => s !== source)
        }

        source.start()
        console.log("🔊 Playing TTS response")
      } catch (error) {
        console.error("❌ TTS error:", error)
        onError?.("Failed to play response")
        setStatus("listening")
      }
    },
    [apiUrl, onError]
  )

  // Start the conversation mode
  const start = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      mediaStreamRef.current = stream

      // Setup audio analysis
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024 // Increased for better frequency resolution
      analyser.smoothingTimeConstant = 0.7 // Slightly less smoothing for more responsiveness
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Setup media recorder for continuous recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Start recording continuously in chunks
      mediaRecorder.start(100) // Record in 100ms chunks
      mediaRecorderRef.current = mediaRecorder

      setIsActive(true)
      setStatus("listening")

      // Start audio analysis
      analyzeAudio()

      console.log("🎙️ Voice conversation started")
    } catch (error) {
      console.error("Failed to start conversation:", error)
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          onError?.("Microphone access denied. Please allow microphone access.")
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          onError?.("No microphone found. Please connect a microphone.")
        } else {
          onError?.(`Microphone error: ${error.message}`)
        }
      }
    }
  }, [analyzeAudio, onError])

  // Stop the conversation mode
  const stop = useCallback(() => {
    console.log("🛑 Stopping voice conversation")

    setIsActive(false)
    setStatus("idle")

    // Clear timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Stop TTS
    audioSourcesRef.current.forEach((source) => {
      try {
        source.stop()
      } catch (e) {
        // Ignore
      }
    })
    audioSourcesRef.current = []

    if (ttsAudioContextRef.current) {
      ttsAudioContextRef.current.close()
      ttsAudioContextRef.current = null
    }

    // Reset state
    audioChunksRef.current = []
    isSpeakingRef.current = false
    speechStartTimeRef.current = null
    processingRef.current = false
    setAudioLevel(0)
    setFrequencyData({ bass: 0, mid: 0, treble: 0 })
    dataArrayRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  // Helper function to get frequency data for the orb
  const getFrequencyData = useCallback(() => {
    return frequencyData
  }, [frequencyData])

  return {
    status,
    isActive,
    audioLevel,
    frequencyData,
    start,
    stop,
    speakResponse,
    getFrequencyData,
  }
}
