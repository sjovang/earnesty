import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { apiCheckGrammar, type GrammarMatch } from '../services/api'

interface GrammarAssistOptions {
  debounceMs: number
  language: string
}

interface GrammarAssistStorage {
  enabled: boolean
  issueCount: number
  lastError: string | null
}

interface GrammarAssistState {
  decorations: DecorationSet
  enabled: boolean
  issueCount: number
  lastError: string | null
}

const grammarAssistPluginKey = new PluginKey<GrammarAssistState>('grammarAssist')

const grammarIssueMeta = 'grammarAssistIssueUpdate'
const grammarStatusMeta = 'grammarAssistStatusUpdate'

type TextRange = { from: number; to: number; text: string }

function textRanges(doc: ProseMirrorNode): TextRange[] {
  const ranges: TextRange[] = []
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    ranges.push({
      from: pos,
      to: pos + node.text.length,
      text: node.text,
    })
  })
  return ranges
}

function matchToDecoration(
  match: GrammarMatch,
  plainTextLength: number,
  ranges: TextRange[],
): Decoration | null {
  if (match.offset < 0 || match.length <= 0 || match.offset + match.length > plainTextLength) {
    return null
  }

  const startTarget = match.offset
  const endTarget = match.offset + match.length
  let offsetCursor = 0
  let fromPos: number | null = null
  let toPos: number | null = null

  for (const range of ranges) {
    const nextCursor = offsetCursor + range.text.length
    if (fromPos === null && startTarget >= offsetCursor && startTarget <= nextCursor) {
      fromPos = range.from + (startTarget - offsetCursor)
    }
    if (endTarget >= offsetCursor && endTarget <= nextCursor) {
      toPos = range.from + (endTarget - offsetCursor)
      break
    }
    offsetCursor = nextCursor
  }

  if (fromPos === null || toPos === null || fromPos >= toPos) return null
  return Decoration.inline(fromPos, toPos, {
    class: 'grammar-assist__issue',
    'data-grammar-issue-type': match.rule.issueType,
    'data-grammar-rule-id': match.rule.id,
  })
}

function decorationPayload(doc: ProseMirrorNode, matches: GrammarMatch[]): Decoration[] {
  const plainText = doc.textBetween(0, doc.content.size, '\n', '\n')
  const ranges = textRanges(doc)
  const decorations: Decoration[] = []

  for (const match of matches) {
    const decoration = matchToDecoration(match, plainText.length, ranges)
    if (decoration) decorations.push(decoration)
  }

  return decorations
}

export const GrammarAssist = Extension.create<GrammarAssistOptions, GrammarAssistStorage>({
  name: 'grammarAssist',

  addOptions() {
    return {
      debounceMs: 450,
      language: 'en',
    }
  },

  addStorage() {
    return {
      enabled: false,
      issueCount: 0,
      lastError: null,
    }
  },

  addCommands() {
    return {
      setGrammarAssistEnabled:
        (enabled: boolean) =>
        ({ tr }) => {
          tr.setMeta(grammarStatusMeta, { enabled })
          return true
        },
      refreshGrammarAssist:
        () =>
        ({ tr }) => {
          tr.setMeta(grammarIssueMeta, { force: true })
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<GrammarAssistState>({
        key: grammarAssistPluginKey,
        state: {
          init: (_, state) => ({
            decorations: DecorationSet.create(state.doc, []),
            enabled: false,
            issueCount: 0,
            lastError: null,
          }),
          apply: (tr, value, _oldState, newState) => {
            const mappedDecorations = value.decorations.map(tr.mapping, tr.doc)
            const status = tr.getMeta(grammarStatusMeta) as { enabled?: boolean } | undefined
            const issues = tr.getMeta(grammarIssueMeta) as {
              matches?: GrammarMatch[]
              error?: string | null
            } | undefined

            const enabled = status?.enabled ?? value.enabled
            const matches = issues?.matches
            const nextDecorations = matches
              ? DecorationSet.create(newState.doc, decorationPayload(newState.doc, matches))
              : (enabled ? mappedDecorations : DecorationSet.empty)

            const issueCount = matches ? matches.length : value.issueCount
            const lastError = issues?.error ?? value.lastError
            return { decorations: nextDecorations, enabled, issueCount, lastError }
          },
        },
        props: {
          decorations(state) {
            const pluginState = grammarAssistPluginKey.getState(state)
            if (!pluginState?.enabled) return DecorationSet.empty
            return pluginState.decorations
          },
        },
        view: (view) => {
          let disposed = false
          let timer: ReturnType<typeof setTimeout> | null = null

          const runCheck = async () => {
            if (disposed) return
            const state = grammarAssistPluginKey.getState(view.state)
            if (!state?.enabled) return

            const text = view.state.doc.textBetween(0, view.state.doc.content.size, '\n', '\n').trim()
            if (!text) {
              const tr = view.state.tr.setMeta(grammarIssueMeta, { matches: [], error: null })
              view.dispatch(tr)
              return
            }

            try {
              const result = await apiCheckGrammar(text, this.options.language)
              if (disposed) return
              const tr = view.state.tr.setMeta(grammarIssueMeta, {
                matches: result.matches,
                error: null,
              })
              view.dispatch(tr)
            } catch (error) {
              if (disposed) return
              const message = error instanceof Error ? error.message : 'Grammar check failed'
              const tr = view.state.tr.setMeta(grammarIssueMeta, { error: message })
              view.dispatch(tr)
            }
          }

          const scheduleCheck = () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
              timer = null
              void runCheck()
            }, this.options.debounceMs)
          }

          return {
            update: (updatedView, prevState) => {
              const pluginState = grammarAssistPluginKey.getState(updatedView.state)
              const prevPluginState = grammarAssistPluginKey.getState(prevState)
              if (!pluginState) return

              this.storage.enabled = pluginState.enabled
              this.storage.issueCount = pluginState.issueCount
              this.storage.lastError = pluginState.lastError

              if (!pluginState.enabled) {
                if (timer) {
                  clearTimeout(timer)
                  timer = null
                }
                return
              }

              if (updatedView.state.doc !== prevState.doc || !prevPluginState?.enabled) {
                scheduleCheck()
              }
            },
            destroy: () => {
              disposed = true
              if (timer) clearTimeout(timer)
            },
          }
        },
      }),
    ]
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    grammarAssist: {
      setGrammarAssistEnabled: (enabled: boolean) => ReturnType
      refreshGrammarAssist: () => ReturnType
    }
  }
}
