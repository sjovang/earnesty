import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, parseClientPrincipal } from '../shared.js'

interface ImageAsset {
  assetRef: string
  url: string
  width: number | null
  height: number | null
}

app.http('listImages', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sanity/images',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const principal = parseClientPrincipal(
      request.headers.get('x-ms-client-principal'),
    )
    if (!principal) {
      return { status: 401, jsonBody: { error: 'Not authenticated' } }
    }

    try {
      const assets = await getSanityClient().fetch<
        { _id: string; url: string; width: number | null; height: number | null }[]
      >(
        `*[_type == "sanity.imageAsset"] | order(coalesce(metadata.exif.DateTimeOriginal, _createdAt) desc) {
          _id,
          url,
          "width": metadata.dimensions.width,
          "height": metadata.dimensions.height
        }`,
      )

      const result: ImageAsset[] = assets.map((a) => ({
        assetRef: a._id,
        url: a.url,
        width: a.width,
        height: a.height,
      }))

      return { status: 200, jsonBody: result }
    } catch (err) {
      console.error('[listImages]', err)
      return { status: 502, jsonBody: { error: 'Failed to list images' } }
    }
  },
})
