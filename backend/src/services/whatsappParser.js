// Parses a WhatsApp "Export Chat" .txt file into discrete messages.
// Handles the common "DD/MM/YYYY, HH:MM - Sender: message" line format,
// folding multi-line messages into the preceding entry.
const MESSAGE_START = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?:\s?[APMapm]{2})?)\s-\s([^:]+):\s(.*)$/

const NOISE_PATTERNS = [/end-to-end encrypted/i, /^<Media omitted>$/i, /^This message was deleted$/i]

function isNoise(text) {
  return NOISE_PATTERNS.some((pattern) => pattern.test(text.trim()))
}

export function parseWhatsappExport(rawText) {
  const lines = rawText.split(/\r?\n/)
  const messages = []

  for (const line of lines) {
    const match = line.match(MESSAGE_START)

    if (match) {
      const [, , , sender, message] = match
      messages.push({ sender: sender.trim(), text: message.trim(), raw: line })
    } else if (messages.length > 0 && line.trim()) {
      // Continuation of the previous multi-line message.
      const last = messages[messages.length - 1]
      last.text += `\n${line.trim()}`
      last.raw += `\n${line}`
    }
  }

  return messages
    .filter((m) => m.text && !isNoise(m.text))
    .map((m) => ({
      sourceType: 'whatsapp_export',
      rawContent: m.raw,
      extractedText: `${m.sender}: ${m.text}`,
    }))
}
