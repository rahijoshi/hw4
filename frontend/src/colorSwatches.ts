// Maps the catalogue's real color vocabulary (see output/harness.md's
// Problem 2 analysis) to a dot a shopper can scan at a glance. An unlisted
// color falls back to a neutral gray dot rather than a guessed hex — the
// dot's `title` always carries the real color name, so nothing is ever
// visually misrepresented, only under-styled.
const SWATCHES: Record<string, string> = {
  'navy blue': '#00356b',
  navy: '#00356b',
  white: '#ffffff',
  'heather gray': '#9aa0a8',
  'dark heather gray': '#6b7178',
  'charcoal gray': '#4b4f56',
  gray: '#9aa0a8',
  grey: '#9aa0a8',
  black: '#1a1a1a',
  red: '#b3312c',
  blue: '#286dc0',
  yellow: '#e8c547',
  gold: '#bd9b60',
  green: '#3f6b4a',
}

export function swatchColor(name: string): string {
  return SWATCHES[name.toLowerCase().trim()] ?? '#cbd2d9'
}
