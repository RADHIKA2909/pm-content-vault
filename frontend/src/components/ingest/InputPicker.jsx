import {
  Briefcase,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageCircle,
  NotebookPen,
  Type,
} from 'lucide-react'

// `kind` is the source_type the item is saved as, so these values are the
// contract with the backend, not just labels.
export const INPUT_METHODS = [
  { kind: 'note', label: 'Note', Icon: NotebookPen, blurb: 'Write your own thoughts' },
  { kind: 'text', label: 'Paste text', Icon: Type, blurb: 'Drop in any content' },
  { kind: 'link', label: 'Link', Icon: LinkIcon, blurb: "Paste a URL and we'll fetch it" },
  { kind: 'image', label: 'Screenshot', Icon: ImageIcon, blurb: 'We read the text in it' },
  { kind: 'pdf', label: 'PDF', Icon: FileText, blurb: 'Upload a document' },
  { kind: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, blurb: 'Import an exported chat' },
  { kind: 'question', label: 'Interview Q', Icon: HelpCircle, blurb: 'Save a question to practise' },
  { kind: 'job', label: 'Job posting', Icon: Briefcase, blurb: 'Track a role you want' },
]

function InputPicker({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="How do you want to add content?"
      className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
    >
      {INPUT_METHODS.map(({ kind, label, Icon, blurb }) => {
        const active = kind === value
        return (
          <button
            key={kind}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(kind)}
            className={`group flex items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active
                ? 'bg-primary-light shadow-card ring-1 ring-primary/25'
                : 'ring-1 ring-border-subtle hover:bg-muted'
            }`}
          >
            <span
              className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                active ? 'bg-primary text-white' : 'bg-muted text-text-secondary group-hover:text-text-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span
                className={`block truncate text-caption transition-colors duration-200 ${
                  active ? 'font-semibold text-primary' : 'font-medium text-text-primary'
                }`}
              >
                {label}
              </span>
              {/* The blurb answers "which one do I want?" without needing a
                  click — it was already defined here and never rendered. */}
              <span className="mt-0.5 block truncate text-[11px] leading-snug text-text-secondary">
                {blurb}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default InputPicker
