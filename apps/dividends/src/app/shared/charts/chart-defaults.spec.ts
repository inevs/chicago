import { Chart } from 'chart.js';
import {
  CHART_ACCENT,
  CHART_ACCENT_DARK,
  CHART_FONT_FAMILY,
  CHART_PALETTE,
  chartAccent,
  setupChartDefaults,
} from './chart-defaults';

describe('chart defaults', () => {
  it('sets Inter as the default chart font', () => {
    setupChartDefaults();
    expect(Chart.defaults.font.family).toBe(CHART_FONT_FAMILY);
    expect(CHART_FONT_FAMILY.startsWith("'Inter'")).toBe(true);
  });

  it('returns the theme-specific accent color', () => {
    expect(chartAccent(false)).toBe(CHART_ACCENT);
    expect(chartAccent(true)).toBe(CHART_ACCENT_DARK);
  });

  it('provides ten distinct palette colors starting with the brand accent', () => {
    expect(CHART_PALETTE).toHaveLength(10);
    expect(new Set(CHART_PALETTE).size).toBe(10);
    expect(CHART_PALETTE[0]).toBe(CHART_ACCENT);
  });
});
