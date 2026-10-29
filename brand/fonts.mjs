// The Astro fonts config shared by the site and the docs. The files are the
// @fontsource woff2 builds, served from our own origin, so the CSP's
// font-src 'self' covers them and nothing loads from a font CDN.
import { fontProviders } from "astro/config";

const family = (name, cssVariable, pkg, weights, fallbacks) => ({
  provider: fontProviders.local(),
  name,
  cssVariable,
  fallbacks,
  // The metric-matched fallbacks name Arial and Courier New, which Linux and Android
  // lack, so a late swap there shifts the layout. "optional" never swaps after first
  // paint: a slow first visit keeps the fallback, and the next page has the font cached.
  display: "optional",
  options: {
    variants: weights.map((weight) => ({
      weight,
      style: "normal",
      src: [`@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff2`],
    })),
  },
});

export const fonts = [
  family("Inter", "--font-sans", "inter", [400, 500, 600, 700], ["system-ui", "sans-serif"]),
  family("Geist Mono", "--font-mono", "geist-mono", [400], ["ui-monospace", "monospace"]),
];

// The docs load three files, not six: Lighthouse counts every font a long page
// requests before first paint, and the extra faces cost the mobile 100. Bold text falls
// back to the 600 face and bold code to a synthesized 400.
export const docsFonts = [
  family("Inter", "--font-sans", "inter", [400, 600], ["system-ui", "sans-serif"]),
  family("Geist Mono", "--font-mono", "geist-mono", [400], ["ui-monospace", "monospace"]),
];
