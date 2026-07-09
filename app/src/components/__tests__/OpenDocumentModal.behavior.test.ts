import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('OpenDocumentModal delete/unpublish behavior', () => {
  const testDir = dirname(fileURLToPath(import.meta.url))
  const source = readFileSync(resolve(testDir, '../OpenDocumentModal.vue'), 'utf8')

  it('maps draft status to Delete and non-draft statuses to Unpublish', () => {
    expect(source).toMatch(/function actionForStatus\(status: DocStatus\): 'delete' \| 'unpublish'/)
    expect(source).toMatch(/return status === 'draft' \? 'delete' : 'unpublish'/)
  })

  it('includes destructive confirmation copy for deleting drafts', () => {
    expect(source).toContain('This permanently deletes the draft and cannot be undone.')
  })

  it('includes replacement warning when unpublishing changed documents', () => {
    expect(source).toContain('This replaces the current draft with the published version')
  })
})
