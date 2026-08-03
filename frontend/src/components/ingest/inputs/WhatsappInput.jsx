import { Info, MessageCircle, X } from 'lucide-react'
import UploadField from '../../UploadField.jsx'
import CategoryPicker from '../../CategoryPicker.jsx'
import { Panel, Field, inputClass } from './SimpleInputs.jsx'

/**
 * The one input that doesn't fit the analyse-then-review shape.
 *
 * An export becomes many items at once, so there is nothing single to review —
 * reviewing forty messages one at a time is worse than not reviewing at all.
 * This path imports the batch and reports what happened, and the flow says so
 * rather than implying a review step that isn't coming.
 */
function WhatsappInput({ file, onFile, notes, onNotesChange, categories, onCategoriesChange }) {
  return (
    <Panel title="Import a WhatsApp export" hint="Each useful message becomes its own item in your vault.">
      {!file ? (
        <>
          <UploadField accept=".txt,text/plain" description="The .txt file from Export Chat" onFile={onFile} />
          <div className="mt-3 flex gap-2.5 rounded-xl bg-primary-light/50 p-3">
            <Info className="mt-px h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
            <div className="text-caption text-text-secondary">
              <p className="font-medium text-text-primary">How to get the file</p>
              <p className="mt-0.5">
                In WhatsApp, open the chat → ⋮ → More → Export chat → Without media. Send it to yourself and
                upload the .txt here.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-card ring-1 ring-border-subtle">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
              <p className="text-caption text-text-secondary">{Math.round(file.size / 1024)} KB export</p>
            </div>
            <button
              onClick={() => onFile(null)}
              aria-label="Remove file"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </div>

          <p className="rounded-xl bg-muted/60 px-3 py-2 text-caption text-text-secondary">
            Because an export becomes many items at once, this one skips the review step — you'll get a summary
            of what was imported instead.
          </p>

          <div>
            <span className="mb-1 block text-caption font-medium text-text-primary">
              Categories for everything imported
            </span>
            <CategoryPicker value={categories} onChange={onCategoriesChange} label="" />
          </div>

          <Field label="A note on the whole import (optional)">
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              placeholder="Which group this came from, what it's about..."
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      )}
    </Panel>
  )
}

export default WhatsappInput
