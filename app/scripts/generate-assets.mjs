/**
 * Generates static image assets for Earnesty:
 *   - public/favicon.svg    (adaptive light/dark SVG favicon)
 *   - public/favicon-32.png (32×32 raster favicon)
 *   - public/apple-touch-icon.png (180×180 for iOS)
 *   - public/og-image.png   (1200×630 Open Graph image)
 *
 * Run with: node scripts/generate-assets.mjs
 */

import { writeFileSync } from 'fs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

// ── Catppuccin palette ────────────────────────────────────────────────────────

const latte = {
  base: '#eff1f5',
  mantle: '#e6e9ef',
  crust: '#dce0e8',
  text: '#4c4f69',
  subtext1: '#5c5f77',
  subtext0: '#6c6f85',
  overlay2: '#7c7f93',
  mauve: '#8839ef',
}

const macchiato = {
  base: '#24273a',
  mantle: '#1e2030',
  text: '#cad3f5',
}

// ── Typewriter SVG shapes ─────────────────────────────────────────────────────

function typewriterPaths(color) {
  return `
    <rect x="17" y="1" width="14" height="16" rx="1" stroke-width="2"
      fill="${color}" fill-opacity="0.1" stroke="${color}" />
    <line x1="20" y1="6" x2="28" y2="6" stroke-width="1.2" stroke="${color}" opacity="0.5" />
    <line x1="20" y1="9" x2="28" y2="9" stroke-width="1.2" stroke="${color}" opacity="0.5" />
    <line x1="20" y1="12" x2="28" y2="12" stroke-width="1.2" stroke="${color}" opacity="0.5" />
    <rect x="4" y="14" width="40" height="8" rx="4" stroke-width="2"
      fill="${color}" fill-opacity="0.12" stroke="${color}" />
    <line x1="42" y1="15" x2="46" y2="11" stroke-width="1.8" stroke="${color}" />
    <rect x="2" y="21" width="44" height="25" rx="3" stroke-width="2"
      fill="${color}" fill-opacity="0.1" stroke="${color}" />
    <rect x="7" y="25" width="7" height="6" rx="1.5" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
    <rect x="16" y="25" width="7" height="6" rx="1.5" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
    <rect x="25" y="25" width="7" height="6" rx="1.5" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
    <rect x="34" y="25" width="7" height="6" rx="1.5" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
    <rect x="7" y="33" width="7" height="6" rx="1.5" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
    <rect x="16" y="33" width="7" height="6" rx="1.5" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
    <rect x="25" y="33" width="7" height="6" rx="1.5" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
    <rect x="34" y="33" width="7" height="6" rx="1.5" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
    <rect x="13" y="40" width="22" height="4" rx="2" stroke-width="1.6"
      fill="${color}" fill-opacity="0.15" stroke="${color}" />
  `
}

// ── 1. favicon.svg (adaptive: light/dark via CSS media query) ────────────────

const faviconSvg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"
  xmlns="http://www.w3.org/2000/svg"
  stroke-linecap="round" stroke-linejoin="round">
  <style>
    .bg { fill: ${latte.base}; }
    .sh { stroke: ${latte.text}; fill: ${latte.text}; }
    @media (prefers-color-scheme: dark) {
      .bg { fill: ${macchiato.mantle}; }
      .sh { stroke: ${macchiato.text}; fill: ${macchiato.text}; }
    }
  </style>
  <rect width="48" height="48" rx="10" class="bg" />
  <g class="sh" stroke-linecap="round" stroke-linejoin="round">
    <rect x="17" y="1" width="14" height="16" rx="1" stroke-width="2" fill-opacity="0.08" />
    <line x1="20" y1="6" x2="28" y2="6" stroke-width="1.2" opacity="0.45" />
    <line x1="20" y1="9" x2="28" y2="9" stroke-width="1.2" opacity="0.45" />
    <line x1="20" y1="12" x2="28" y2="12" stroke-width="1.2" opacity="0.45" />
    <rect x="4" y="14" width="40" height="8" rx="4" stroke-width="2" fill-opacity="0.1" />
    <line x1="42" y1="15" x2="46" y2="11" stroke-width="1.8" />
    <rect x="2" y="21" width="44" height="25" rx="3" stroke-width="2" fill-opacity="0.08" />
    <rect x="7" y="25" width="7" height="6" rx="1.5" stroke-width="1.6" fill-opacity="0.12" />
    <rect x="16" y="25" width="7" height="6" rx="1.5" stroke-width="1.6" fill-opacity="0.12" />
    <rect x="25" y="25" width="7" height="6" rx="1.5" stroke-width="1.6" fill-opacity="0.12" />
    <rect x="34" y="25" width="7" height="6" rx="1.5" stroke-width="1.6" fill-opacity="0.12" />
    <rect x="7" y="33" width="7" height="6" rx="1.5" stroke-width="1.6" fill-opacity="0.12" />
    <rect x="16" y="33" width="7" height="6" rx="1.5" stroke-width="1.6" fill-opacity="0.12" />
    <rect x="25" y="33" width="7" height="6" rx="1.5" stroke-width="1.6" fill-opacity="0.12" />
    <rect x="34" y="33" width="7" height="6" rx="1.5" stroke-width="1.6" fill-opacity="0.12" />
    <rect x="13" y="40" width="22" height="4" rx="2" stroke-width="1.6" fill-opacity="0.12" />
  </g>
