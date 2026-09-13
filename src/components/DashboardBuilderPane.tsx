import React, { useState, useEffect } from "react";
import {
  DashboardWidget,
  DashboardChartType,
  DashboardAggregation,
  DashboardColorTheme,
  DashboardWidgetWidth,
  DatasetProfile,
} from "../types";
import { computeWidgetChart, THEME_PALETTES } from "../utils/dashboardEngine";
import { PlotlyChart } from "./PlotlyChart";
import {
  BarChart2,
  TrendingUp,
  PieChart,
  Target,
  Gauge,
  Table as TableIcon,
  X,
  Check,
  Palette,
  Sliders,
  Sparkles,
  Maximize,
  ArrowUpDown,
  Grid,
  Layers,
} from "lucide-react";

interface DashboardBuilderPaneProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: DashboardWidget) => void;
  initialWidget?: DashboardWidget | null;
  profile: DatasetProfile;
  rawData: Record<string, any>[];
}

const CHART_TYPES: { id: DashboardChartType; label: string; icon: any; desc: string }[] = [
  { id: "column", label: "Column", icon: BarChart2, desc: "Vertical comparison" },
  { id: "bar", label: "Bar", icon: BarChart2, desc: "Horizontal ranking" },
  { id: "line", label: "Line", icon: TrendingUp, desc: "Time trend" },
  { id: "area", label: "Area", icon: TrendingUp, desc: "Cumulative volume" },
  { id: "donut", label: "Donut", icon: PieChart, desc: "Share of whole" },
  { id: "pie", label: "Pie", icon: PieChart, desc: "Proportion" },
  { id: "scatter", label: "Scatter", icon: Sparkles, desc: "X vs Y correlation" },
  { id: "treemap", label: "Treemap", icon: Grid, desc: "Hierarchical blocks" },
  { id: "kpi", label: "KPI Metric", icon: Target, desc: "High-impact number" },
  { id: "gauge", label: "Gauge", icon: Gauge, desc: "Target speedometer" },
  { id: "funnel", label: "Funnel", icon: Layers, desc: "Stage progression" },
  { id: "table", label: "Pivot Table", icon: TableIcon, desc: "Detailed summary" },
];

const AGGREGATIONS: { id: DashboardAggregation; label: string }[] = [
  { id: "sum", label: "SUM (Total)" },
  { id: "mean", label: "AVERAGE (Mean)" },
  { id: "count", label: "COUNT (Records)" },
  { id: "median", label: "MEDIAN" },
  { id: "min", label: "MINIMUM" },
  { id: "max", label: "MAXIMUM" },
];

const THEMES: { id: DashboardColorTheme; label: string; colors: string[] }[] = [
  { id: "power-bi-classic", label: "Power BI Classic", colors: THEME_PALETTES["power-bi-classic"].slice(0, 5) },
  { id: "tableau-10", label: "Tableau 10", colors: THEME_PALETTES["tableau-10"].slice(0, 5) },
  { id: "warm-modern", label: "Modern Warm", colors: THEME_PALETTES["warm-modern"].slice(0, 5) },
  { id: "emerald-fresh", label: "Emerald Fresh", colors: THEME_PALETTES["emerald-fresh"].slice(0, 5) },
  { id: "cyber-indigo", label: "Cyber Indigo", colors: THEME_PALETTES["cyber-indigo"].slice(0, 5) },
  { id: "sunset-amber", label: "Sunset Amber", colors: THEME_PALETTES["sunset-amber"].slice(0, 5) },
];

