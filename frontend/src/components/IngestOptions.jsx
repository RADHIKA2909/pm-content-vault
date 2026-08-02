// The two choices every ingestion type offers: your own notes, and whether
// to spend an AI call summarizing this item. Kept in one place so all five
// sources stay consistent.
function IngestOptions({
  notes,
  onNotesChange,
  generateSummary,
  onGenerateSummaryChange,
  notesPlaceholder = 'Add your own notes (optional)...',
  summaryLabel = 'Generate AI summary for this',
}) {
  return (
    <>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        rows={3}
        className="resize-none rounded-xl border border-border-subtle p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder={notesPlaceholder}
      />

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={generateSummary}
          onChange={(e) => onGenerateSummaryChange(e.target.checked)}
          className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary"
        />
        {summaryLabel}
      </label>
    </>
  )
}

export default IngestOptions
