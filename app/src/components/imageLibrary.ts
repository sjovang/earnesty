import type { ImageAsset } from '../services/api'

export type ImageSortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc'

function imageTimestamp(asset: ImageAsset): number {
  if (!asset.createdAt) return Number.NaN
  const timestamp = Date.parse(asset.createdAt)
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

function compareAssetRefAsc(a: ImageAsset, b: ImageAsset): number {
  return a.assetRef.localeCompare(b.assetRef)
}

export function sortLibraryImages(images: ImageAsset[], sortBy: ImageSortKey): ImageAsset[] {
  const list = [...images]

  if (sortBy === 'name-asc') {
    return list.sort(compareAssetRefAsc)
  }

  if (sortBy === 'name-desc') {
    return list.sort((a, b) => compareAssetRefAsc(b, a))
  }

  const sortedByDateDesc = list.sort((a, b) => {
    const aTime = imageTimestamp(a)
    const bTime = imageTimestamp(b)
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
    if (Number.isNaN(aTime)) return 1
    if (Number.isNaN(bTime)) return -1
    return bTime - aTime
  })

  if (sortBy === 'oldest') return [...sortedByDateDesc].reverse()
  return sortedByDateDesc
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1
  return Math.max(1, Math.min(page, totalPages))
}

export function paginateImages(images: ImageAsset[], page: number, pageSize: number): ImageAsset[] {
  const start = (page - 1) * pageSize
  return images.slice(start, start + pageSize)
}
