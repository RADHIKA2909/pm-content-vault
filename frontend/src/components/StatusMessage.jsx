const STYLES = {
  pending: 'text-slate-500',
  success: 'text-emerald-600',
  error: 'text-rose-600',
}

function StatusMessage({ status }) {
  if (!status) return null
  return <p className={`mt-3 text-sm ${STYLES[status.type]}`}>{status.message}</p>
}

export default StatusMessage
