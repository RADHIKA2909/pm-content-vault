const STYLES = {
  pending: 'text-text-secondary',
  success: 'text-success',
  error: 'text-warning',
}

function StatusMessage({ status }) {
  if (!status) return null
  return <p className={`mt-3 text-sm ${STYLES[status.type]}`}>{status.message}</p>
}

export default StatusMessage
