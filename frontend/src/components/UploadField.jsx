import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

function UploadField({ accept, description, onFile }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        dragOver ? 'border-primary bg-primary-light' : 'border-border-subtle bg-muted hover:border-text-secondary'
      }`}
    >
      <UploadCloud className="mx-auto mb-2 h-6 w-6 text-text-secondary" strokeWidth={1.5} />
      <p className="text-sm text-text-secondary">{description}</p>
      <p className="mt-1 text-caption text-text-secondary/70">Click to browse or drag a file here</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default UploadField
