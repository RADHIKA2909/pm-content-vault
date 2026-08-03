/**
 * Label and description on the left, the control on the right.
 *
 * Wraps rather than truncating below `sm`: a preference whose explanation is
 * cut off is a preference you have to guess at, and these are the descriptions
 * that say what the control actually does.
 */
function SettingRow({ label, description, children }) {
  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-body font-medium text-text-primary">{label}</p>
        {description && <p className="mt-0.5 text-caption text-text-secondary">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default SettingRow
