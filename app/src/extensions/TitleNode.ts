import { Node, mergeAttributes } from '@tiptap/core'

export const TitleNode = Node.create({
  name: 'title',
  content: 'inline*',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'h1[data-type="title"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['h1', mergeAttributes(HTMLAttributes, { 'data-type': 'title' }), 0]
  },

  addKeyboardShortcuts() {
    return {
      // Enter in the title moves cursor to the first body block.
      // The title is a single-line field — we never split it.
      Enter: ({ editor }) => {
        if (!editor.isActive(this.name)) return false
        const { $head } = editor.state.selection
        const after = $head.after()
        if (after < editor.state.doc.content.size) {
          return editor.commands.setTextSelection(after + 1)
        }
        return false
      },
    }
  },
})
