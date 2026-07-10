import { describe, expect, it } from 'vitest'

import { getBlockSettingsButtonLabel } from '../BlockSettings'

describe('getBlockSettingsButtonLabel', () => {
  it('returns the link trigger label', () => {
    expect(getBlockSettingsButtonLabel('link')).toBe('Edit link')
  })

  it('returns the code block trigger label', () => {
    expect(getBlockSettingsButtonLabel('codeBlock')).toBe('Edit code')
  })

  it('returns the image trigger label', () => {
    expect(getBlockSettingsButtonLabel('image')).toBe('Edit image')
  })
})
