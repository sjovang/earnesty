import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const BLOCK_SETTINGS_EVENT = 'block-settings:open'

const pluginKey = new PluginKey('block-settings')

const COG_SVG = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="8" cy="8" r="2.2"/>
  <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06"/>
</svg>`

/** Renders a floating cogwheel button over image and code block nodes on hover. */
export const BlockSettings = Extension.create({
  name: 'blockSettings',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        view(editorView) {
          const btn = document.createElement('button')
          btn.innerHTML = COG_SVG
          btn.className = 'block-settings-cog'
          btn.setAttribute('aria-label', 'Block settings')
          btn.setAttribute('tabindex', '-1')
          btn.style.display = 'none'
          document.body.appendChild(btn)

          let hoverBlock: Element | null = null
          let hoverCog = false
          let currentPos = -1
          let currentType = ''

          function positionCog(el: Element) {
            const rect = el.getBoundingClientRect()
            btn.style.top = `${rect.top + 6}px`
            btn.style.left = `${rect.right - 32}px`
            btn.style.display = 'flex'
          }

          function hide() {
            if (hoverCog) return
            btn.style.display = 'none'
            hoverBlock = null
            currentPos = -1
            currentType = ''
          }

          function getPosFromElement(el: Element): number {
            // Use posAtCoords with the top-left of the element's bounding rect
            const rect = el.getBoundingClientRect()
            const result = editorView.posAtCoords({ left: rect.left + 1, top: rect.top + 1 })
            if (!result) return -1
            // result.inside is the position of the innermost node at those coords
            return result.inside !== -1 ? result.inside : result.pos
          }

          const onMousemove = (e: MouseEvent) => {
            const target = e.target as Element

            // Walk up from the target to find a configurable block element
            // (must be inside the editor)
            const imgEl = target.closest('img')
            const preEl = target.closest('pre')

            let blockEl: Element | null = null
            let nodeType = ''

            if (imgEl && editorView.dom.contains(imgEl)) {
              blockEl = imgEl
              nodeType = 'image'
            } else if (preEl && editorView.dom.contains(preEl)) {
              blockEl = preEl
              nodeType = 'codeBlock'
            }

            if (!blockEl) {
              hide()
              return
            }

            if (blockEl !== hoverBlock) {
              hoverBlock = blockEl
              currentType = nodeType
              currentPos = getPosFromElement(blockEl)
              positionCog(blockEl)
            }
          }

          const onMouseleave = (e: MouseEvent) => {
            // Only hide if leaving to something outside both the editor and cog
            const related = e.relatedTarget as Element | null
            if (related && (related === btn || btn.contains(related))) return
            hoverBlock = null
            setTimeout(() => { if (!hoverCog) hide() }, 80)
          }

          const onScroll = () => {
            // Reposition cog if a block is still hovered, otherwise hide
            if (hoverBlock) {
              positionCog(hoverBlock)
            }
          }

          btn.addEventListener('mouseenter', () => { hoverCog = true })
          btn.addEventListener('mouseleave', () => {
            hoverCog = false
            if (!hoverBlock) hide()
          })

          btn.addEventListener('click', (e) => {
            e.stopPropagation()
            const rect = btn.getBoundingClientRect()
            btn.dispatchEvent(
              new CustomEvent(BLOCK_SETTINGS_EVENT, {
                bubbles: true,
                detail: {
                  nodeType: currentType,
                  pos: currentPos,
                  x: rect.left,
                  y: rect.bottom + 6,
                },
              }),
            )
          })

          editorView.dom.addEventListener('mousemove', onMousemove)
          editorView.dom.addEventListener('mouseleave', onMouseleave)
          window.addEventListener('scroll', onScroll, { passive: true })

          return {
            destroy() {
              editorView.dom.removeEventListener('mousemove', onMousemove)
              editorView.dom.removeEventListener('mouseleave', onMouseleave)
              window.removeEventListener('scroll', onScroll)
              btn.remove()
            },
          }
        },
      }),
    ]
  },
})
