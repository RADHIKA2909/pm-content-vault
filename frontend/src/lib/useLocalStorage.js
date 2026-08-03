import { useEffect, useState } from 'react'

// Persisted UI preference. Reads once on mount so the first paint already has
// the stored value — a state that flips a frame later reads as a bug.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored === null ? initialValue : JSON.parse(stored)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Private browsing or a full quota — the preference just won't persist.
    }
  }, [key, value])

  return [value, setValue]
}
