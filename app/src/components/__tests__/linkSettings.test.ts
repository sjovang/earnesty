import { describe, expect, it, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { resolveLinkAt } from '../linkSettings'

function makeEditor(html: string): Editor {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return new Editor({
    element,
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false })],
    content: html,
  })
}

describe('resolveLinkAt', () => {
  let editor: Editor | null = null

  afterEach(() => {
    editor?.destroy()
    editor = null
  })

  it('returns the link range and href for a position inside a link', () => {
    editor = makeEditor('<p>before <a href="https://example.com">link text</a> after</p>')
    // Find a document position that actually carries the link mark.
    const linkMark = editor.state.schema.marks.link
    let posInsideLink = -1
    editor.state.doc.descendants((node, pos) => {
      if (posInsideLink === -1 && node.isText && node.marks.some((m) => m.type === linkMark)) {
        posInsideLink = pos + 1
      }
    })
    expect(posInsideLink).toBeGreaterThan(0)

    const result = resolveLinkAt(editor, posInsideLink)
    expect(result).not.toBeNull()
    expect(result?.href).toBe('https://example.com')

    const covered = editor.state.doc.textBetween(result!.from, result!.to)
    expect(covered).toBe('link text')
  })

  it('returns null when the position is not inside a link', () => {
    editor = makeEditor('<p>plain paragraph with no link</p>')
    expect(resolveLinkAt(editor, 3)).toBeNull()
  })

  it('returns null for a negative position', () => {
    editor = makeEditor('<p><a href="https://example.com">link</a></p>')
    expect(resolveLinkAt(editor, -1)).toBeNull()
  })
})
