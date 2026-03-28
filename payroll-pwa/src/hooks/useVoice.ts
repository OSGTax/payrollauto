import { useCallback, useRef, useState } from 'react'

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type SRConstructor = new () => SpeechRecognitionLike

function getSR(): SRConstructor | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SRConstructor | null
}

export function useVoice(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  const toggle = useCallback(() => {
    if (listening && recRef.current) {
      recRef.current.stop()
      setListening(false)
      return
    }

    const SR = getSR()
    if (!SR) return

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? ''
      if (text) onResult(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    recRef.current = rec
    rec.start()
    setListening(true)
  }, [listening, onResult])

  const supported = typeof window !== 'undefined' && !!getSR()

  return { listening, toggle, supported }
}
