import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

describe('HomeView styles', () => {
  const testDir = dirname(fileURLToPath(import.meta.url))
  const source = readFileSync(resolve(testDir, '../HomeView.vue'), 'utf8')

  it('does not use a one-sided accent stripe on blockquotes', () => {
    expect(source).not.toMatch(/\.editor__content\s*:deep\(\.ProseMirror blockquote\)\s*\{[\s\S]*border-left:/)
  })
})
