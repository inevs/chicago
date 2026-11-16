import { Chart } from 'chart.js';
import { CHART_FONT_FAMILY, setupChartDefaults } from './chart-defaults';

describe('setupChartDefaults', () => {
  it('sets Inter as the default chart font', () => {
    setupChartDefaults();
    expect(Chart.defaults.font.family).toBe(CHART_FONT_FAMILY);
    expect(CHART_FONT_FAMILY.startsWith("'Inter'")).toBe(true);
  });
});
