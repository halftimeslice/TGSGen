// PDF export: rasterize the TGS diagram SVG at high resolution and place it
// on a landscape A4 page. The diagram carries its own title block, zone bar,
// notes and legend, so the page needs no extra chrome.

import { jsPDF } from 'jspdf'

export async function exportSvgToPdf(svg: SVGSVGElement, filename: string): Promise<void> {
  const vb = svg.viewBox.baseVal
  const w = vb && vb.width > 0 ? vb.width : svg.clientWidth
  const h = vb && vb.height > 0 ? vb.height : svg.clientHeight

  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not render the diagram for export'))
      img.src = url
    })

    // Render at least ~2500px wide so text stays crisp when printed
    const scale = Math.max(2, 2500 / w)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')
    ctx.fillStyle = '#09090b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const png = canvas.toDataURL('image/png')

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 8
    let drawW = pageW - margin * 2
    let drawH = drawW * (h / w)
    if (drawH > pageH - margin * 2) {
      drawH = pageH - margin * 2
      drawW = drawH * (w / h)
    }
    pdf.addImage(png, 'PNG', (pageW - drawW) / 2, (pageH - drawH) / 2, drawW, drawH)
    pdf.save(filename)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function tgsPdfFilename(tgsNumber: string, roadName: string | null): string {
  const base = tgsNumber.trim() || `TGS-${roadName ?? 'export'}`
  return `${base.replace(/[^\w-]+/g, '-')}.pdf`
}
