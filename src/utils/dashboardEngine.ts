import Plotly from "plotly.js-dist-min";
import {
  DatasetProfile,
  DashboardWidget,
  DashboardColorTheme,
  CustomDashboard,
} from "../types";

export const THEME_PALETTES: Record<DashboardColorTheme, string[]> = {
  "power-bi-classic": [
    "#f2c80f",
    "#118dff",
    "#12239e",
    "#e66c37",
    "#6b007b",
    "#e044a7",
    "#744da9",
    "#01b8aa",
  ],
  "tableau-10": [
    "#4e79a7",
    "#f28e2b",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc948",
    "#b07aa1",
    "#ff9da7",
    "#9c755f",
    "#bab0ac",
  ],
  "warm-modern": [
    "#d97706",
    "#2563eb",
    "#059669",
    "#dc2626",
    "#7c3aed",
    "#db2777",
    "#0891b2",
    "#ca8a04",
  ],
  "emerald-fresh": [
    "#10b981",
    "#06b6d4",
    "#3b82f6",
    "#84cc16",
    "#14b8a6",
    "#f59e0b",
    "#6366f1",
    "#ec4899",
  ],
  "cyber-indigo": [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#3b82f6",
    "#14b8a6",
    "#f43f5e",
    "#a855f7",
    "#06b6d4",
  ],
  "sunset-amber": [
    "#ea580c",
    "#f59e0b",
    "#e11d48",
    "#f43f5e",
    "#d97706",
    "#c026d3",
    "#4f46e5",
    "#0284c7",
  ],
};

export interface ProcessedChartResult {
  plotlyData: Plotly.Data[];
  plotlyLayout: Partial<Plotly.Layout>;
  kpiStats?: {
    current: number;
    target?: number;
    percentOfTarget?: number;
    formattedCurrent: string;
    sublabel: string;
  };
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

// Compute aggregate metrics
export function computeWidgetChart(
  widget: DashboardWidget,
  rawData: Record<string, any>[],
  globalFilters: Record<string, string> = {}
): ProcessedChartResult {
  const palette = THEME_PALETTES[widget.theme] || THEME_PALETTES["power-bi-classic"];

  // Filter raw data according to active global slicers
  let filteredData = rawData;
  const filterEntries = Object.entries(globalFilters).filter(
    ([, v]) => v && v !== "__ALL__"
  );
  if (filterEntries.length > 0) {
    filteredData = rawData.filter((row) => {
      return filterEntries.every(([col, val]) => String(row[col]) === val);
    });
  }

  if (filteredData.length === 0) {
    return {
      plotlyData: [],
      plotlyLayout: {
        annotations: [
          {
            text: "No records matching selected filters",
            showarrow: false,
            font: { size: 14, color: "#78716c" },
          },
        ],
      },
    };
  }

  const { chartType, xCol, yCol, colorCol, aggregation, sort = "desc", limit = 10, showLegend = true } = widget;

  // Formatting helpers
  const formatNum = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
    if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + "k";
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  };

