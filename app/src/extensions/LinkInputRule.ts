import { InputRule } from '@tiptap/core'
import type { MarkType } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'

/**
 * Matches markdown link syntax typed inline, e.g. `[background story](https://example.com)`.
 * Anchored to the end of the typed text (`$`) so it fires as soon as the closing `)` is typed.
 * Restricted to the same protocols the `Link` extension itself allows.
 */
export const MARKDOWN_LINK_TYPING_RE = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)$/

/**
 * Builds an input rule that converts typed markdown link syntax `[text](url)` into a real
 * link mark as soon as it's typed, mirroring how Bold/Italic markdown shortcuts (`**`, `*`)
 * already work while typing. Without this, `@tiptap/extension-link` only converts markdown
 * links on paste (via its built-in paste rule), never while typing.
 */
export function linkTypingInputRule(linkType: MarkType): InputRule {
  return new InputRule({
    find: MARKDOWN_LINK_TYPING_RE,
    handler: ({ state, range, match }) => {
      const [, text, href] = match
      if (!text || !href) return

      const { tr } = state
      tr.delete(range.from, range.to)
      tr.insertText(text, range.from)
      tr.addMark(range.from, range.from + text.length, linkType.create({ href }))
      tr.removeStoredMark(linkType)
    },
  })
}

/**
 * Builds a ProseMirror plugin that wraps a text selection in `[...]` when the user types the
 * opening bracket, instead of deleting the selection (the default browser/ProseMirror behavior
 * for typing over a selection). This lets a user select an existing word/phrase and start typing
 * markdown link syntax around it (`[`, then `](url)`) without losing the selected text — mirroring
 * how selecting text and typing `*`/`**` wraps it in italics/bold instead of replacing it.
 *
 * After wrapping, the cursor is placed right after the closing `]`, ready for the user to type
 * `(url)`, which `linkTypingInputRule` then converts into a real link mark.
 */
export function linkSelectionWrapPlugin(): Plugin {
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        if (text !== '[' || from === to) return false

        const { state } = view
        const { $from, $to } = state.selection
        if (!$from.sameParent($to)) return false

        const selectedText = state.doc.textBetween(from, to, '\0', '\0')
        if (!selectedText) return false

        const tr = state.tr
        tr.insertText(']', to)
        tr.insertText('[', from)
        tr.setSelection(TextSelection.create(tr.doc, to + 2))
        view.dispatch(tr.scrollIntoView())
        return true
      },
    },
  })
}

const LINK_TYPING_CONVERSION_META = 'linkTypingConversion'

/**
 * Builds a ProseMirror plugin that acts as a safety net for converting typed markdown link
 * syntax `[text](url)` into a real link mark, catching cases the character-driven
 * `linkTypingInputRule` misses.
 *
 * `linkTypingInputRule` only runs via ProseMirror's `handleTextInput` view prop, which fires once
 * per manually typed character. It is never consulted when text is inserted in bulk — e.g.
 * pasting a URL into `(...)` after wrapping an existing selection in `[...]`, browser
 * autocomplete/autofill, drag-and-drop, or any other multi-character insertion. In those cases the
 * markdown syntax is inserted correctly but never converts, leaving raw `[text](url)` on screen.
 *
 * This plugin instead inspects the document after every change (regardless of how it was made) and
 * converts a completed match right before the cursor, so the link mark is applied consistently no
 * matter how the syntax was entered.
 */
export function linkTypingConversionPlugin(linkType: MarkType): Plugin {
  return new Plugin({
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged)) return
      if (transactions.some((tr) => tr.getMeta(LINK_TYPING_CONVERSION_META))) return

      const { selection } = newState
      if (!selection.empty) return

      const $pos = selection.$from
      if ($pos.parent.type.spec.code) return

      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, '\0', '\0')
      const match = MARKDOWN_LINK_TYPING_RE.exec(textBefore)
      if (!match) return

      const [full, text, href] = match
      if (!text || !href) return

      const matchStart = selection.from - full.length
      const tr = newState.tr
      tr.delete(matchStart, selection.from)
      tr.insertText(text, matchStart)
      tr.addMark(matchStart, matchStart + text.length, linkType.create({ href }))
      tr.removeStoredMark(linkType)
      tr.setMeta(LINK_TYPING_CONVERSION_META, true)
      return tr
    },
  })
}