</svg>`

writeFileSync(`${publicDir}/favicon.svg`, faviconSvg)
console.log('✓ favicon.svg')

// ── 2. favicon-32.png (macchiato — works on light and dark browser chrome) ────

const rasterFaviconSvg = `<svg width="32" height="32" viewBox="0 0 48 48" fill="none"
  xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">
  <rect width="48" height="48" rx="10" fill="${macchiato.mantle}" />
  ${typewriterPaths(macchiato.text)}
</svg>`

await sharp(Buffer.from(rasterFaviconSvg)).png().toFile(`${publicDir}/favicon-32.png`)
console.log('✓ favicon-32.png')

// ── 3. apple-touch-icon.png (180×180) ────────────────────────────────────────

const appleTouchSvg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none"
  xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">
  <rect width="180" height="180" fill="${macchiato.mantle}" />
  <g transform="translate(27, 27) scale(2.625)">
    ${typewriterPaths(macchiato.text)}
  </g>
</svg>`

await sharp(Buffer.from(appleTouchSvg)).png().toFile(`${publicDir}/apple-touch-icon.png`)
console.log('✓ apple-touch-icon.png')

// ── 4. og-image.png (1200×630) ────────────────────────────────────────────────

const ogSvg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none"
  xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${macchiato.base}" />
      <stop offset="100%" stop-color="${macchiato.mantle}" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Subtle grid lines -->
  <line x1="0" y1="210" x2="1200" y2="210" stroke="${macchiato.text}" stroke-width="1" opacity="0.05" />
  <line x1="0" y1="420" x2="1200" y2="420" stroke="${macchiato.text}" stroke-width="1" opacity="0.05" />
  <line x1="400" y1="0" x2="400" y2="630" stroke="${macchiato.text}" stroke-width="1" opacity="0.05" />
  <line x1="800" y1="0" x2="800" y2="630" stroke="${macchiato.text}" stroke-width="1" opacity="0.05" />

  <!-- Logo (large, right side, vertically centred) -->
  <g transform="translate(810, 147) scale(7)" stroke-linecap="round" stroke-linejoin="round">
    ${typewriterPaths(macchiato.text)}
  </g>

  <!-- Title -->
  <text x="80" y="230"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="100"
    fill="${macchiato.text}"
    letter-spacing="-2">Earnesty</text>

  <!-- Accent line -->
  <rect x="80" y="246" width="480" height="2.5" fill="#8839ef" opacity="0.6" rx="1" />

  <!-- Description -->
  <text x="80" y="316"
    font-family="-apple-system, 'Helvetica Neue', Arial, sans-serif"
    font-size="26"
    fill="#a5adcb"
    letter-spacing="0.2">No distractions. No formatting toolbars.</text>
  <text x="80" y="356"
    font-family="-apple-system, 'Helvetica Neue', Arial, sans-serif"
    font-size="26"
    fill="#a5adcb"
    letter-spacing="0.2">Just you and the blank page.</text>
  <text x="80" y="396"
    font-family="-apple-system, 'Helvetica Neue', Arial, sans-serif"
    font-size="26"
    fill="#a5adcb"
    letter-spacing="0.2">All vibes. No QA.</text>
</svg>`

await sharp(Buffer.from(ogSvg)).png().toFile(`${publicDir}/og-image.png`)
console.log('✓ og-image.png')

console.log('\nAll assets generated in app/public/')
