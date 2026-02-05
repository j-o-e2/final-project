"use client"

import { useEffect } from "react"

export default function DebugOpaqueInspector() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (!params.get('dbgbg')) return

      const found: Array<{ el: Element; reason: string }> = []
      const all = Array.from(document.querySelectorAll('body *'))

      all.forEach((el) => {
        try {
          const cs = window.getComputedStyle(el)
          const bg = cs.backgroundColor || ''
          const img = cs.backgroundImage || ''
          const opacity = Number(cs.opacity || '1')

          // consider opaque background-color or background-image as blocking
          const hasOpaqueBg = (bg && !bg.includes('transparent') && !bg.includes('rgba(0, 0, 0, 0)') && !bg.includes('rgba(0,0,0,0)'))
          const bgAlphaMatch = bg.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/)
          const alpha = bgAlphaMatch ? Number(bgAlphaMatch[1]) : (hasOpaqueBg ? 1 : 0)

          if ((img && img !== 'none') || (alpha >= 0.9) || (opacity >= 0.99 && alpha > 0.6)) {
            found.push({ el, reason: img && img !== 'none' ? 'background-image' : `bg-color alpha=${alpha} opacity=${opacity}` })
          }
        } catch (e) {
          // ignore
        }
      })

      // Outline found elements
      found.forEach(({ el }, idx) => {
        try {
          const node = el as HTMLElement
          node.style.outline = '2px dashed rgba(255,0,0,0.85)'
          node.style.outlineOffset = '-4px'
          node.style.boxShadow = '0 0 0 3px rgba(255,0,0,0.06)'
          node.style.zIndex = '9999'
          node.dataset.__debugOpaqueInspector = 'true'
        } catch {}
      })

      console.group('[DebugOpaqueInspector] Opaque/background elements')
      if (found.length === 0) console.log('No blocking elements detected (alpha threshold)')
      found.slice(0, 200).forEach(({ el, reason }, i) => {
        console.log(`#${i + 1}:`, el, reason)
      })
      console.groupEnd()
    } catch (e) {
      console.error('DebugOpaqueInspector failed', e)
    }
  }, [])

  return null
}
