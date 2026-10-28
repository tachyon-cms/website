// Vite (and so vitest) imports any file as a string with the ?raw suffix.
declare module '*?raw' {
  const text: string;
  export default text;
}
