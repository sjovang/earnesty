import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

describe('base stylesheet', () => {
  const testDir = dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(resolve(testDir, '../base.css'), 'utf8')

  it('does not reserve a stable scrollbar gutter on the root html element', () => {
    const htmlRule = css.match(/html\s*\{[^}]*\}/)?.[0]

    expect(htmlRule).toBeTruthy()
    expect(htmlRule).not.toMatch(/scrollbar-gutter\s*:\s*stable\b/)
  })

  it('defines a reduced-motion override for animations and transitions', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
  })

  it('sets native control color-scheme per active theme', () => {
    expect(css).toMatch(/\[data-theme="light"]\s*\{[\s\S]*color-scheme:\s*light;/)
    expect(css).toMatch(/\[data-theme="dark"]\s*\{[\s\S]*color-scheme:\s*dark;/)
  })

  it('styles block settings trigger as a text+icon control with larger hit area', () => {
    expect(css).toMatch(/\.block-settings-cog\s*\{[\s\S]*min-width:\s*86px;/)
    expect(css).toMatch(/\.block-settings-cog\s*\{[\s\S]*min-height:\s*30px;/)
    expect(css).toMatch(/\.block-settings-cog\s*\{[\s\S]*gap:\s*0\.28rem;/)
    expect(css).toMatch(/\.block-settings-cog__label\s*\{[\s\S]*line-height:\s*1;/)
  })
})
