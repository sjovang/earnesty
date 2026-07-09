import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

describe('HomeView styles', () => {
  const testDir = dirname(fileURLToPath(import.meta.url))
  const source = readFileSync(resolve(testDir, '../HomeView.vue'), 'utf8')

  it('uses a one-sided accent stripe on blockquotes instead of a full border', () => {
    expect(source).toMatch(/\.editor__content\s*:deep\(\.ProseMirror blockquote\)\s*\{[^}]*border-left:/)
    expect(source).not.toMatch(/\.editor__content\s*:deep\(\.ProseMirror blockquote\)\s*\{[^}]*\bborder\s*:/)
  })
})
