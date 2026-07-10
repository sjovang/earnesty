import { describe, expect, it, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { TextSelection } from '@tiptap/pm/state'

function makeEditor(html: string): Editor {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return new Editor({
    element,
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false })],
    content: html,
  })
}

// ── Source-code structural tests ───────────────────────────────────────────────

describe('LinkBubbleMenu source', () => {
  const testDir = dirname(fileURLToPath(import.meta.url))
  const source = readFileSync(resolve(testDir, '../LinkBubbleMenu.vue'), 'utf8')

  it('shouldShow includes editing.value so the bubble stays open while typing a URL', () => {
    expect(source).toContain('editing.value || linkActive.value || hasTextSelection.value')
  })

  it('startEdit saves the current selection into savedSelection', () => {
    // Both from and to must be captured.
    expect(source).toContain('savedSelection.value = { from, to }')
  })

  it('applyUrl uses setTextSelection to restore the saved range before calling setLink', () => {
    expect(source).toContain('setTextSelection({ from: savedSelection.value.from, to: savedSelection.value.to })')
    expect(source).toContain('.setLink({ href: url })')
  })

  it('uses :options prop (FloatingUI) instead of :tippy-options so onHide is wired correctly', () => {
    expect(source).not.toContain('tippy-options')
    expect(source).toContain(':options=')
    expect(source).toContain('onHide: onBubbleHide')
  })

  it('onBubbleHide clears savedSelection in addition to resetting editing', () => {
    // Both savedSelection.value = null and editing.value = false must appear in onBubbleHide.
    const fnMatch = source.match(/function onBubbleHide\(\)\s*\{([^}]+)\}/)
    expect(fnMatch).not.toBeNull()
    const body = fnMatch![1]
    expect(body).toContain('savedSelection.value = null')
    expect(body).toContain('editing.value = false')
  })
})

// ── Tiptap command-level tests ─────────────────────────────────────────────────

describe('LinkBubbleMenu applyUrl selection restoration logic', () => {
  let editor: Editor | null = null

  afterEach(() => {
    editor?.destroy()
    editor = null
  })

  it('applies a link to a previously saved selection range even when the current selection is empty', () => {
    editor = makeEditor('<p>hello world</p>')

    // Locate the word "world" (positions vary with document structure).
    let wordFrom = -1
    let wordTo = -1
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes('world')) {
        const offset = node.text.indexOf('world')
        wordFrom = pos + offset
        wordTo = wordFrom + 'world'.length
      }
    })
    expect(wordFrom).toBeGreaterThan(0)

    // Simulate the editor selection being lost (collapsed) — e.g. on mobile
    // when the virtual keyboard opens and clears the editor selection.
    const emptyTr = editor.state.tr.setSelection(
      TextSelection.create(editor.state.doc, wordFrom),
    )
    editor.view.dispatch(emptyTr)
    expect(editor.state.selection.empty).toBe(true)

    // applyUrl equivalent: restore saved selection, then apply link.
    editor
      .chain()
      .focus()
      .setTextSelection({ from: wordFrom, to: wordTo })
      .setLink({ href: 'https://example.com' })
      .run()

    // The link mark should now cover "world".
    const linkMark = editor.state.schema.marks.link
    let linkFound = false
    editor.state.doc.descendants((node, pos) => {
      if (
        node.isText
        && node.text === 'world'
        && node.marks.some((m) => m.type === linkMark && m.attrs.href === 'https://example.com')
      ) {
        linkFound = true
      }
      void pos
    })
    expect(linkFound).toBe(true)
  })

  it('does NOT apply a link when the selection is collapsed and no range is restored', () => {
    editor = makeEditor('<p>hello world</p>')

    // Collapse the cursor somewhere in "world".
    let wordFrom = -1
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes('world')) {
        wordFrom = pos + node.text.indexOf('world')
      }
    })
    const emptyTr = editor.state.tr.setSelection(
      TextSelection.create(editor.state.doc, wordFrom),
    )
    editor.view.dispatch(emptyTr)
    expect(editor.state.selection.empty).toBe(true)

    // Without restoring the selection, setLink is a no-op.
    editor.chain().focus().setLink({ href: 'https://example.com' }).run()

    const linkMark = editor.state.schema.marks.link
    let linkFound = false
    editor.state.doc.descendants((node) => {
      if (node.isText && node.marks.some((m) => m.type === linkMark)) {
        linkFound = true
      }
    })
    expect(linkFound).toBe(false)
  })
})
