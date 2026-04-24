/**
 * Earnesty — Sanity Studio schema
 *
 * Drop this file into your Sanity Studio's `schemaTypes` directory and import
 * it in `schemaTypes/index.ts`:
 *
 *   import { blogType } from './earnesty-schema'
 *   export const schemaTypes = [blogType]
 *
 * Requirements
 * ────────────
 * The `code` block type requires the `@sanity/code-input` plugin:
 *
 *   npm install @sanity/code-input
 *
 * Register it in your `sanity.config.ts`:
 *
 *   import { codeInput } from '@sanity/code-input'
 *   export default defineConfig({ plugins: [codeInput()] })
 *
 * Document type name
 * ──────────────────
 * The schema below uses the type name `blog`. If you rename it, set the
 * `VITE_SANITY_DOCUMENT_TYPE` (frontend) and `SANITY_DOCUMENT_TYPE` (API)
 * environment variables to match.
 */

import { defineType, defineField } from 'sanity'

export const blogType = defineType({
  name: 'blog',
  title: 'Blog post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      // Optional. When absent the app falls back to _createdAt for ordering.
    }),

    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        // Standard Portable Text blocks (paragraphs, headings, lists, etc.)
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 1', value: 'h1' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Heading 4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (Rule) =>
                      Rule.uri({ allowRelative: true, scheme: ['http', 'https', 'mailto'] }),
                  }),
                ],
              },
            ],
          },
        },

        // Inline images
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alternative text',
            }),
          ],
        },

        // Code blocks — requires @sanity/code-input plugin
        {
          type: 'code',
          options: {
            // Languages surfaced in the Studio editor.
            // The frontend renders any language string via highlight.js.
            language: 'typescript',
            languageAlternatives: [
              { title: 'TypeScript', value: 'typescript' },
              { title: 'JavaScript', value: 'javascript' },
              { title: 'CSS', value: 'css' },
              { title: 'HTML', value: 'html' },
              { title: 'JSON', value: 'json' },
              { title: 'Bash', value: 'bash' },
              { title: 'Python', value: 'python' },
              { title: 'Go', value: 'go' },
              { title: 'Rust', value: 'rust' },
              { title: 'Plain text', value: 'text' },
            ],
            withFilename: true,
          },
        },
      ],
    }),
  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'publishedAt',
    },
    prepare({ title, subtitle }) {
      return {
        title: title ?? 'Untitled',
        subtitle: subtitle ? new Date(subtitle as string).toLocaleDateString() : 'Draft',
      }
    },
  },
})
