import Modal from './Modal.jsx'
import Button from './Button.jsx'

function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete' }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-sm text-text-secondary">{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
