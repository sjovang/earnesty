import { describe, expect, it } from 'vitest'
import { shouldShowBlockInserter } from '../BlockInserter'

describe('shouldShowBlockInserter', () => {
  it('shows inserter on a top-level paragraph with a collapsed selection', () => {
    expect(
      shouldShowBlockInserter({
        parentTypeName: 'paragraph',
        depth: 1,
        isCollapsed: true,
      }),
    ).toBe(true)
  })

  it('hides inserter outside top-level paragraphs', () => {
    expect(
      shouldShowBlockInserter({
        parentTypeName: 'paragraph',
        depth: 2,
        isCollapsed: true,
      }),
    ).toBe(false)
    expect(
      shouldShowBlockInserter({
        parentTypeName: 'heading',
        depth: 1,
        isCollapsed: true,
      }),
    ).toBe(false)
  })

  it('hides inserter when selection is expanded', () => {
    expect(
      shouldShowBlockInserter({
        parentTypeName: 'paragraph',
        depth: 1,
        isCollapsed: false,
      }),
    ).toBe(false)
  })
})
