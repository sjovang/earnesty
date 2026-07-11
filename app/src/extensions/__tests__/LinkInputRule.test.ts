import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import {
  linkSelectionWrapPlugin,
  linkTypingConversionPlugin,
  linkTypingInputRule,
  MARKDOWN_LINK_TYPING_RE,
} from '../LinkInputRule'

function createEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.extend({
        addInputRules() {
          return [linkTypingInputRule(this.type)]
        },
        addProseMirrorPlugins() {
          return [linkSelectionWrapPlugin(), linkTypingConversionPlugin(this.type)]
        },
      }).configure({
        openOnClick: false,
        autolink: true,
        protocols: ['https', 'http', 'mailto'],
        validate: (url) => /^https?:\/\/|^mailto:/.test(url),
      }),
    ],
    content: '<p></p>',
  })
}

/**
 * Simulates a user typing `text` one character at a time. Tiptap's input rules are driven by
 * ProseMirror's `handleTextInput` view prop (normally fired by real DOM input events before the
 * browser inserts the character). For each character we call that prop directly; if no rule
 * matches (it returns falsy) we insert the character ourselves, just like the browser would.
 */
function typeText(editor: Editor, text: string) {
  const { view } = editor
  for (const char of text) {
    const pos = editor.state.selection.to
    const handled = view.someProp('handleTextInput', (handler) => handler(view, pos, pos, char))
    if (!handled) {
      editor.commands.insertContentAt(pos, char)
    }
  }
}

describe('linkTypingInputRule', () => {
  let editor: Editor

  afterEach(() => {
    editor?.destroy()
  })

  it('matches typed markdown link syntax', () => {
    expect(MARKDOWN_LINK_TYPING_RE.test('[background story](https://example.com)')).toBe(true)
    expect(MARKDOWN_LINK_TYPING_RE.test('[background story](https://example.com) more text')).toBe(false)
  })

  it('converts markdown link syntax into a link mark while typing', () => {
    editor = createEditor()
    typeText(editor, 'for context, read the background at [background story](https://example.com)')

    const html = editor.getHTML()
    expect(html).toContain('<a')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('background story')
    expect(html).not.toContain('[background story]')
    expect(html).not.toContain('(https://example.com)')
  })

  it('does not leave the link mark active for subsequently typed text', () => {
    editor = createEditor()
    typeText(editor, '[background story](https://example.com) and more')

    const html = editor.getHTML()
    const linkMatch = html.match(/<a[^>]*>([^<]*)<\/a>/)
    expect(linkMatch?.[1]).toBe('background story')
    expect(html).toContain('background story</a> and more')
  })

  it('supports mailto links typed inline', () => {
    editor = createEditor()
    typeText(editor, 'contact [me](mailto:me@example.com) today')

    const html = editor.getHTML()
    expect(html).toContain('href="mailto:me@example.com"')
    expect(html).toContain('>me</a>')
  })

  it('ignores disallowed protocols', () => {
    editor = createEditor()
    typeText(editor, '[click](javascript:alert(1))')

    const html = editor.getHTML()
    expect(html).not.toContain('<a')
  })

  it('preserves the following whitespace when wrapping a word mid-sentence', () => {
    editor = createEditor()
    editor.commands.setContent('<p>quick brown fox</p>')

    // Place the cursor right before "brown" and type the opening bracket.
    const wordStart = 1 + 'quick '.length
    const wordEnd = wordStart + 'brown'.length
    editor.commands.setTextSelection(wordStart)
    typeText(editor, '[')

    // Place the cursor right after "brown" (shifted by the bracket we just inserted)
    // and type the closing bracket + markdown URL syntax.
    editor.commands.setTextSelection(wordEnd + 1)
    typeText(editor, '](https://example.com)')

    const html = editor.getHTML()
    expect(html).toContain('<a')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('>brown</a> fox')
  })

  it('wraps a selected word in brackets instead of erasing it when typing "["', () => {
    editor = createEditor()
    editor.commands.setContent('<p>quick brown fox</p>')

    const wordStart = 1 + 'quick '.length
    const wordEnd = wordStart + 'brown'.length
    editor.commands.setTextSelection({ from: wordStart, to: wordEnd })

    const { view } = editor
    const handled = view.someProp('handleTextInput', (handler) =>
      handler(view, wordStart, wordEnd, '['),
    )
    expect(handled).toBe(true)
    expect(editor.getText()).toBe('quick [brown] fox')

    // Cursor should now sit right after "]", ready to type "(url)".
    typeText(editor, '(https://example.com)')

    const html = editor.getHTML()
    expect(html).toContain('<a')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('>brown</a> fox')
  })

  it('falls back to normal replacement when typing "[" with no selection', () => {
    editor = createEditor()
    editor.commands.setContent('<p>quick brown fox</p>')
    editor.commands.setTextSelection(1 + 'quick '.length)
    typeText(editor, '[')

    expect(editor.getText()).toBe('quick [brown fox')
  })

  it('converts a completed markdown link even when the url is inserted in one bulk chunk (e.g. pasted)', () => {
    editor = createEditor()
    editor.commands.setContent('<p>quick brown fox</p>')

    const wordStart = 1 + 'quick '.length
    const wordEnd = wordStart + 'brown'.length
    editor.commands.setTextSelection({ from: wordStart, to: wordEnd })

    // Wrap the selection via typed "[" (real keystroke path).
    const { view } = editor
    view.someProp('handleTextInput', (handler) => handler(view, wordStart, wordEnd, '['))
    expect(editor.getText()).toBe('quick [brown] fox')

    // Insert the rest as a single chunk, simulating a paste or browser autocomplete — this does
    // NOT go through handleTextInput, so linkTypingInputRule alone would never fire.
    const pos = editor.state.selection.to
    editor.commands.insertContentAt(pos, '(https://example.com)')

    const html = editor.getHTML()
    expect(html).toContain('<a')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('>brown</a> fox')
  })

  it('converts a pasted-in-full markdown link that replaces a selection', () => {
    editor = createEditor()
    editor.commands.setContent('<p>quick brown fox</p>')

    const wordStart = 1 + 'quick '.length
    const wordEnd = wordStart + 'brown'.length
    editor.commands.insertContentAt({ from: wordStart, to: wordEnd }, '[brown](https://example.com)')

    const html = editor.getHTML()
    expect(html).toContain('<a')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('>brown</a> fox')
  })
})
