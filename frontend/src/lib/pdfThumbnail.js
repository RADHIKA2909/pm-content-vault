// Rendering happens in the browser, the same way OCR does for images. The
// server-side alternative needs node-canvas, a native dependency that has to
// be compiled per platform — not worth it for a card preview.
//
// pdf.js is ~350kB, so it's loaded on demand rather than bundled into the
// initial payload: only someone uploading a PDF ever pays for it.
let pdfjsPromise = null

function loadPdfjs() {
  pdfjsPromise ??= (async () => {
    const [pdfjsLib, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjsLib
  })()

  return pdfjsPromise
}

// Wide enough to stay sharp on a card without producing a huge upload.
const TARGET_WIDTH = 600

/**
 * Renders page 1 of a PDF to a PNG blob for use as the Library card image.
 * Returns null if the PDF can't be read — a missing preview should never
 * stop the file itself from being saved.
 */
export async function renderPdfFirstPage(file) {
  try {
    const pdfjsLib = await loadPdfjs()
    const data = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data }).promise
    const page = await pdf.getPage(1)

    const baseViewport = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: TARGET_WIDTH / baseViewport.width })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const canvasContext = canvas.getContext('2d')
    // PDFs have no background of their own; without this, transparent areas
    // render black.
    canvasContext.fillStyle = '#ffffff'
    canvasContext.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvas, canvasContext, viewport }).promise

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch {
    return null
  }
}
