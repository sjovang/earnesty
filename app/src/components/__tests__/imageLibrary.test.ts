import { describe, expect, it } from 'vitest'
import { clampPage, paginateImages, sortLibraryImages, type ImageSortKey } from '../imageLibrary'
import type { ImageAsset } from '../../services/api'

function makeImage(assetRef: string, createdAt: string): ImageAsset {
  return {
    assetRef,
    url: `https://cdn.sanity.io/${assetRef}.jpg`,
    width: 100,
    height: 100,
    createdAt,
  }
}

describe('sortLibraryImages', () => {
  const images = [
    makeImage('image-c', '2024-01-03T12:00:00.000Z'),
    makeImage('image-a', '2024-01-01T12:00:00.000Z'),
    makeImage('image-b', '2024-01-02T12:00:00.000Z'),
  ]

  it.each([
    ['newest', ['image-c', 'image-b', 'image-a']],
    ['oldest', ['image-a', 'image-b', 'image-c']],
    ['name-asc', ['image-a', 'image-b', 'image-c']],
    ['name-desc', ['image-c', 'image-b', 'image-a']],
  ] as [ImageSortKey, string[]][])('sorts %s as expected', (sortKey, expected) => {
    const sorted = sortLibraryImages(images, sortKey).map((item) => item.assetRef)
    expect(sorted).toEqual(expected)
  })
})

describe('pagination helpers', () => {
  it('clamps page between 1 and totalPages', () => {
    expect(clampPage(0, 3)).toBe(1)
    expect(clampPage(2, 3)).toBe(2)
    expect(clampPage(5, 3)).toBe(3)
  })

  it('paginates images based on page and size', () => {
    const images = Array.from({ length: 20 }, (_, i) => makeImage(`image-${i + 1}`, '2024-01-01T00:00:00.000Z'))
    const page2 = paginateImages(images, 2, 15)
    expect(page2.map((item) => item.assetRef)).toEqual(['image-16', 'image-17', 'image-18', 'image-19', 'image-20'])
  })
})
