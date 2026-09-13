import React from "react";
import {
  DashboardWidget,
  DashboardWidgetWidth,
} from "../types";
import { PlotlyChart } from "./PlotlyChart";
import { computeWidgetChart } from "../utils/dashboardEngine";
import {
  BarChart2,
  TrendingUp,
  PieChart,
  Target,
  Gauge,
  Table as TableIcon,
  Filter,
  MoreVertical,
  Edit3,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
  rawData: Record<string, any>[];
  globalFilters: Record<string, string>;
  onEdit: (widget: DashboardWidget) => void;
  onDuplicate: (widget: DashboardWidget) => void;
  onDelete: (widgetId: string) => void;
  onMove: (widgetId: string, direction: "left" | "right") => void;
  onChangeWidth: (widgetId: string, width: DashboardWidgetWidth) => void;
  isFirst: boolean;
  isLast: boolean;
  readOnly?: boolean;
}

const WIDTH_CLASSES: Record<DashboardWidgetWidth, string> = {
  "1/3": "col-span-12 lg:col-span-4",
  "1/2": "col-span-12 lg:col-span-6",
  "2/3": "col-span-12 lg:col-span-8",
  full: "col-span-12",
};

export const DashboardWidgetCard: React.FC<DashboardWidgetCardProps> = ({
  widget,
  rawData,
  globalFilters,
  onEdit,
  onDuplicate,
  onDelete,
  onMove,
  onChangeWidth,
  isFirst,
  isLast,
  readOnly = false,
}) => {
  const result = computeWidgetChart(widget, rawData, globalFilters);

  const getChartIcon = () => {
    switch (widget.chartType) {
      case "kpi":
        return <Target className="w-4 h-4 text-amber-600" />;
      case "gauge":
        return <Gauge className="w-4 h-4 text-emerald-600" />;
      case "table":
        return <TableIcon className="w-4 h-4 text-stone-600" />;
      case "pie":
      case "donut":
        return <PieChart className="w-4 h-4 text-purple-600" />;
      case "line":
      case "area":
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return <BarChart2 className="w-4 h-4 text-indigo-600" />;
    }
  };

  const nextWidth = (current: DashboardWidgetWidth): DashboardWidgetWidth => {
    if (current === "1/3") return "1/2";
    if (current === "1/2") return "2/3";
    if (current === "2/3") return "full";
    return "1/3";
  };

  return (
    <div
      id={`widget-${widget.id}`}
      className={`${WIDTH_CLASSES[widget.width]} group bg-stone-50 border border-stone-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
    >
      {/* Widget Header */}
      <div className="flex items-start justify-between pb-3 border-b border-stone-200/80 mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-stone-100 rounded-lg shrink-0 border border-stone-200/60">
            {getChartIcon()}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-stone-900 truncate">
              {widget.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="uppercase tracking-wider font-mono text-[10px] bg-stone-200/70 text-stone-700 px-1.5 py-0.5 rounded">
                {widget.chartType}
              </span>
              {widget.aggregation && widget.chartType !== "scatter" && (
                <span className="text-[11px] font-mono text-stone-500">
                  {widget.aggregation.toUpperCase()} of {widget.yCol}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons (Tableau/Power BI Visual Toolbar) */}
        {!readOnly && (
          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Move Left */}
            <button
              onClick={() => onMove(widget.id, "left")}
              disabled={isFirst}
              title="Move Earlier"
              className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400 rounded hover:bg-stone-200/60"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {/* Move Right */}
            <button
              onClick={() => onMove(widget.id, "right")}
              disabled={isLast}
              title="Move Later"
              className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400 rounded hover:bg-stone-200/60"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {/* Width Toggle */}
            <button
              onClick={() => onChangeWidth(widget.id, nextWidth(widget.width))}
              title={`Cycle Width (Current: ${widget.width})`}
              className="px-1.5 py-0.5 text-[11px] font-mono font-medium text-stone-600 bg-stone-200/60 hover:bg-stone-200 rounded"
            >
              {widget.width}
            </button>
            {/* Edit */}
            <button
              onClick={() => onEdit(widget)}
              title="Configure Visual"
              className="p-1 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            {/* Duplicate */}
            <button
              onClick={() => onDuplicate(widget)}
              title="Duplicate Card"
              className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {/* Delete */}
            <button
              onClick={() => onDelete(widget.id)}
              title="Remove Card"
              className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Widget Content Body */}
      <div className="flex-1 flex flex-col justify-center min-h-[140px]">
        {/* Case 1: KPI Card */}
        {widget.chartType === "kpi" && result.kpiStats && (
          <div className="py-3 px-2 flex flex-col items-center justify-center text-center">
            <div className="text-3xl lg:text-4xl font-bold font-mono tracking-tight text-stone-900 mb-1">
              {result.kpiStats.formattedCurrent}
            </div>
            <div className="text-xs text-stone-500 font-medium">
              {result.kpiStats.sublabel}
            </div>
            {result.kpiStats.target !== undefined && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium">
                <span className="text-stone-500">
                  Target: {result.kpiStats.target.toLocaleString()}
                </span>
                {result.kpiStats.percentOfTarget !== undefined && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                      result.kpiStats.percentOfTarget >= 100
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {result.kpiStats.percentOfTarget >= 100 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {result.kpiStats.percentOfTarget.toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Case 2: Table Card */}
        {widget.chartType === "table" && result.tableData && (
          <div className="overflow-x-auto max-h-[340px] border border-stone-200 rounded-lg">
            <table className="w-full text-left text-xs text-stone-800">
              <thead className="bg-stone-100 text-stone-700 uppercase font-mono text-[10px] sticky top-0 border-b border-stone-200">
                <tr>
                  {result.tableData.headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {result.tableData.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-amber-50/40 transition-colors"
                  >
                    {row.map((val, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-2 px-3 whitespace-nowrap ${
                          cIdx === 0
                            ? "font-medium text-stone-900"
                            : "font-mono text-stone-700"
                        }`}
                      >
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Case 3: Plotly Charts (Column, Bar, Line, Area, Donut, Scatter, Gauge, Treemap, Funnel) */}
        {widget.chartType !== "kpi" &&
          widget.chartType !== "table" &&
          result.plotlyData.length > 0 && (
            <PlotlyChart
              data={result.plotlyData}
              layout={result.plotlyLayout}
              height={widget.height || 340}
              className="w-full"
            />
          )}

        {/* Case 4: No data matching */}
        {result.plotlyData.length === 0 &&
          widget.chartType !== "kpi" &&
          widget.chartType !== "table" && (
            <div className="flex flex-col items-center justify-center p-8 text-stone-400 text-xs">
              <Layers className="w-8 h-8 stroke-[1.2] mb-2" />
              <span>No data points to render</span>
            </div>
          )}
      </div>
    </div>
  );
};
