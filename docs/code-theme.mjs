// The one Expressive Code theme, coloured like the site's code samples: keys in
// --c-blue-soft, strings in --c-code-string, punctuation and comments in --c-muted,
// literals (true, false, numbers) in --c-blue, warnings in --c-warn. The hex values are
// read from src/brand/tokens.css, so moving a token moves the docs code with it.
// Every colour clears Expressive Code's 5.5:1 floor on --c-panel, so none is adjusted.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/brand/tokens.css', import.meta.url), 'utf8');
const t = Object.fromEntries([...css.matchAll(/(--c-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

const rule = (scope, foreground) => ({ scope, settings: { foreground } });

export const codeTheme = {
  name: 'tachyon-dark',
  type: 'dark',
  colors: {
    'editor.background': t['--c-panel'],
    'editor.foreground': t['--c-code'],
  },
  tokenColors: [
    rule(['comment', 'punctuation.definition.comment'], t['--c-muted']),
    rule(['punctuation', 'meta.brace', 'keyword.operator'], t['--c-muted']),
    rule(['string', 'punctuation.definition.string'], t['--c-code-string']),
    rule(
      [
        'support.type.property-name',
        'punctuation.support.type.property-name',
        'entity.name.tag',
        'variable.other.property',
      ],
      t['--c-blue-soft'],
    ),
    rule(['constant.language', 'constant.numeric', 'constant.character', 'keyword', 'storage'], t['--c-blue']),
    rule(['entity.name.function', 'support.function', 'entity.name.command'], t['--c-blue-soft']),
    rule(['variable', 'punctuation.definition.variable'], t['--c-text']),
    rule(['markup.inserted'], t['--c-blue']),
    rule(['invalid', 'markup.deleted'], t['--c-warn']),
  ],
};
