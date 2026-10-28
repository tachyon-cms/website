import { describe, expect, it } from 'vitest';
import { isCurrent } from '../src/lib/nav';

describe('main nav current page', () => {
  it.each([
    ['/compare', '/compare', true],
    ['/compare/other', '/compare', true],
    ['/product/querying', '/product', true],
    ['/', '/product', false],
    ['/productive', '/product', false],
    ['/blog', '/compare', false],
  ])('%s under %s is %s', (path, section, expected) => {
    expect(isCurrent(path, section)).toBe(expected);
  });
});
