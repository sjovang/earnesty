import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

describe('base stylesheet', () => {
  it('does not reserve a stable scrollbar gutter on the root html element', () => {
    const testDir = dirname(fileURLToPath(import.meta.url))
    const css = readFileSync(resolve(testDir, '../base.css'), 'utf8')
    const htmlRule = css.match(/html\s*\{[^}]*\}/)?.[0]

    expect(htmlRule).toBeTruthy()
    expect(htmlRule).not.toMatch(/scrollbar-gutter\s*:\s*stable\b/)
  })
})
