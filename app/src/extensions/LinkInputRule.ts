import { InputRule } from '@tiptap/core'
import type { MarkType } from '@tiptap/pm/model'

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
