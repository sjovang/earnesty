import type { Editor } from '@tiptap/core'
import { getMarkRange } from '@tiptap/core'

export interface LinkSelection {
  from: number
  to: number
  href: string
}

/**
 * Resolve the link mark covering the given document position, returning its
 * range and current href. Returns null when there is no link at that position.
 */
export function resolveLinkAt(editor: Editor, pos: number): LinkSelection | null {
  if (pos < 0) return null
  const linkMark = editor.state.schema.marks.link
  if (!linkMark) return null

  const resolved = editor.state.doc.resolve(pos)
  const range = getMarkRange(resolved, linkMark)
  if (!range) return null

  const mark = resolved.marks().find((m) => m.type === linkMark)
  const href = (mark?.attrs.href as string | null) ?? ''
  return { from: range.from, to: range.to, href }
}
