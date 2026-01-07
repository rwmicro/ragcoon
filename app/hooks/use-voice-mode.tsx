"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type VoiceStatus = "idle" | "listening" | "processing" | "speaking"

interface UseVoiceModeProps {
  onTranscript?: (text: string, language: string) => void
  onError?: (error: string) => void
  apiUrl?: string
}

export function useVoiceMode({
  onTranscript,
  onError,
  apiUrl,
}: UseVoiceModeProps = {}) {
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [transcript, setTranscript] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Get API URL from settings or use default
  const getApiUrl = () => {
    if (apiUrl) return apiUrl

    // Only access localStorage on client side
    if (typeof window === 'undefined') return "ws://localhost:8002"

    try {
      const settings = localStorage.getItem("voiceSettings")
      if (settings) {
        const parsed = JSON.parse(settings)
        // Convert http to ws for WebSocket
        const httpUrl = parsed.apiUrl || process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8002"
        return httpUrl.replace(/^http/, 'ws')
      }
    } catch (e) {
      console.warn("Failed to read voice settings", e)
    }
    return "ws://localhost:8002"
  }

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const connectionErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const ttsAudioContextRef = useRef<AudioContext | null>(null) // Reusable TTS AudioContext
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const currentApiUrl = getApiUrl()
    const ws = new WebSocket(`${currentApiUrl}/api/voice/stream`)

    // Set a timeout to show error only if connection takes too long
    connectionErrorTimeoutRef.current = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket connection timeout")
        onError?.("Connection error")
        setIsConnected(false)
      }
    }, 3000) // Wait 3 seconds before showing error

    ws.onopen = () => {
      console.log("🔌 Voice WebSocket connected")
      setIsConnected(true)
      // Clear the error timeout since we connected successfully
      if (connectionErrorTimeoutRef.current) {
        clearTimeout(connectionErrorTimeoutRef.current)
        connectionErrorTimeoutRef.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === "transcript") {
          setTranscript(message.text)
          onTranscript?.(message.text, message.language)
          setStatus("idle")
        } else if (message.type === "audio_chunk") {
          // Handle TTS audio chunks
          playAudioChunk(message.data, message.sample_rate)
        } else if (message.type === "tts_start") {
          setStatus("speaking")
        } else if (message.type === "tts_complete") {
          setStatus("idle")
        } else if (message.type === "error") {
          console.error("Voice service error:", message.message)
          onError?.(message.message)
          setStatus("idle")
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error)
      }
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
      // Don't show error immediately, let the timeout handle it
      setIsConnected(false)
    }

    ws.onclose = () => {
      console.log("🔌 Voice WebSocket disconnected")
      setIsConnected(false)
      // Clear timeout on close
      if (connectionErrorTimeoutRef.current) {
        clearTimeout(connectionErrorTimeoutRef.current)
        connectionErrorTimeoutRef.current = null
      }
    }

    wsRef.current = ws
  }, [onTranscript, onError])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    // Clear any pending error timeout
    if (connectionErrorTimeoutRef.current) {
      clearTimeout(connectionErrorTimeoutRef.current)
      connectionErrorTimeoutRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Play audio chunk from base64
  const playAudioChunk = useCallback(
    async (audioBase64: string, sampleRate: number = 24000) => {
      try {
        // Stop any currently playing audio
        if (currentAudioSourceRef.current) {
          try {
            currentAudioSourceRef.current.stop()
          } catch (e) {
            // Already stopped
          }
          currentAudioSourceRef.current = null
        }

        // Decode base64 to array buffer
        const binaryString = atob(audioBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        // Reuse or create audio context
        if (!ttsAudioContextRef.current || ttsAudioContextRef.current.state === 'closed') {
          ttsAudioContextRef.current = new AudioContext({ sampleRate })
        }
        const audioContext = ttsAudioContextRef.current

        // Resume if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }

        // Convert int16 to float32
        const int16Array = new Int16Array(bytes.buffer)
        const float32Array = new Float32Array(int16Array.length)
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0
        }

        // Create audio buffer
        const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate)
        audioBuffer.getChannelData(0).set(float32Array)

        // Play audio
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)

        // Store reference for cleanup
        currentAudioSourceRef.current = source

        source.onended = () => {
          currentAudioSourceRef.current = null
          // Don't close the context, we'll reuse it
        }

        source.start()
      } catch (error) {
        console.error("Failed to play audio chunk:", error)
      }
    },
    []
  )

  // Analyze audio levels for visualization
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || status !== "listening") {
      setAudioLevel(0)
      return
    }

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    setAudioLevel(average / 255) // Normalize to 0-1

    if (status === "listening") {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio)
    }
  }, [status])

  // Start recording
  const startListening = useCallback(async () => {
    if (!isConnected) {
      onError?.("Not connected to voice service")
      connect()
      // Wait a bit for connection
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check connection again
      if (!isConnected) {
        onError?.("Failed to connect to voice service")
        return
      }
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Store stream reference for cleanup
      mediaStreamRef.current = stream

      // Setup audio analysis
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Start audio level analysis
      analyzeAudio()

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        let tempAudioContext: AudioContext | null = null

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          console.log(`📦 Audio blob size: ${audioBlob.size} bytes`)

          // Convert to float32 array and send to server
          const arrayBuffer = await audioBlob.arrayBuffer()
          tempAudioContext = new AudioContext({ sampleRate: 16000 })
          const audioBuffer = await tempAudioContext.decodeAudioData(arrayBuffer)

          // Get audio data as float32
          const float32Array = audioBuffer.getChannelData(0)
          console.log(`🔊 Audio samples: ${float32Array.length}`)

          // Convert Float32Array to base64 properly
          const bytes = new Uint8Array(float32Array.buffer)
          let binary = ''
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          const base64Audio = btoa(binary)

          console.log(`📤 Sending audio data (${base64Audio.length} chars)`)

          // Send to WebSocket
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "audio",
                data: base64Audio,
              })
            )
            setStatus("processing")
          } else {
            console.error("❌ WebSocket not connected, cannot send audio")
            onError?.("Connection lost")
            setStatus("idle")
          }

          // Cleanup temporary audio context
          await tempAudioContext.close()
        } catch (error) {
          console.error("❌ Error processing audio:", error)
          onError?.("Failed to process audio")
          setStatus("idle")

          // Ensure cleanup on error
          if (tempAudioContext) {
            await tempAudioContext.close().catch(() => {})
          }
        }
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setStatus("listening")

      console.log("🎤 Recording started")
    } catch (error) {
      console.error("Failed to start recording:", error)

      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          onError?.("Microphone access denied. Please allow microphone access in your browser settings.")
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          onError?.("No microphone found. Please connect a microphone and try again.")
        } else {
          onError?.(`Microphone error: ${error.message}`)
        }
      } else {
        onError?.("Failed to access microphone")
      }

      setStatus("idle")
    }
  }, [isConnected, connect, onError, analyzeAudio])

  // Stop recording
  const stopListening = useCallback(() => {
    console.log("🛑 Stopping recording...")

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    // Stop all media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log(`  Stopped track: ${track.kind}`)
      })
      mediaStreamRef.current = null
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Reset audio level
    setAudioLevel(0)
    console.log("✅ Recording stopped")
  }, [])

  // Speak text using TTS
  const speak = useCallback(
    (text: string, language: string = "en") => {
      if (!isConnected || !wsRef.current) {
        connect()
        // Wait a bit for connection
        setTimeout(() => {
          wsRef.current?.send(
            JSON.stringify({
              type: "tts",
              text,
              language,
            })
          )
        }, 500)
      } else {
        wsRef.current.send(
          JSON.stringify({
            type: "tts",
            text,
            language,
          })
        )
      }
    },
    [isConnected, connect]
  )

  // Stop animation frame when not listening
  useEffect(() => {
    if (status !== "listening" && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
      setAudioLevel(0)
    }
  }, [status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()

      // Stop any playing audio
      if (currentAudioSourceRef.current) {
        try {
          currentAudioSourceRef.current.stop()
        } catch (e) {
          // Already stopped
        }
      }

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Close audio contexts
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (ttsAudioContextRef.current) {
        ttsAudioContextRef.current.close()
      }

      // Clear timeout
      if (connectionErrorTimeoutRef.current) {
        clearTimeout(connectionErrorTimeoutRef.current)
      }
    }
  }, [disconnect])

  return {
    status,
    transcript,
    isConnected,
    audioLevel,
    startListening,
    stopListening,
    speak,
    connect,
    disconnect,
  }
}
