import { Chart, registerables } from 'chart.js';

/** Font stack used for all Chart.js charts; matches --app-font-sans in styles.css. */
export const CHART_FONT_FAMILY =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/** Registers all Chart.js components and applies the app's typography defaults. */
export function setupChartDefaults(): void {
  Chart.register(...registerables);
  Chart.defaults.font.family = CHART_FONT_FAMILY;
}
