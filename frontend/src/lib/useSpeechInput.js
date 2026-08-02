import { useEffect, useRef, useState } from 'react'

// Chrome and Safari both expose this prefixed; Firefox ships no implementation
// at all, which is why callers must respect `supported` and hide the mic there.
const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access is blocked — allow it in your browser settings.',
  'service-not-allowed': 'Microphone access is blocked — allow it in your browser settings.',
  'audio-capture': 'No microphone found.',
  network: 'Voice input needs a network connection.',
}

// A pause in speech isn't a failure — the session just ends and gets restarted,
// so neither of these should surface to the user or stop the mic.
const TRANSIENT_ERRORS = new Set(['no-speech', 'aborted'])

function join(before, after) {
  if (!before) return after
  if (!after) return before
  return `${before.replace(/\s+$/, '')} ${after}`
}

/**
 * Browser-native speech-to-text. Runs entirely in the browser — no audio is
 * sent to our backend and it costs nothing against the Gemini quota.
 *
 * Stays live until the user explicitly stops it: Chrome ends a recognition
 * session on its own after a short silence, so sessions are transparently
 * restarted and their transcripts concatenated into one continuous phrase.
 *
 * `onTranscript` fires with the full text so far — everything already in the
 * field when recording started, plus everything heard since.
 */
export function useSpeechInput({ onTranscript, lang = 'en-IN' } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  // Text carried over from before the in-flight session — whatever was already
  // typed, plus every session already folded in. Without this, each restart
  // would start from empty and wipe what the user had just dictated.
  const committedRef = useRef('')
  const sessionRef = useRef('')

  // Distinguishes "the user pressed stop" from "Chrome timed out on silence".
  // Only the former should actually end recording.
  const stoppedByUserRef = useRef(false)

  // Set by reset() so a result still in flight can't repopulate a field that
  // was just cleared. Tapping stop deliberately leaves this false, since a
  // final result legitimately arrives after stop() and belongs in the text.
  const discardedRef = useRef(false)

  // Held in a ref so the recognition instance below isn't rebuilt (and the
  // session interrupted) every time the parent re-renders with a new callback.
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  useEffect(() => {
    if (!SpeechRecognition) return undefined

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event) => {
      if (discardedRef.current) return

      // Results accumulate across the session, so rebuild the whole phrase each
      // time — otherwise the input shows disconnected fragments.
      sessionRef.current = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')
      onTranscriptRef.current?.(join(committedRef.current, sessionRef.current))
    }

    recognition.onerror = (event) => {
      if (TRANSIENT_ERRORS.has(event.error)) return

      // Anything else is fatal — flag it so onend doesn't restart into a loop.
      stoppedByUserRef.current = true
      setError(ERROR_MESSAGES[event.error] || 'Voice input failed — try typing instead.')
      setListening(false)
    }

    recognition.onend = () => {
      committedRef.current = join(committedRef.current, sessionRef.current)
      sessionRef.current = ''

      if (stoppedByUserRef.current) {
        setListening(false)
        return
      }

      // Chrome ended the session on a pause. Start a fresh one so the mic stays
      // on until the user taps it off.
      try {
        recognition.start()
      } catch {
        setListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.abort()
    }
  }, [lang])

  // `initialText` is whatever is already in the field, so dictation appends to
  // it rather than replacing it.
  const start = (initialText = '') => {
    setError(null)
    stoppedByUserRef.current = false
    discardedRef.current = false
    committedRef.current = initialText
    sessionRef.current = ''

    try {
      recognitionRef.current?.start()
      setListening(true)
    } catch {
      // start() throws if a session is already running — nothing to recover.
    }
  }

  // Tapping the mic off keeps the transcript — the user is reviewing it before
  // sending, so the text has to survive.
  const stop = () => {
    stoppedByUserRef.current = true
    recognitionRef.current?.stop()
  }

  // Ends recording and throws the transcript away, for when the text has been
  // handed off (sent) and the next recording should start from nothing.
  // `abort` rather than `stop` so no trailing result arrives after the reset.
  const reset = () => {
    stoppedByUserRef.current = true
    discardedRef.current = true
    committedRef.current = ''
    sessionRef.current = ''
    recognitionRef.current?.abort()
    setListening(false)
    setError(null)
  }

  return {
    supported: Boolean(SpeechRecognition),
    listening,
    error,
    reset,
    toggle: (currentText = '') => (listening ? stop() : start(currentText)),
  }
}
