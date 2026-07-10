import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const BLOCK_SETTINGS_EVENT = 'block-settings:open'

const pluginKey = new PluginKey('block-settings')

type BlockSettingsNodeType = 'image' | 'codeBlock' | 'link'

const COG_SVG = `<svg class="block-settings-cog__icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="8" cy="8" r="2.2"/>
  <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06"/>
</svg>`

const BLOCK_SETTINGS_LABELS: Record<BlockSettingsNodeType, string> = {
  link: 'Edit link',
  codeBlock: 'Edit code',
  image: 'Edit image',
}

export function getBlockSettingsButtonLabel(nodeType: BlockSettingsNodeType): string {
  return BLOCK_SETTINGS_LABELS[nodeType]
}

/** Renders a floating settings button over links, images, and code blocks on hover. */
export const BlockSettings = Extension.create({
  name: 'blockSettings',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        view(editorView) {
          const btn = document.createElement('button')
          const label = document.createElement('span')
          label.className = 'block-settings-cog__label'
          btn.innerHTML = COG_SVG
          btn.appendChild(label)
          btn.className = 'block-settings-cog'
          btn.setAttribute('tabindex', '-1')
          btn.type = 'button'
          btn.style.display = 'none'
          document.body.appendChild(btn)

          let hoverBlock: Element | null = null
          let hoverCog = false
          let currentPos = -1
          let currentType: BlockSettingsNodeType | null = null
          let hideTimer: ReturnType<typeof setTimeout> | null = null

          function updateButtonLabel(nodeType: BlockSettingsNodeType) {
            const buttonLabel = getBlockSettingsButtonLabel(nodeType)
            label.textContent = buttonLabel
            btn.setAttribute('aria-label', buttonLabel)
            btn.title = buttonLabel
          }

          function positionButton(el: Element) {
            btn.style.display = 'inline-flex'
            const btnRect = btn.getBoundingClientRect()
            const btnWidth = btnRect.width || 92
            const btnHeight = btnRect.height || 30

            if (currentType === 'link') {
              // Links are inline; place the button just after the link.
              const rects = el.getClientRects()
              const r = rects[rects.length - 1] ?? el.getBoundingClientRect()
              let left = r.right + 6
              if (left + btnWidth > window.innerWidth - 6) {
                left = Math.max(6, r.left - btnWidth - 6)
              }
              btn.style.top = `${r.top + (r.height - btnHeight) / 2}px`
              btn.style.left = `${left}px`
            } else {
              const rect = el.getBoundingClientRect()
              btn.style.top = `${rect.top + 6}px`
              btn.style.left = `${rect.right - btnWidth - 6}px`
            }
          }

          function cancelHide() {
            if (hideTimer) {
              clearTimeout(hideTimer)
              hideTimer = null
            }
          }

          function doHide() {
            btn.style.display = 'none'
            hoverBlock = null
            currentPos = -1
            currentType = null
          }

          // Delay hiding so the cursor can travel from the block/link to the cog
          // without the button disappearing mid-move.
          function scheduleHide() {
            cancelHide()
            hideTimer = setTimeout(() => {
              hideTimer = null
              if (!hoverCog) doHide()
            }, 120)
          }

          function getPosFromElement(el: Element, type: BlockSettingsNodeType): number {
            if (type === 'link') {
              // Links are inline marks: sample the centre of the link's first
              // line and use the precise text position (not the parent node).
              const rects = el.getClientRects()
              const r = rects[0] ?? el.getBoundingClientRect()
              const result = editorView.posAtCoords({
                left: r.left + r.width / 2,
                top: r.top + r.height / 2,
              })
              return result ? result.pos : -1
            }
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
            const linkEl = target.closest('a')

            let blockEl: Element | null = null
            let nodeType: BlockSettingsNodeType | null = null

            if (imgEl && editorView.dom.contains(imgEl)) {
              blockEl = imgEl
              nodeType = 'image'
            } else if (preEl && editorView.dom.contains(preEl)) {
              blockEl = preEl
              nodeType = 'codeBlock'
            } else if (linkEl && editorView.dom.contains(linkEl)) {
              blockEl = linkEl
              nodeType = 'link'
            }

            if (!blockEl || !nodeType) {
              scheduleHide()
              return
            }

            cancelHide()

            if (blockEl !== hoverBlock) {
              hoverBlock = blockEl
              currentType = nodeType
              updateButtonLabel(nodeType)
              currentPos = getPosFromElement(blockEl, nodeType)
              positionButton(blockEl)
            }
          }

          const onMouseleave = (e: MouseEvent) => {
            // Only hide if leaving to something outside both the editor and cog
            const related = e.relatedTarget as Element | null
            if (related && (related === btn || btn.contains(related))) return
            hoverBlock = null
            scheduleHide()
          }

          const onScroll = () => {
            // Reposition cog if a block is still hovered, otherwise hide
            if (hoverBlock) {
              positionButton(hoverBlock)
            }
          }

          btn.addEventListener('mouseenter', () => {
            hoverCog = true
            cancelHide()
          })
          btn.addEventListener('mouseleave', () => {
            hoverCog = false
            scheduleHide()
          })

          btn.addEventListener('click', (e) => {
            e.stopPropagation()
            if (!currentType) return
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
              cancelHide()
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
