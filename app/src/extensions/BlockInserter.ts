import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const pluginKey = new PluginKey('block-inserter')

/** Dispatched on the editor DOM when the user clicks the "+" button. */
export const BLOCK_INSERTER_EVENT = 'block-inserter:open'

interface BlockInserterContext {
  parentTypeName: string
  depth: number
  isCollapsed: boolean
}

export function shouldShowBlockInserter(context: BlockInserterContext): boolean {
  return (
    context.parentTypeName === 'paragraph'
    && context.depth === 1
    && context.isCollapsed
  )
}

/**
 * Renders a "+" widget decoration in the left margin whenever the cursor sits
 * on a top-level paragraph. Clicking it dispatches a
 * `block-inserter:open` CustomEvent on the editor DOM element.
 */
export const BlockInserter = Extension.create({
  name: 'blockInserter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const { doc, selection } = state
            const { $head } = selection

            if (!shouldShowBlockInserter({
              parentTypeName: $head.parent.type.name,
              depth: $head.depth,
              isCollapsed: selection.empty,
            })) {
              return DecorationSet.empty
            }

            const pos = $head.before()

            const btn = document.createElement('button')
            btn.className = 'block-inserter-btn'
            btn.setAttribute('aria-label', 'Insert block')
            btn.setAttribute('tabindex', '-1')
            btn.textContent = '+'
            btn.addEventListener('mousedown', (e) => {
              e.preventDefault()
              const rect = btn.getBoundingClientRect()
              btn.dispatchEvent(
                new CustomEvent(BLOCK_INSERTER_EVENT, {
                  bubbles: true,
                  detail: { x: rect.right + 8, y: rect.top },
                }),
              )
            })

            return DecorationSet.create(doc, [
              Decoration.widget(pos, btn, { side: -1, key: 'block-inserter' }),
            ])
          },
        },
      }),
    ]
  },
})
