import { forwardRef } from 'react'
import RichTextEditor from '../../RichTextEditor.jsx'

// Shared shell so every panel gets the same heading rhythm without each one
// re-deciding its own spacing.
export function Panel({ title, hint, children }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
      {hint && <p className="mt-0.5 text-caption text-text-secondary">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

export function Field({ label, optional, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-medium text-text-primary">
        {label}
        {optional && <span className="ml-1 font-normal text-text-secondary">optional</span>}
      </span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl bg-surface px-3 py-2.5 text-body text-text-primary shadow-card ring-1 ring-border-subtle transition-all duration-200 placeholder:text-text-secondary hover:ring-text-secondary/30 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] focus:outline-none focus:ring-2 focus:ring-primary'

// Covers both writing and pasting since the two merged. There is no separate
// "add your thoughts" box here on purpose: in a note, the thought is the
// content, and a second field would only ask where a given sentence belongs.
export const NoteInput = forwardRef(function NoteInput(_props, ref) {
  return (
    <Panel
      title="Write or paste"
      hint="Your own thinking, or anything you want to keep — format it, paste images, drop in links."
    >
      <RichTextEditor
        ref={ref}
        placeholder="Today's learning, or paste a post, an article, a transcript..."
        minHeight="min-h-[240px]"
      />
    </Panel>
  )
})

export function QuestionInput({ value, onChange, notes, onNotesChange }) {
  return (
    <Panel title="Save an interview question" hint="Keep the question as you'd be asked it. Filed under Interview Questions.">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        autoFocus
        placeholder="How would you improve Uber Eats?"
        className={`${inputClass} resize-y text-[17px] leading-relaxed`}
      />
      <div className="mt-3">
        <Field label="Your approach or notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Structure, frameworks to use, things to remember..."
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>
    </Panel>
  )
}

export function JobInput({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <Panel title="Track a job posting" hint="Filed under Job Postings, and searchable with everything else.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Role">
          <input
            value={value.role}
            onChange={(e) => set({ role: e.target.value })}
            autoFocus
            placeholder="Product Manager"
            className={inputClass}
          />
        </Field>
        <Field label="Company">
          <input
            value={value.company}
            onChange={(e) => set({ company: e.target.value })}
            placeholder="Google"
            className={inputClass}
          />
        </Field>
        <Field label="Application link" optional>
          <input
            value={value.applyUrl}
            onChange={(e) => set({ applyUrl: e.target.value })}
            type="url"
            placeholder="https://..."
            className={inputClass}
          />
        </Field>
        <Field label="Salary" optional>
          <input
            value={value.salary}
            onChange={(e) => set({ salary: e.target.value })}
            placeholder="₹40–55 LPA"
            className={inputClass}
          />
        </Field>
        <Field label="Deadline" optional>
          <input
            value={value.deadline}
            onChange={(e) => set({ deadline: e.target.value })}
            type="date"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Notes (optional)">
          <textarea
            value={value.notes}
            onChange={(e) => set({ notes: e.target.value })}
            rows={3}
            placeholder="Requirements, referral contact, why you want it..."
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>
    </Panel>
  )
}
