import React, { useState, useEffect, useRef } from "react";
import {
  DatasetProfile,
  DashboardWidget,
  DashboardWidgetWidth,
  DashboardColorTheme,
  CustomDashboard,
} from "../types";
import { DashboardWidgetCard } from "./DashboardWidgetCard";
import { DashboardBuilderPane } from "./DashboardBuilderPane";
import {
  generateDefaultDashboards,
  THEME_PALETTES,
} from "../utils/dashboardEngine";
import {
  LayoutDashboard,
  Plus,
  Sliders,
  Filter,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Layers,
  Palette,
  Trash2,
  Copy,
  ChevronDown,
  Target,
  BarChart2,
  PieChart,
  TrendingUp,
  Table as TableIcon,
  Gauge,
  Info,
} from "lucide-react";

interface DashboardStudioTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
  datasetName: string;
}

export const DashboardStudioTab: React.FC<DashboardStudioTabProps> = ({
  data,
  profile,
  datasetName,
}) => {
  const storageKey = `genai_dashboards_${datasetName.replace(/[^a-zA-Z0-9_]/g, "_")}`;

  // Dashboards state
  const [dashboards, setDashboards] = useState<CustomDashboard[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load dashboards from localStorage", e);
    }
    return generateDefaultDashboards(profile, datasetName);
  });

  const [activeDashboardId, setActiveDashboardId] = useState<string>(
    dashboards[0]?.id || "dash-executive-bi"
  );

  // Active dashboard
  const currentDashboard =
    dashboards.find((d) => d.id === activeDashboardId) || dashboards[0] || {
      id: "default",
      name: "Dashboard",
      widgets: [],
      theme: "power-bi-classic",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  // Save to localStorage when dashboards change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(dashboards));
    } catch (e) {
      console.error("Failed to save dashboards to localStorage", e);
    }
  }, [dashboards, storageKey]);

  // Visual Builder Modal state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);

  // Presentation / Fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Global Slicers / Filter state
  const [filterColumn, setFilterColumn] = useState<string>(
    profile.categoricalColumns[0] || ""
  );
  const [filterValue, setFilterValue] = useState<string>("__ALL__");

  // New dashboard modal state
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");

  // Hidden file input for JSON import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available filter values for the selected filter column
  const filterOptions = React.useMemo(() => {
    if (!filterColumn || !data.length) return [];
    const set = new Set<string>();
    for (const row of data) {
      const val = row[filterColumn];
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        set.add(String(val));
      }
    }
    return Array.from(set).sort().slice(0, 50);
  }, [filterColumn, data]);

  const globalFilters = React.useMemo(() => {
    if (!filterColumn || filterValue === "__ALL__") return {};
    return { [filterColumn]: filterValue };
  }, [filterColumn, filterValue]);

  // --- Handlers ---

  // Save or update widget
  const handleSaveWidget = (widget: DashboardWidget) => {
    setDashboards((prev) =>
      prev.map((d) => {
        if (d.id !== currentDashboard.id) return d;
        const exists = d.widgets.some((w) => w.id === widget.id);
        const updatedWidgets = exists
          ? d.widgets.map((w) => (w.id === widget.id ? widget : w))
          : [...d.widgets, widget];
        return {
          ...d,
          widgets: updatedWidgets,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    setIsBuilderOpen(false);
    setEditingWidget(null);
  };

  // Delete widget
  const handleDeleteWidget = (widgetId: string) => {
    setDashboards((prev) =>
      prev.map((d) => {
        if (d.id !== currentDashboard.id) return d;
        return {
          ...d,
          widgets: d.widgets.filter((w) => w.id !== widgetId),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Duplicate widget
  const handleDuplicateWidget = (widget: DashboardWidget) => {
    const cloned: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      title: `${widget.title} (Copy)`,
    };
    setDashboards((prev) =>
      prev.map((d) => {
        if (d.id !== currentDashboard.id) return d;
        return {
          ...d,
          widgets: [...d.widgets, cloned],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Move widget position
  const handleMoveWidget = (widgetId: string, direction: "left" | "right") => {
    setDashboards((prev) =>
      prev.map((d) => {
        if (d.id !== currentDashboard.id) return d;
        const idx = d.widgets.findIndex((w) => w.id === widgetId);
        if (idx === -1) return d;
        const targetIdx = direction === "left" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= d.widgets.length) return d;

        const newWidgets = [...d.widgets];
        const temp = newWidgets[idx];
        newWidgets[idx] = newWidgets[targetIdx];
        newWidgets[targetIdx] = temp;

        return { ...d, widgets: newWidgets, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Change widget width directly
  const handleChangeWidgetWidth = (widgetId: string, width: DashboardWidgetWidth) => {
    setDashboards((prev) =>
      prev.map((d) => {
        if (d.id !== currentDashboard.id) return d;
        return {
          ...d,
          widgets: d.widgets.map((w) => (w.id === widgetId ? { ...w, width } : w)),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Quick Add Preset
  const handleQuickAdd = (type: "kpi" | "column" | "donut" | "line" | "gauge" | "table") => {
    const primaryCat = profile.categoricalColumns[0] || Object.keys(data[0] || {})[0] || "Category";
    const primaryNum = profile.numericalColumns[0] || Object.keys(data[0] || {})[1] || "Value";

    let newWidget: DashboardWidget;

    if (type === "kpi") {
      newWidget = {
        id: `widget-${Date.now()}`,
        title: `Total ${primaryNum}`,
        chartType: "kpi",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "1/3",
        height: 170,
        theme: currentDashboard.theme || "power-bi-classic",
        kpiSubtitle: "Quick Metric",
      };
    } else if (type === "gauge") {
      newWidget = {
        id: `widget-${Date.now()}`,
        title: `${primaryNum} Performance Gauge`,
        chartType: "gauge",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "mean",
        width: "1/3",
        height: 320,
        theme: currentDashboard.theme || "power-bi-classic",
        kpiTarget: 1000,
      };
    } else if (type === "donut") {
      newWidget = {
        id: `widget-${Date.now()}`,
        title: `${primaryNum} Share by ${primaryCat}`,
        chartType: "donut",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "1/3",
        height: 340,
        theme: currentDashboard.theme || "power-bi-classic",
        limit: 6,
      };
    } else if (type === "line") {
      const dateCol = profile.datetimeColumns[0] || primaryCat;
      newWidget = {
        id: `widget-${Date.now()}`,
        title: `${primaryNum} Trend by ${dateCol}`,
        chartType: "line",
        xCol: dateCol,
        yCol: primaryNum,
        aggregation: "sum",
        width: "1/2",
        height: 340,
        theme: currentDashboard.theme || "power-bi-classic",
        limit: 12,
      };
    } else if (type === "table") {
      newWidget = {
        id: `widget-${Date.now()}`,
        title: `${primaryCat} Breakdown Table`,
        chartType: "table",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "1/2",
        height: 340,
        theme: currentDashboard.theme || "power-bi-classic",
        limit: 10,
      };
    } else {
      newWidget = {
        id: `widget-${Date.now()}`,
        title: `${primaryNum} by ${primaryCat}`,
        chartType: "column",
        xCol: primaryCat,
        yCol: primaryNum,
        aggregation: "sum",
        width: "1/2",
        height: 350,
        theme: currentDashboard.theme || "power-bi-classic",
        sort: "desc",
        limit: 8,
      };
    }

    setDashboards((prev) =>
      prev.map((d) => {
        if (d.id !== currentDashboard.id) return d;
        return {
          ...d,
          widgets: [...d.widgets, newWidget],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Reset to default templates
  const handleResetTemplates = () => {
    if (confirm("Reset current dashboards to starter Power BI & Tableau templates?")) {
      const fresh = generateDefaultDashboards(profile, datasetName);
      setDashboards(fresh);
      setActiveDashboardId(fresh[0].id);
    }
  };

  // Create new blank dashboard
  const handleCreateDashboard = () => {
    if (!newDashboardName.trim()) return;
    const newDash: CustomDashboard = {
      id: `dash-${Date.now()}`,
      name: newDashboardName.trim(),
      description: "Custom user created dashboard workspace.",
      theme: "power-bi-classic",
      widgets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDashboards((prev) => [...prev, newDash]);
    setActiveDashboardId(newDash.id);
    setNewDashboardName("");
    setIsCreatingDashboard(false);
  };

  // Delete dashboard
  const handleDeleteDashboard = (dashId: string) => {
    if (dashboards.length <= 1) {
      alert("At least one dashboard must remain in the workspace.");
      return;
    }
    if (confirm("Are you sure you want to delete this dashboard?")) {
      const remaining = dashboards.filter((d) => d.id !== dashId);
      setDashboards(remaining);
      setActiveDashboardId(remaining[0].id);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dashboards, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${datasetName}_dashboards.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported) && imported.length > 0 && imported[0].widgets) {
          setDashboards(imported);
          setActiveDashboardId(imported[0].id);
          alert("Dashboards imported successfully!");
        } else {
          alert("Invalid dashboard configuration JSON file.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-stone-100 p-6 overflow-y-auto" : ""}`}>
      {/* Workspace Header Toolbar (Power BI / Tableau Command Ribbon) */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Section Title & Switcher */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-sm">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900">
                  Dashboard Studio
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Power BI & Tableau Engine
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Interactive workspace with dynamic visualization shelves, slicers, and grid management
              </p>
            </div>
          </div>

          {/* Right: Master Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Presentation Fullscreen"}
              className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium shadow-xs"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Exit</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Present</span>
                </>
              )}
            </button>

            {/* Print / Snapshot */}
            <button
              onClick={() => window.print()}
              title="Print or Save PDF"
              className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 rounded-xl transition-colors text-xs font-medium shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportJSON}
              title="Export Dashboards Config"
              className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 rounded-xl transition-colors text-xs font-medium shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* Import JSON */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import Dashboards Config"
              className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 rounded-xl transition-colors text-xs font-medium shadow-xs flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />

            {/* Add Visual Button */}
            <button
              onClick={() => {
                setEditingWidget(null);
                setIsBuilderOpen(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Visual</span>
            </button>
          </div>
        </div>

        {/* Dashboard Tabs & Controls Ribbon */}
        <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Dashboard Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {dashboards.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDashboardId(d.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeDashboardId === d.id
                    ? "bg-stone-900 text-white shadow-xs font-semibold"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                <span>{d.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    activeDashboardId === d.id
                      ? "bg-stone-800 text-stone-300"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {d.widgets.length}
                </span>
              </button>
            ))}

            {/* Create Dashboard Button */}
            <button
              onClick={() => setIsCreatingDashboard(true)}
              className="p-1.5 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg text-xs"
              title="Create New Dashboard Page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Reset Templates Button */}
            <button
              onClick={handleResetTemplates}
              className="p-1.5 text-stone-400 hover:text-stone-700 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg text-xs ml-1"
              title="Reset Starter Templates"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Delete active dashboard (if > 1) */}
          {dashboards.length > 1 && (
            <button
              onClick={() => handleDeleteDashboard(currentDashboard.id)}
              className="text-xs text-stone-400 hover:text-red-600 flex items-center gap-1 self-end sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Page</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Slicers / Interactive Filters Ribbon (Power BI Page Slicers) */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
            <Filter className="w-4 h-4 text-amber-600" />
            <span>Global Slicer Filter:</span>
          </div>

          {/* Column selector */}
          <select
            value={filterColumn}
            onChange={(e) => {
              setFilterColumn(e.target.value);
              setFilterValue("__ALL__");
            }}
            className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-stone-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono"
          >
            <option value="">(Select Dimension Column)</option>
            {profile.categoricalColumns.map((col) => (
              <option key={col} value={col}>
                🔤 {col}
              </option>
            ))}
            {profile.datetimeColumns.map((col) => (
              <option key={col} value={col}>
                📅 {col}
              </option>
            ))}
          </select>

          {/* Value selector */}
          {filterColumn && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-stone-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-medium"
            >
              <option value="__ALL__">All {filterColumn} (No Filter)</option>
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filter Button */}
          {filterValue !== "__ALL__" && (
            <button
              onClick={() => setFilterValue("__ALL__")}
              className="text-xs text-amber-700 hover:text-amber-900 bg-amber-100/60 hover:bg-amber-100 px-2 py-0.5 rounded-md font-medium transition-colors"
            >
              Clear Slicer
            </button>
          )}
        </div>

        {/* Quick Add Pills */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500 overflow-x-auto">
          <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-wider text-stone-400">
            Quick Add:
          </span>
          <button
            onClick={() => handleQuickAdd("kpi")}
            className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <Target className="w-3 h-3 text-amber-600" />
            <span>KPI</span>
          </button>
          <button
            onClick={() => handleQuickAdd("column")}
            className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <BarChart2 className="w-3 h-3 text-indigo-600" />
            <span>Column</span>
          </button>
          <button
            onClick={() => handleQuickAdd("donut")}
            className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <PieChart className="w-3 h-3 text-purple-600" />
            <span>Donut</span>
          </button>
          <button
            onClick={() => handleQuickAdd("line")}
            className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <TrendingUp className="w-3 h-3 text-blue-600" />
            <span>Line</span>
          </button>
          <button
            onClick={() => handleQuickAdd("gauge")}
            className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <Gauge className="w-3 h-3 text-emerald-600" />
            <span>Gauge</span>
          </button>
          <button
            onClick={() => handleQuickAdd("table")}
            className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <TableIcon className="w-3 h-3 text-stone-600" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main Visuals Grid Canvas */}
      {currentDashboard.widgets.length === 0 ? (
        <div className="bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-amber-100 text-amber-700 rounded-full">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Your Dashboard Canvas is Ready
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Add your first interactive chart, KPI metric, or pivot table using the Visual Builder, or populate instant starter charts.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setEditingWidget(null);
                  setIsBuilderOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Open Visual Builder</span>
              </button>
              <button
                onClick={handleResetTemplates}
                className="px-4 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-xl text-xs font-medium"
              >
                Load Starter Template
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {currentDashboard.widgets.map((widget, index) => (
            <DashboardWidgetCard
              key={widget.id}
              widget={widget}
              rawData={data}
              globalFilters={globalFilters}
              onEdit={(w) => {
                setEditingWidget(w);
                setIsBuilderOpen(true);
              }}
              onDuplicate={handleDuplicateWidget}
              onDelete={handleDeleteWidget}
              onMove={handleMoveWidget}
              onChangeWidth={handleChangeWidgetWidth}
              isFirst={index === 0}
              isLast={index === currentDashboard.widgets.length - 1}
              readOnly={false}
            />
          ))}
        </div>
      )}

      {/* Visual Builder Modal Pane */}
      {isBuilderOpen && (
        <DashboardBuilderPane
          isOpen={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingWidget(null);
          }}
          onSave={handleSaveWidget}
          initialWidget={editingWidget}
          profile={profile}
          rawData={data}
        />
      )}

      {/* New Dashboard Modal Prompt */}
      {isCreatingDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Create New Dashboard
            </h3>
            <p className="text-xs text-stone-500">
              Give your new dashboard page a clear name (e.g. "Customer Cohorts", "Marketing ROI").
            </p>
            <input
              type="text"
              autoFocus
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateDashboard();
              }}
              placeholder="Dashboard Name"
              className="w-full text-xs bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreatingDashboard(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDashboard}
                disabled={!newDashboardName.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
