import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * @param dismissible  false removes the two accidental ways out — backdrop
 *   click and Escape — leaving the ✕ as the only close. For a modal holding
 *   unsaved work, a stray click on the page behind it should not be a way to
 *   lose it. Departs from the WAI-ARIA dialog pattern, which expects Escape to
 *   close; that is a deliberate trade for this one modal.
 * @param keepMounted  false unmounts the children on close, which is right for
 *   a confirm dialog and wrong for a multi-step form: unmounting is what
 *   discards a half-written draft. When true the subtree stays mounted and
 *   simply hides, so React state — including File objects, which no storage
 *   API would have preserved — is still there on reopen.
 */
function Modal({ open, onClose, title, children, size = 'md', dismissible = true, keepMounted = false }) {
  useEffect(() => {
    if (!open || !dismissible) return
    const handleKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose, dismissible])

  // Lock the page behind the modal. Without this the wheel scrolls the page
  // underneath, which makes the modal feel like it's floating loose.
  //
  // The padding compensates for the scrollbar the lock removes — otherwise the
  // whole page jumps sideways by its width the moment a modal opens.
  useEffect(() => {
    if (!open) return

    const { body } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [open])

  if (!open && !keepMounted) return null

  return (
    // `flex` and `hidden` are swapped rather than combined: both are display
    // utilities, so a element carrying both would be decided by stylesheet
    // order rather than by intent. Toggling which one is present makes hiding
    // unambiguous — and display:none is what keeps a hidden dialog out of the
    // accessibility tree and off the tab order while its state stays alive.
    <div
      className={`fixed inset-0 z-50 items-center justify-center bg-black/30 p-4 ${
        open ? 'flex' : 'hidden'
      }`}
      onClick={dismissible ? onClose : undefined}
    >
      {/* Announced as a dialog and named by its own heading. Without these a
          screen reader reads the contents as if they were part of the page
          behind it, with no indication that anything opened. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        // The entrance animation is attached only while open. Dropping the
        // class on close and re-adding it on open restarts the animation, so a
        // kept-mounted dialog still animates in on every reopen instead of
        // only the first.
        className={`max-h-[88vh] w-full overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl ${
          open ? 'animate-modalIn' : ''
        } ${size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-lg'}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="modal-title" className="text-lg font-semibold text-text-primary">
            {title}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-text-secondary hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
