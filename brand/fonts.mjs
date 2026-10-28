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