  // 1. KPI WIDGET
  if (chartType === "kpi") {
    const vals = filteredData
      .map((r) => Number(r[yCol]))
      .filter((n) => !isNaN(n) && n !== null && n !== undefined);
    
    let total = 0;
    if (aggregation === "sum") total = vals.reduce((a, b) => a + b, 0);
    else if (aggregation === "mean") total = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    else if (aggregation === "count") total = filteredData.length;
    else if (aggregation === "min") total = vals.length > 0 ? Math.min(...vals) : 0;
    else if (aggregation === "max") total = vals.length > 0 ? Math.max(...vals) : 0;
    else if (aggregation === "median") {
      const sorted = [...vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      total = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    const target = widget.kpiTarget;
    const percentOfTarget = target && target > 0 ? (total / target) * 100 : undefined;

    return {
      plotlyData: [],
      plotlyLayout: {},
      kpiStats: {
        current: total,
        target,
        percentOfTarget,
        formattedCurrent: formatNum(total),
        sublabel: widget.kpiSubtitle || `${aggregation.toUpperCase()} of ${yCol || "Records"}`,
      },
    };
  }

  // 2. GAUGE WIDGET
  if (chartType === "gauge") {
    const vals = filteredData
      .map((r) => Number(r[yCol]))
      .filter((n) => !isNaN(n));
    let val = 0;
    if (aggregation === "sum") val = vals.reduce((a, b) => a + b, 0);
    else if (aggregation === "mean") val = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    else if (aggregation === "max") val = vals.length ? Math.max(...vals) : 0;
    else val = filteredData.length;

    const maxVal = widget.kpiTarget || (val > 0 ? Math.ceil(val * 1.3) : 100);

    const gaugeData: Plotly.Data[] = [
      {
        type: "indicator",
        mode: "gauge+number",
        value: val,
        title: { text: widget.title, font: { size: 14, color: "#1c1917" } },
        gauge: {
          axis: { range: [0, maxVal], tickwidth: 1, tickcolor: "#a8a29e" },
          bar: { color: palette[0] },
          bgcolor: "#f5f5f4",
          borderwidth: 1,
          bordercolor: "#e7e5e4",
          steps: [
            { range: [0, maxVal * 0.6], color: "#f3f4f6" },
            { range: [maxVal * 0.6, maxVal * 0.85], color: "#e5e7eb" },
            { range: [maxVal * 0.85, maxVal], color: "#d1d5db" },
          ],
          threshold: {
            line: { color: "#dc2626", width: 3 },
            thickness: 0.75,
            value: widget.kpiTarget || maxVal * 0.9,
          },
        },
      } as any,
    ];

    return {
      plotlyData: gaugeData,
      plotlyLayout: {
        margin: { t: 25, b: 25, l: 30, r: 30 },
        height: widget.height || 320,
      },
    };
  }

  // 3. TABLE WIDGET (Aggregated Pivot)
  if (chartType === "table") {
    const groupKey = xCol || Object.keys(filteredData[0] || {})[0] || "Category";
    const valKey = yCol || Object.keys(filteredData[0] || {})[1] || "";

    const aggMap: Record<string, { sum: number; count: number; min: number; max: number }> = {};
    for (const row of filteredData) {
      const g = String(row[groupKey] ?? "Unknown");
      const num = Number(row[valKey]) || 0;
      if (!aggMap[g]) {
        aggMap[g] = { sum: 0, count: 0, min: num, max: num };
      }
      aggMap[g].sum += num;
      aggMap[g].count += 1;
      aggMap[g].min = Math.min(aggMap[g].min, num);
      aggMap[g].max = Math.max(aggMap[g].max, num);
    }

    let entries = Object.entries(aggMap).map(([cat, stats]) => {
      let val = stats.sum;
      if (aggregation === "mean") val = stats.count ? stats.sum / stats.count : 0;
      else if (aggregation === "count") val = stats.count;
      else if (aggregation === "min") val = stats.min;
      else if (aggregation === "max") val = stats.max;
      return {
        cat,
        val,
        count: stats.count,
        avg: stats.count ? stats.sum / stats.count : 0,
      };
    });

    if (sort === "desc") entries.sort((a, b) => b.val - a.val);
    else if (sort === "asc") entries.sort((a, b) => a.val - b.val);
    else entries.sort((a, b) => a.cat.localeCompare(b.cat));

    if (limit && limit > 0) entries = entries.slice(0, limit);

    return {
      plotlyData: [],
      plotlyLayout: {},
      tableData: {
        headers: [groupKey, `${aggregation.toUpperCase()} of ${valKey}`, "Record Count", "Average"],
        rows: entries.map((e) => [e.cat, formatNum(e.val), e.count, formatNum(e.avg)]),
      },
    };
  }

  // 4. SCATTER PLOT
  if (chartType === "scatter") {
    const sample = filteredData.slice(0, 500);
    const xVals = sample.map((r) => Number(r[xCol]) || 0);
    const yVals = sample.map((r) => Number(r[yCol]) || 0);
    const textVals = sample.map(
      (r) => `${colorCol && r[colorCol] ? `${r[colorCol]}<br>` : ""}${xCol}: ${r[xCol]}<br>${yCol}: ${r[yCol]}`
    );

    let scatterTraces: Plotly.Data[] = [];

    if (colorCol && colorCol in filteredData[0]) {
      // Group by colorCol
      const groups: Record<string, { x: number[]; y: number[]; text: string[] }> = {};
      sample.forEach((r, idx) => {
        const cat = String(r[colorCol] ?? "Other");
        if (!groups[cat]) groups[cat] = { x: [], y: [], text: [] };
        groups[cat].x.push(xVals[idx]);
        groups[cat].y.push(yVals[idx]);
        groups[cat].text.push(textVals[idx]);
      });

      scatterTraces = Object.entries(groups).map(([cat, pts], i) => ({
        type: "scatter",
        mode: "markers",
        name: cat,
        x: pts.x,
        y: pts.y,
        hovertext: pts.text,
        hoverinfo: "text",
        marker: {
          size: 8,
          color: palette[i % palette.length],
          opacity: 0.8,
          line: { width: 1, color: "#ffffff" },
        },
      }));
    } else {
      scatterTraces = [
        {
          type: "scatter",
          mode: "markers",
          x: xVals,
          y: yVals,
          hovertext: textVals,
          hoverinfo: "text",
          marker: {
            size: 8,
            color: palette[0],
            opacity: 0.8,
            line: { width: 1, color: "#ffffff" },
          },
        },
      ];
    }

    return {
      plotlyData: scatterTraces,
      plotlyLayout: {
        xaxis: { title: { text: xCol }, gridcolor: "#f0ece1", zeroline: false },
        yaxis: { title: { text: yCol }, gridcolor: "#f0ece1", zeroline: false },
        margin: { l: 50, r: 25, t: 25, b: 45 },
        showlegend: Boolean(colorCol),
      },
    };
  }

  // 5. AGGREGATED CHARTS: Bar, Column, Line, Area, Pie, Donut, Treemap, Funnel, Heatmap
  const groupKey = xCol || Object.keys(filteredData[0] || {})[0] || "Category";
  const valKey = yCol || Object.keys(filteredData[0] || {})[1] || "";

  // Check if we have secondary grouping (colorCol)
  const hasSubGroup = colorCol && colorCol in filteredData[0] && colorCol !== groupKey;

  if (hasSubGroup) {
    // Stacked / Multi-series aggregation
    const subGroups = Array.from(
      new Set(filteredData.map((r) => String(r[colorCol] ?? "Unknown")))
    ).slice(0, 6);

    const primaryCategories = Array.from(
      new Set(filteredData.map((r) => String(r[groupKey] ?? "Unknown")))
    ).slice(0, limit || 8);

    const traces: Plotly.Data[] = subGroups.map((sub, sIdx) => {
      const yValues: number[] = [];

      for (const cat of primaryCategories) {
        const matching = filteredData.filter(
          (r) => String(r[groupKey]) === cat && String(r[colorCol]) === sub
        );
        const numbers = matching.map((r) => Number(r[valKey]) || 0);
        let val = 0;
        if (aggregation === "sum") val = numbers.reduce((a, b) => a + b, 0);
        else if (aggregation === "mean") val = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
        else if (aggregation === "count") val = matching.length;
        else if (aggregation === "min") val = numbers.length ? Math.min(...numbers) : 0;
        else if (aggregation === "max") val = numbers.length ? Math.max(...numbers) : 0;
        yValues.push(val);
      }

      const color = palette[sIdx % palette.length];

      if (chartType === "bar") {
        return {
          type: "bar",
          orientation: "h",
          name: sub,
          y: primaryCategories,
          x: yValues,
          marker: { color },
        };
      }

      if (chartType === "line") {
        return {
          type: "scatter",
          mode: "lines+markers",
          name: sub,
          x: primaryCategories,
          y: yValues,
          line: { color, width: 2.5 },
        };
      }

      if (chartType === "area") {
        return {
          type: "scatter",
          mode: "lines",
          fill: "tonexty",
          name: sub,
          x: primaryCategories,
          y: yValues,
          line: { color, width: 2 },
        };
      }

      // Default stacked column
      return {
        type: "bar",
        name: sub,
        x: primaryCategories,
        y: yValues,
        marker: { color },
      };
    });

    return {
      plotlyData: traces,
      plotlyLayout: {
        barmode: "group",
        xaxis: { gridcolor: "#f0ece1", tickangle: -25 },
        yaxis: { gridcolor: "#f0ece1" },
        showlegend: showLegend,
        margin: { l: 50, r: 25, t: 25, b: 55 },
      },
    };
  }

  // Single series aggregation
  const aggObj: Record<string, { sum: number; count: number; min: number; max: number; vals: number[] }> = {};

  for (const row of filteredData) {
    const rawVal = row[groupKey];
    const cat = rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== "" ? String(rawVal) : "Unknown";
    const num = Number(row[valKey]) || 0;

    if (!aggObj[cat]) {
      aggObj[cat] = { sum: 0, count: 0, min: num, max: num, vals: [] };
    }
    aggObj[cat].sum += num;
    aggObj[cat].count += 1;
    aggObj[cat].min = Math.min(aggObj[cat].min, num);
    aggObj[cat].max = Math.max(aggObj[cat].max, num);
    aggObj[cat].vals.push(num);
  }

  let entries = Object.entries(aggObj).map(([cat, stats]) => {
    let finalVal = stats.sum;
    if (aggregation === "mean") finalVal = stats.count ? stats.sum / stats.count : 0;
    else if (aggregation === "count") finalVal = stats.count;
    else if (aggregation === "min") finalVal = stats.min;
    else if (aggregation === "max") finalVal = stats.max;
    else if (aggregation === "median") {
      const sorted = [...stats.vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      finalVal = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return { cat, val: finalVal };
  });

  if (sort === "desc") entries.sort((a, b) => b.val - a.val);
  else if (sort === "asc") entries.sort((a, b) => a.val - b.val);
  else entries.sort((a, b) => a.cat.localeCompare(b.cat));

  if (limit && limit > 0) entries = entries.slice(0, limit);

  const categories = entries.map((e) => e.cat);
  const values = entries.map((e) => e.val);

  // PIE & DONUT
  if (chartType === "pie" || chartType === "donut") {
    const trace: Plotly.Data = {
      type: "pie",
      labels: categories,
      values: values,
      hole: chartType === "donut" ? 0.45 : 0,
      marker: { colors: palette },
      textinfo: "label+percent",
      hoverinfo: "label+value+percent",
    };
    return {
      plotlyData: [trace],
      plotlyLayout: {
        showlegend: showLegend,
        margin: { l: 20, r: 20, t: 25, b: 25 },
      },
    };
  }

  // TREEMAP
  if (chartType === "treemap") {
    const trace: Plotly.Data = {
      type: "treemap",
      labels: categories,
      parents: categories.map(() => ""),
      values: values,
      marker: { colors: palette.slice(0, categories.length) },
      textinfo: "label+value",
    } as any;
    return {
      plotlyData: [trace],
      plotlyLayout: {
        margin: { l: 15, r: 15, t: 25, b: 15 },
      },
    };
  }

  // FUNNEL CHART
  if (chartType === "funnel") {
    const trace: Plotly.Data = {
      type: "funnel",
      y: categories,
      x: values,
      marker: { color: palette },
    } as any;
    return {
      plotlyData: [trace],
      plotlyLayout: {
        margin: { l: 100, r: 20, t: 25, b: 25 },
      },
    };
  }

  // HORIZONTAL BAR
  if (chartType === "bar") {
    const reversedCats = [...categories].reverse();
    const reversedVals = [...values].reverse();
    const trace: Plotly.Data = {
      type: "bar",
      orientation: "h",
      y: reversedCats,
      x: reversedVals,
      marker: {
        color: palette[0],
        opacity: 0.9,
      },
    };
    return {
      plotlyData: [trace],
      plotlyLayout: {
        xaxis: { gridcolor: "#f0ece1" },
        yaxis: { automargin: true },
        margin: { l: 110, r: 25, t: 25, b: 40 },
      },
    };
  }

  // LINE & AREA
  if (chartType === "line" || chartType === "area") {
    const trace: Plotly.Data = {
      type: "scatter",
      mode: "lines+markers",
      x: categories,
      y: values,
      line: { color: palette[0], width: 3 },
      marker: { size: 6, color: palette[1] || palette[0] },
      fill: chartType === "area" ? "tozeroy" : undefined,
      fillcolor: chartType === "area" ? `${palette[0]}25` : undefined,
    };
    return {
      plotlyData: [trace],
      plotlyLayout: {
        xaxis: { gridcolor: "#f0ece1", tickangle: -25 },
        yaxis: { gridcolor: "#f0ece1" },
        margin: { l: 50, r: 25, t: 25, b: 55 },
      },
    };
  }

  // HEATMAP MATRIX (if two dimensions or category distribution)
  if (chartType === "heatmap") {
    // Top 8 categories x simulated density
    const zMatrix = [values.map((v) => v * 0.4), values.map((v) => v * 0.8), values];
    const trace: Plotly.Data = {
      type: "heatmap",
      x: categories,
      y: ["Low Tier", "Mid Tier", "Peak Tier"],
      z: zMatrix,
      colorscale: "Viridis",
    } as any;
    return {
      plotlyData: [trace],
      plotlyLayout: {
        xaxis: { tickangle: -25 },
        margin: { l: 80, r: 25, t: 25, b: 55 },
      },
    };
  }

  // DEFAULT: VERTICAL COLUMN
  const trace: Plotly.Data = {
    type: "bar",
    x: categories,
    y: values,
    marker: {
      color: entries.map((_, i) => palette[i % palette.length]),
      opacity: 0.9,
    },
  };

  return {
    plotlyData: [trace],
    plotlyLayout: {
      xaxis: { gridcolor: "#f0ece1", tickangle: -25 },
      yaxis: { gridcolor: "#f0ece1" },
      margin: { l: 50, r: 25, t: 25, b: 55 },
    },
  };
}

// Generate intelligent default dashboard templates tailored to dataset profile
export function generateDefaultDashboards(
  profile: DatasetProfile,
  datasetName: string = "Dataset"
): CustomDashboard[] {
  const cat = profile.categoricalColumns;
  const num = profile.numericalColumns;
  const date = profile.datetimeColumns;

  const primaryCat = cat[0] || "Category";
  const secondaryCat = cat[1] || cat[0] || "Segment";
  const primaryNum = num[0] || "Value";
  const secondaryNum = num[1] || num[0] || "Revenue";
  const primaryDate = date[0] || primaryCat;

  // 1. Executive BI Dashboard
  const execDashboard: CustomDashboard = {
    id: "dash-executive-bi",
    name: "Executive BI Dashboard",
    description: "High-level KPI performance metrics, revenue drivers, and category distribution.",
    theme: "power-bi-classic",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    widgets: [
      {
        id: "w-kpi-1",
        title: `Total ${primaryNum}`,
        chartType: "kpi",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "1/3",
        height: 170,
        theme: "power-bi-classic",
        kpiSubtitle: "Cumulative Volume",
        kpiTarget: 50000,
      },
      {
        id: "w-kpi-2",
        title: `Average ${secondaryNum}`,
        chartType: "kpi",
        xCol: primaryCat,
        yCol: secondaryNum,
        aggregation: "mean",
        width: "1/3",
        height: 170,
        theme: "power-bi-classic",
        kpiSubtitle: "Benchmark Target",
      },
      {
        id: "w-kpi-3",
        title: "Total Records Analysed",
        chartType: "kpi",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "count",
        width: "1/3",
        height: 170,
        theme: "power-bi-classic",
        kpiSubtitle: "Dataset Completeness",
      },
      {
        id: "w-chart-col-1",
        title: `${primaryNum} by ${primaryCat}`,
        chartType: "column",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "2/3",
        height: 360,
        theme: "power-bi-classic",
        sort: "desc",
        limit: 8,
      },
      {
        id: "w-chart-donut-1",
        title: `Distribution by ${secondaryCat}`,
        chartType: "donut",
        xCol: secondaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "1/3",
        height: 360,
        theme: "power-bi-classic",
        limit: 6,
      },
      {
        id: "w-chart-trend-1",
        title: `${secondaryNum} Trajectory Timeline`,
        chartType: "area",
        xCol: primaryDate,
        yCol: secondaryNum,
        aggregation: "sum",
        width: "1/2",
        height: 340,
        theme: "power-bi-classic",
        limit: 12,
      },
      {
        id: "w-chart-table-1",
        title: `Performance Breakdown Table (${primaryCat})`,
        chartType: "table",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "1/2",
        height: 340,
        theme: "power-bi-classic",
        limit: 10,
      },
    ],
  };

  // 2. Sales & Operational Dashboard
  const salesDashboard: CustomDashboard = {
    id: "dash-sales-ops",
    name: "Sales & Operational Performance",
    description: "Multi-dimensional breakdown with funnel flow, scatter relationships, and treemaps.",
    theme: "tableau-10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    widgets: [
      {
        id: "w-gauge-1",
        title: `Target Achievement (${primaryNum})`,
        chartType: "gauge",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "mean",
        width: "1/3",
        height: 320,
        theme: "tableau-10",
        kpiTarget: 1000,
      },
      {
        id: "w-treemap-1",
        title: `Portfolio Allocation (${primaryCat})`,
        chartType: "treemap",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "2/3",
        height: 320,
        theme: "tableau-10",
        limit: 10,
      },
      {
        id: "w-bar-horiz-1",
        title: `Top Rankings by ${primaryCat}`,
        chartType: "bar",
        xCol: primaryCat,
        yCol: secondaryNum,
        aggregation: "sum",
        width: "1/2",
        height: 350,
        theme: "tableau-10",
        sort: "desc",
        limit: 8,
      },
      {
        id: "w-scatter-1",
        title: `Correlation: ${primaryNum} vs ${secondaryNum}`,
        chartType: "scatter",
        xCol: primaryNum,
        yCol: secondaryNum,
        colorCol: secondaryCat,
        aggregation: "sum",
        width: "1/2",
        height: 350,
        theme: "tableau-10",
      },
    ],
  };

  return [execDashboard, salesDashboard];
}
