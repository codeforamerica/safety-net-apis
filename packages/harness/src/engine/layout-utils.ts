import type { FormLayout, LayoutConfig } from './types';

/**
 * Extract a LayoutConfig from a FormLayout value.
 *
 * LayoutConfig objects pass through unchanged.
 * 'reference' uses a dedicated renderer and should not reach here;
 * returns a safe default if it does.
 */
export function resolveLayout(layout: FormLayout): LayoutConfig {
  if (typeof layout === 'string') {
    // 'reference' — shouldn't reach FormRenderer/SplitPanelRenderer, but handle gracefully
    return { navigation: 'step-indicator', display: 'paginated' };
  }
  return layout;
}
