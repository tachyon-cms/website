// The Astro fonts config shared by the site and the docs. The files are the
// @fontsource woff2 builds, served from our own origin, so the CSP's
// font-src 'self' covers them and nothing loads from a font CDN.
import { fontProviders } from "astro/config";

const family = (name, cssVariable, pkg, weights, fallbacks) => ({
  provider: fontProviders.local(),
  name,
  cssVariable,
  fallbacks,
  options: {
    variants: weights.map((weight) => ({
      weight,
      style: "normal",
      src: [`@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff2`],
    })),
  },
});

export const fonts = [
  family("Instrument Sans", "--font-sans", "instrument-sans", [400, 600, 700], ["system-ui", "sans-serif"]),
  family("IBM Plex Mono", "--font-mono", "ibm-plex-mono", [400, 600], ["ui-monospace", "monospace"]),
];

// The docs load three files, not five: Lighthouse counts every font a long page
// requests before first paint, and two more cost the mobile 100. Bold text falls
// back to the 600 face and bold code to a synthesized 400.
export const docsFonts = [
  family("Instrument Sans", "--font-sans", "instrument-sans", [400, 600], ["system-ui", "sans-serif"]),
  family("IBM Plex Mono", "--font-mono", "ibm-plex-mono", [400], ["ui-monospace", "monospace"]),
];