export const DashboardBuilderPane: React.FC<DashboardBuilderPaneProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWidget,
  profile,
  rawData,
}) => {
  const catCols = profile.categoricalColumns || [];
  const numCols = profile.numericalColumns || [];
  const allCols = Object.keys(rawData[0] || {});

  const defaultCat = catCols[0] || allCols[0] || "Category";
  const defaultNum = numCols[0] || allCols[1] || allCols[0] || "Value";

  const [widgetState, setWidgetState] = useState<DashboardWidget>(() => {
    return (
      initialWidget || {
        id: `widget-${Date.now()}`,
        title: "New Visual",
        chartType: "column",
        xCol: defaultCat,
        yCol: defaultNum,
        aggregation: "sum",
        width: "1/2",
        height: 350,
        theme: "power-bi-classic",
        sort: "desc",
        limit: 8,
        showLegend: true,
      }
    );
  });

  // Keep synced if initialWidget changes
  useEffect(() => {
    if (initialWidget) {
      setWidgetState(initialWidget);
    } else {
      setWidgetState({
        id: `widget-${Date.now()}`,
        title: `${defaultNum} by ${defaultCat}`,
        chartType: "column",
        xCol: defaultCat,
        yCol: defaultNum,
        aggregation: "sum",
        width: "1/2",
        height: 350,
        theme: "power-bi-classic",
        sort: "desc",
        limit: 8,
        showLegend: true,
      });
    }
  }, [initialWidget, defaultCat, defaultNum, isOpen]);

  if (!isOpen) return null;

  // Auto title suggestion on field change
  const handleDimensionChange = (col: string) => {
    setWidgetState((prev) => ({
      ...prev,
      xCol: col,
      title:
        prev.title === "New Visual" || prev.title.includes("by")
          ? `${prev.yCol} by ${col}`
          : prev.title,
    }));
  };

  const handleMeasureChange = (col: string) => {
    setWidgetState((prev) => ({
      ...prev,
      yCol: col,
      title:
        prev.title === "New Visual" || prev.title.includes("by")
          ? `${col} by ${prev.xCol}`
          : prev.title,
    }));
  };

  // Preview computation
  const previewResult = computeWidgetChart(widgetState, rawData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-50 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-100/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 text-white rounded-lg shadow-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                {initialWidget ? "Configure Visual" : "Create New Visual"}
              </h3>
              <p className="text-xs text-stone-500">
                Power BI & Tableau style visual builder with dynamic shelves and live canvas preview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split 2 columns (Configuration Pane & Live Preview) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
          {/* Left Column: Visualizations & Shelves Configuration (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-140px)]">
            {/* 1. Visualizations Palette */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                1. Visualizations Palette
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {CHART_TYPES.map((ct) => {
                  const Icon = ct.icon;
                  const isSelected = widgetState.chartType === ct.id;
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => setWidgetState((prev) => ({ ...prev, chartType: ct.id }))}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-center text-center ${
                        isSelected
                          ? "border-amber-600 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/20 shadow-sm"
                          : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 mb-1.5 ${
                          isSelected ? "text-amber-700" : "text-stone-500"
                        }`}
                      />
                      <span className="text-xs font-semibold leading-none">{ct.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Field Shelves (Tableau / Power BI Well) */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  2. Field Shelves & Measures
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  {numCols.length} Measures • {catCols.length} Dimensions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dimension (X-Axis / Category / Row) */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Axis / Dimension (Category / Date)
                  </label>
                  <select
                    value={widgetState.xCol}
                    onChange={(e) => handleDimensionChange(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                  >
                    {allCols.map((col) => (
                      <option key={col} value={col}>
                        {catCols.includes(col) ? "🔤 " : "🔢 "}
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Measure (Y-Axis / Value) */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Values / Measure (Metric)
                  </label>
                  <select
                    value={widgetState.yCol}
                    onChange={(e) => handleMeasureChange(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                  >
                    {allCols.map((col) => (
                      <option key={col} value={col}>
                        {numCols.includes(col) ? "🔢 " : "🔤 "}
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aggregation Function */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Aggregation
                  </label>
                  <select
                    value={widgetState.aggregation}
                    onChange={(e) =>
                      setWidgetState((prev) => ({
                        ...prev,
                        aggregation: e.target.value as DashboardAggregation,
                      }))
                    }
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  >
                    {AGGREGATIONS.map((agg) => (
                      <option key={agg.id} value={agg.id}>
                        {agg.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Secondary Legend / Grouping (Optional) */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Legend / Breakdown (Optional)
                  </label>
                  <select
                    value={widgetState.colorCol || ""}
                    onChange={(e) =>
                      setWidgetState((prev) => ({
                        ...prev,
                        colorCol: e.target.value || undefined,
                      }))
                    }
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                  >
                    <option value="">(None - Single Series)</option>
                    {catCols.map((col) => (
                      <option key={col} value={col}>
                        🔤 {col}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sorting & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Sort Direction
                  </label>
                  <select
                    value={widgetState.sort || "desc"}
                    onChange={(e) =>
                      setWidgetState((prev) => ({
                        ...prev,
                        sort: e.target.value as "desc" | "asc" | "none",
                      }))
                    }
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    <option value="desc">Highest First (Descending)</option>
                    <option value="asc">Lowest First (Ascending)</option>
                    <option value="none">Alphabetical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Data Limit (Top N)
                  </label>
                  <select
                    value={widgetState.limit || 8}
                    onChange={(e) =>
                      setWidgetState((prev) => ({
                        ...prev,
                        limit: Number(e.target.value),
                      }))
                    }
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    <option value={5}>Top 5 Items</option>
                    <option value={8}>Top 8 Items</option>
                    <option value={12}>Top 12 Items</option>
                    <option value={20}>Top 20 Items</option>
                    <option value={50}>Top 50 Items</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Formatting & Themes */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                3. Title & Theme Formatting
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Visual Title
                  </label>
                  <input
                    type="text"
                    value={widgetState.title}
                    onChange={(e) =>
                      setWidgetState((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="E.g., Quarterly Revenue by Region"
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Grid Width
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["1/3", "1/2", "2/3", "full"] as DashboardWidgetWidth[]).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWidgetState((prev) => ({ ...prev, width: w }))}
                        className={`py-1.5 px-2 text-xs font-mono font-medium rounded-lg border transition-all ${
                          widgetState.width === w
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Color Theme Palette
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEMES.map((theme) => {
                    const isSelected = widgetState.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() =>
                          setWidgetState((prev) => ({ ...prev, theme: theme.id }))
                        }
                        className={`p-2 rounded-lg border text-left flex flex-col gap-1.5 transition-all ${
                          isSelected
                            ? "border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20"
                            : "border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <span className="text-[11px] font-medium text-stone-800">
                          {theme.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {theme.colors.map((c, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-full inline-block border border-black/10"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KPI specific targets */}
              {widgetState.chartType === "kpi" && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      KPI Subtitle
                    </label>
                    <input
                      type="text"
                      value={widgetState.kpiSubtitle || ""}
                      onChange={(e) =>
                        setWidgetState((prev) => ({ ...prev, kpiSubtitle: e.target.value }))
                      }
                      placeholder="E.g., Cumulative Target"
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Target Goal (Optional)
                    </label>
                    <input
                      type="number"
                      value={widgetState.kpiTarget || ""}
                      onChange={(e) =>
                        setWidgetState((prev) => ({
                          ...prev,
                          kpiTarget: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="E.g., 50000"
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Interactive Canvas Preview (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-stone-100/50 flex flex-col justify-between overflow-y-auto max-h-[calc(92vh-140px)]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Live Visual Preview
                </span>
                <span className="text-[11px] font-mono text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                  {widgetState.chartType.toUpperCase()}
                </span>
              </div>

              {/* Preview Card */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm min-h-[340px] flex flex-col justify-center">
                <h4 className="text-sm font-bold text-stone-900 mb-3 border-b border-stone-100 pb-2">
                  {widgetState.title || "Visual Preview"}
                </h4>

                {widgetState.chartType === "kpi" && previewResult.kpiStats && (
                  <div className="py-6 text-center">
                    <div className="text-4xl font-bold font-mono text-stone-900 mb-1">
                      {previewResult.kpiStats.formattedCurrent}
                    </div>
                    <div className="text-xs text-stone-500">
                      {previewResult.kpiStats.sublabel}
                    </div>
                    {previewResult.kpiStats.target !== undefined && (
                      <div className="mt-3 text-xs text-stone-600 font-medium">
                        Target: {previewResult.kpiStats.target.toLocaleString()} (
                        {previewResult.kpiStats.percentOfTarget?.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                )}

                {widgetState.chartType === "table" && previewResult.tableData && (
                  <div className="overflow-x-auto max-h-[280px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 font-mono text-[10px] uppercase text-stone-600 border-b">
                        <tr>
                          {previewResult.tableData.headers.map((h, i) => (
                            <th key={i} className="p-2">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {previewResult.tableData.rows.slice(0, 6).map((r, ri) => (
                          <tr key={ri}>
                            {r.map((v, vi) => (
                              <td key={vi} className="p-2 font-mono text-xs">
                                {String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {widgetState.chartType !== "kpi" &&
                  widgetState.chartType !== "table" &&
                  previewResult.plotlyData.length > 0 && (
                    <PlotlyChart
                      data={previewResult.plotlyData}
                      layout={previewResult.plotlyLayout}
                      height={300}
                    />
                  )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Power BI / Tableau tip:</strong> Try switching chart types or adding a secondary legend field to explore multi-dimensional distributions.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSave(widgetState)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {initialWidget ? "Update Visual" : "Add to Dashboard"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
