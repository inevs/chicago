import { Chart, registerables } from 'chart.js';

/** Font stack used for all Chart.js charts; matches --app-font-sans in styles.css. */
export const CHART_FONT_FAMILY =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/** Brand accent for single-series charts (brand-600 / brand-400 in styles.css). */
export const CHART_ACCENT = '#1f6a67';
export const CHART_ACCENT_DARK = '#4b9e9a';

/**
 * Categorical palette for multi-series charts (e.g. allocation doughnuts).
 * Deliberately avoids green and red, which are reserved for gains and losses.
 */
export const CHART_PALETTE: readonly string[] = [
  '#1f6a67', // Petrol (brand)
  '#3e5c8a', // Navy
  '#b7862f', // Ochre
  '#7a5c8e', // Plum
  '#4b9e9a', // Light petrol
  '#7c93b8', // Steel blue
  '#d9b36a', // Sand
  '#a98bbf', // Lavender
  '#5f6b7a', // Slate
  '#9aa5b1', // Light slate
];

/** Returns the accent color for single-series charts in the given theme. */
export function chartAccent(isDark: boolean): string {
  return isDark ? CHART_ACCENT_DARK : CHART_ACCENT;
}

/** Registers all Chart.js components and applies the app's typography defaults. */
export function setupChartDefaults(): void {
  Chart.register(...registerables);
  Chart.defaults.font.family = CHART_FONT_FAMILY;
}
