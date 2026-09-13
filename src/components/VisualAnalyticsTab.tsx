import React, { useState } from "react";
import { DatasetProfile, KpiCard } from "../types";
import { PlotlyChart } from "./PlotlyChart";
import { extractKpis } from "../utils/dataEngine";
import { Sparkles, Sliders, BarChart, TrendingUp, Layers } from "lucide-react";

interface VisualAnalyticsTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
}

export const VisualAnalyticsTab: React.FC<VisualAnalyticsTabProps> = ({ data, profile }) => {
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "builder">("dashboard");

  // Builder state
  const numCols = profile.numericalColumns;
  const catCols = profile.categoricalColumns;
  const dateCols = profile.datetimeColumns;

  const [chartType, setChartType] = useState<"bar" | "line" | "area" | "scatter" | "histogram" | "box" | "pie">("bar");
  const [xCol, setXCol] = useState<string>(catCols[0] || profile.columns > 0 ? Object.keys(data[0])[0] : "");
  const [yCol, setYCol] = useState<string>(numCols[0] || "");
  const [colorCol, setColorCol] = useState<string>("");
  const [aggregation, setAggregation] = useState<"sum" | "mean" | "count">("sum");

  const kpis: KpiCard[] = extractKpis(data, profile);

  // Auto-Dashboard charts preparation
  const primaryCat = catCols[0] || "Category";
  const primaryNum = numCols[0] || "Revenue";
  const secondaryCat = catCols[1] || catCols[0] || "Region";
  const secondaryNum = numCols[1] || numCols[0] || "Profit";
  const primaryDate = dateCols[0] || Object.keys(data[0] || {}).find((c) => c.toLowerCase().includes("date"));

  // Chart 1: Bar
  const catAgg: Record<string, number> = {};
  for (const row of data) {
    const k = String(row[primaryCat] || "Unknown");
    catAgg[k] = (catAgg[k] || 0) + (Number(row[primaryNum]) || 0);
  }
  const topCatData = Object.entries(catAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Chart 2: Donut
  const donutAgg: Record<string, number> = {};
  for (const row of data) {
    const k = String(row[secondaryCat] || "Unknown");
    donutAgg[k] = (donutAgg[k] || 0) + (Number(row[primaryNum]) || 0);
  }
  const donutData = Object.entries(donutAgg).slice(0, 6);

  // Chart 3: Timeline
  let timelineData: [string, number][] = [];
  if (primaryDate) {
    const timeAgg: Record<string, number> = {};
    for (const row of data) {
      const d = String(row[primaryDate] || "").slice(0, 7);
      timeAgg[d] = (timeAgg[d] || 0) + (Number(primaryNum in row ? row[primaryNum] : 0) || 0);
    }
    timelineData = Object.entries(timeAgg).sort((a, b) => a[0].localeCompare(b[0]));
  }

  // Builder Custom Chart Data preparation
  const buildCustomChartData = (): Plotly.Data[] => {
    if (chartType === "histogram") {
      return [
        {
          type: "histogram",
          x: data.map((d) => Number(d[xCol])).filter((v) => !isNaN(v)),
          marker: { color: "#3d3731" },
        },
      ];
    }

    if (chartType === "box") {
      return [
        {
          type: "box",
          y: data.map((d) => Number(d[yCol || xCol])).filter((v) => !isNaN(v)),
          x: colorCol ? data.map((d) => String(d[colorCol])) : undefined,
          marker: { color: "#443e37" },
        },
      ];
    }

    if (chartType === "scatter") {
      return [
        {
          type: "scatter",
          mode: "markers",
          x: data.map((d) => Number(d[xCol])),
          y: data.map((d) => Number(d[yCol])),
          text: colorCol ? data.map((d) => String(d[colorCol])) : undefined,
          marker: { color: "#3d3731", size: 7, opacity: 0.8 },
        },
      ];
    }

    if (chartType === "pie") {
      const aggMap: Record<string, number> = {};
      for (const row of data) {
        const k = String(row[xCol] || "Other");
        const v = yCol ? Number(row[yCol]) || 0 : 1;
        aggMap[k] = (aggMap[k] || 0) + v;
      }
      return [
        {
          type: "pie",
          labels: Object.keys(aggMap),
          values: Object.values(aggMap),
          hole: 0.4,
          marker: { colors: ["#24211e", "#443e37", "#6d6457", "#968b7b", "#bfb4a4", "#ded5c5"] },
        },
      ];
    }

    // Default Grouped / Aggregated Bar, Line, Area
    const groupMap: Record<string, { sum: number; count: number }> = {};
    for (const row of data) {
      const k = String(row[xCol] || "Unknown");
      const v = yCol ? Number(row[yCol]) || 0 : 1;
      if (!groupMap[k]) groupMap[k] = { sum: 0, count: 0 };
      groupMap[k].sum += v;
      groupMap[k].count += 1;
    }

    const sortedEntries = Object.entries(groupMap).slice(0, 20);
    const xVals = sortedEntries.map((e) => e[0]);
    const yVals = sortedEntries.map((e) =>
      aggregation === "mean" ? e[1].sum / (e[1].count || 1) : aggregation === "count" ? e[1].count : e[1].sum
    );

    if (chartType === "line") {
      return [
        {
          type: "scatter",
          mode: "lines+markers",
          x: xVals,
          y: yVals,
          line: { color: "#3d3731", width: 2.5 },
          marker: { color: "#24211e", size: 6 },
        },
      ];
    }

    if (chartType === "area") {
      return [
        {
          type: "scatter",
          mode: "lines",
          fill: "tozeroy",
          x: xVals,
          y: yVals,
          line: { color: "#3d3731" },
          fillcolor: "rgba(61, 55, 49, 0.15)",
        },
      ];
    }

    // Bar
    return [
      {
        type: "bar",
        x: xVals,
        y: yVals,
        marker: { color: "#3d3731" },
      },
    ];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Tabs */}
      <div className="flex items-center justify-between border-b border-[#ded5c5] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("dashboard")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "dashboard"
                ? "bg-[#24211e] text-[#f7f4ef] shadow-xs"
                : "text-[#70685c] hover:bg-[#ede5d8]"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Executive Dashboard</span>
          </button>
          <button
            onClick={() => setActiveSubTab("builder")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "builder"
                ? "bg-[#24211e] text-[#f7f4ef] shadow-xs"
                : "text-[#70685c] hover:bg-[#ede5d8]"
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Custom Chart Studio</span>
          </button>
        </div>
      </div>

      {activeSubTab === "dashboard" ? (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-sm">
                <div className="text-xs text-[#70685c] font-medium uppercase tracking-wider">{kpi.title}</div>
                <div className="mt-1 text-2xl font-bold text-[#1c1917]">{kpi.formattedTotal}</div>
                <div className="mt-1 text-xs text-emerald-700 font-semibold">Avg: {kpi.formattedAverage}</div>
              </div>
            ))}
          </div>

          {/* 2-Column Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#1c1917] mb-1">
                {primaryNum} by Top {primaryCat}
              </h3>
              <p className="text-xs text-[#70685c] mb-3">Highest aggregate contributors</p>
              <PlotlyChart
                height={300}
                data={[
                  {
                    type: "bar",
                    x: topCatData.map((d) => d[0]),
                    y: topCatData.map((d) => d[1]),
                    marker: { color: "#3d3731" },
                  },
                ]}
                layout={{ xaxis: { tickangle: -25 } }}
              />
            </div>

            <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#1c1917] mb-1">
                {primaryNum} Distribution by {secondaryCat}
              </h3>
              <p className="text-xs text-[#70685c] mb-3">Proportional share breakdown</p>
              <PlotlyChart
                height={300}
                data={[
                  {
                    type: "pie",
                    labels: donutData.map((d) => d[0]),
                    values: donutData.map((d) => d[1]),
                    hole: 0.4,
                    marker: { colors: ["#24211e", "#443e37", "#6d6457", "#968b7b", "#bfb4a4", "#ded5c5"] },
                  },
                ]}
              />
            </div>

            {timelineData.length > 0 && (
              <div className="lg:col-span-2 rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-sm">
                <h3 className="text-sm font-bold text-[#1c1917] mb-1">
                  Monthly Temporal Trajectory: {primaryNum}
                </h3>
                <p className="text-xs text-[#70685c] mb-3">Longitudinal aggregate trajectory over recorded dates</p>
                <PlotlyChart
                  height={280}
                  data={[
                    {
                      type: "scatter",
                      mode: "lines+markers",
                      x: timelineData.map((d) => d[0]),
                      y: timelineData.map((d) => d[1]),
                      line: { color: "#3d3731", width: 2.5 },
                      fill: "tozeroy",
                      fillcolor: "rgba(61, 55, 49, 0.08)",
                    },
                  ]}
                  layout={{ xaxis: { title: "Period" }, yaxis: { title: primaryNum } }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Chart Studio Builder */
        <div className="space-y-6">
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#1c1917] mb-4">Configure Visualization Parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Chart Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                  <option value="scatter">Scatter Plot</option>
                  <option value="histogram">Histogram</option>
                  <option value="box">Box Plot</option>
                  <option value="pie">Donut / Pie</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">X-Axis / Category</label>
                <select
                  value={xCol}
                  onChange={(e) => setXCol(e.target.value)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none"
                >
                  {Object.keys(data[0] || {}).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Y-Axis / Metric</label>
                <select
                  value={yCol}
                  onChange={(e) => setYCol(e.target.value)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none"
                >
                  <option value="">None / Count</option>
                  {numCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Grouping / Color</label>
                <select
                  value={colorCol}
                  onChange={(e) => setColorCol(e.target.value)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none"
                >
                  <option value="">None</option>
                  {catCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Aggregation</label>
                <select
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value as any)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none"
                >
                  <option value="sum">Sum</option>
                  <option value="mean">Average (Mean)</option>
                  <option value="count">Record Count</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-sm">
            <h3 className="text-base font-bold text-[#1c1917] mb-2">
              {chartType.toUpperCase()}: {yCol || "Count"} by {xCol}
            </h3>
            <PlotlyChart
              height={420}
              data={buildCustomChartData()}
              layout={{
                xaxis: { title: xCol, tickangle: -20 },
                yaxis: { title: yCol || "Value" },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
