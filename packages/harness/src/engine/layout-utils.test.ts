import { describe, it, expect } from 'vitest';
import { resolveLayout } from './layout-utils';

describe('resolveLayout', () => {
  it('passes through step-indicator + paginated', () => {
    const config = { navigation: 'step-indicator' as const, display: 'paginated' as const };
    expect(resolveLayout(config)).toEqual(config);
  });

  it('passes through none + accordion', () => {
    const config = { navigation: 'none' as const, display: 'accordion' as const };
    expect(resolveLayout(config)).toEqual(config);
  });

  it('passes through side-nav + paginated', () => {
    const config = { navigation: 'side-nav' as const, display: 'paginated' as const };
    expect(resolveLayout(config)).toEqual(config);
  });

  it('passes through in-page + scrollable', () => {
    const config = { navigation: 'in-page' as const, display: 'scrollable' as const };
    expect(resolveLayout(config)).toEqual(config);
  });

  it('passes through side-nav + split-panel', () => {
    const config = { navigation: 'side-nav' as const, display: 'split-panel' as const };
    expect(resolveLayout(config)).toEqual(config);
  });

  it('passes through none + scrollable', () => {
    const config = { navigation: 'none' as const, display: 'scrollable' as const };
    expect(resolveLayout(config)).toEqual(config);
  });

  it('passes through none + paginated', () => {
    const config = { navigation: 'none' as const, display: 'paginated' as const };
    expect(resolveLayout(config)).toEqual(config);
  });

  it('returns safe default for "reference"', () => {
    expect(resolveLayout('reference')).toEqual({
      navigation: 'step-indicator',
      display: 'paginated',
    });
  });
});
