import React, { useState, useMemo } from "react";
import { DatasetProfile } from "../types";
import {
  generateEdaReport,
  computeKde,
  computeQqPlot,
  computeEcdf,
  computeParetoCategorical,
  computeNullityMatrix,
  computeCrossTabulation,
} from "../utils/edaEngine";
import { PlotlyChart } from "./PlotlyChart";
import {
  Compass,
  Layers,
  BarChart2,
  TrendingUp,
  AlertOctagon,
  Grid,
  CheckCircle2,
  AlertTriangle,
  Info,
  Hash,
  Type,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  Sliders,
  Maximize2,
  Activity,
  PieChart,
  Eye,
  Columns,
  Flame,
} from "lucide-react";

interface EDATabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
  datasetName: string;
}

export const EDATab: React.FC<EDATabProps> = ({ data, profile, datasetName }) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "univariate" | "bivariate" | "missingness" | "outliers" | "gallery"
  >("overview");

  // Univariate states
  const allColumns = Object.keys(profile.columnProfiles);
  const [selectedCol, setSelectedCol] = useState<string>(
    profile.numericalColumns[0] || allColumns[0] || ""
  );
  const [numericViewMode, setNumericViewMode] = useState<"hist_kde" | "box_violin" | "qq" | "ecdf">(
    "hist_kde"
  );
  const [categoricalViewMode, setCategoricalViewMode] = useState<"pareto" | "donut">("pareto");
  const [binCount, setBinCount] = useState<number>(20);

  // Bivariate states
  const [bivariateColX, setBivariateColX] = useState<string>(
    profile.numericalColumns[0] || allColumns[0] || ""
  );
  const [bivariateColY, setBivariateColY] = useState<string>(
    profile.numericalColumns[1] || profile.categoricalColumns[0] || allColumns[1] || ""
  );
  const [bivariatePlotType, setBivariatePlotType] = useState<"scatter" | "contour" | "box" | "bar">(
    "scatter"
  );

  // Outlier feature state
  const [outlierSelectedCol, setOutlierSelectedCol] = useState<string>(
    profile.numericalColumns[0] || ""
  );

  // Generate EDA Report
  const edaReport = useMemo(() => generateEdaReport(data, profile), [data, profile]);

  const selectedColProfile = profile.columnProfiles[selectedCol];
  const isSelectedColNumeric = selectedColProfile?.type === "Numerical";

  // =========================================================================
  // 1. OVERVIEW VISUALS: Type Composition & Cardinality Spectrum
  // =========================================================================
  const typeCompositionData = useMemo(() => {
    const counts = [
      { label: "Numerical", count: edaReport.numericalCount, color: "#24211e" },
      { label: "Categorical", count: edaReport.categoricalCount, color: "#78716c" },
      { label: "DateTime", count: edaReport.datetimeCount, color: "#a8a29e" },
      { label: "Boolean", count: edaReport.booleanCount, color: "#d6d3d1" },
      { label: "Identifier", count: edaReport.idCount, color: "#059669" },
    ].filter((item) => item.count > 0);

    return [
      {
        values: counts.map((c) => c.count),
        labels: counts.map((c) => c.label),
        type: "pie" as const,
        hole: 0.6,
        marker: {
          colors: counts.map((c) => c.color),
        },
        textinfo: "label+value" as const,
        hoverinfo: "label+value+percent" as const,
      },
    ];
  }, [edaReport]);

  const cardinalityChartData = useMemo(() => {
    const topItems = edaReport.cardinalitySpectrum.slice(0, 10).reverse();
    return [
      {
        x: topItems.map((c) => c.uniqueCount),
        y: topItems.map((c) => c.column),
        type: "bar" as const,
        orientation: "h" as const,
        marker: {
          color: topItems.map((c) => {
            if (c.level === "Constant") return "#ef4444";
            if (c.level === "Low (<10)") return "#3b82f6";
            if (c.level === "Medium (10-50)") return "#f59e0b";
            if (c.level === "High (>50)") return "#8b5cf6";
            return "#10b981";
          }),
        },
      },
    ];
  }, [edaReport]);

  // =========================================================================
  // 2. UNIVARIATE VISUALS: Hist + KDE, Box + Violin, Q-Q, ECDF, Pareto, Donut
  // =========================================================================
  const univariateNumericData = useMemo(() => {
    if (!isSelectedColNumeric || !selectedCol) return [];
    const values = data.map((d) => Number(d[selectedCol])).filter((n) => !isNaN(n));
    if (values.length === 0) return [];

    if (numericViewMode === "hist_kde") {
      const { x: kdeX, densityScaled } = computeKde(values, 60);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      const traces: any[] = [
        {
          x: values,
          type: "histogram",
          name: "Frequency",
          nbinsx: binCount,
          marker: {
            color: "#3d362e",
            line: { color: "#ded5c5", width: 1 },
          },
          opacity: 0.75,
        },
      ];

      if (kdeX.length > 1) {
        traces.push({
          x: kdeX,
          y: densityScaled,
          type: "scatter",
          mode: "lines",
          name: "Kernel Density (KDE)",
          line: { color: "#b91c1c", width: 2.5, shape: "spline" },
        });
      }

      return traces;
    }

    if (numericViewMode === "box_violin") {
      return [
        {
          y: values,
          type: "violin",
          name: selectedCol,
          box: { visible: true },
          meanline: { visible: true },
          points: "all",
          jitter: 0.35,
          pointpos: -1.2,
          marker: { color: "#78716c", size: 3, opacity: 0.5 },
          line: { color: "#24211e", width: 1.5 },
          fillcolor: "#ede5d8",
        },
      ];
    }

    if (numericViewMode === "qq") {
      const { theoretical, sample, lineX, lineY } = computeQqPlot(values);
      return [
        {
          x: theoretical,
          y: sample,
          type: "scatter",
          mode: "markers",
          name: "Sample vs Normal",
          marker: { color: "#24211e", size: 5, opacity: 0.8 },
        },
        {
          x: lineX,
          y: lineY,
          type: "scatter",
          mode: "lines",
          name: "Normal Reference (Q1-Q3)",
          line: { color: "#b91c1c", width: 2, dash: "dash" },
        },
      ];
    }

    if (numericViewMode === "ecdf") {
      const { x: ecdfX, y: ecdfY, percentiles } = computeEcdf(values);
      return [
        {
          x: ecdfX,
          y: ecdfY,
          type: "scatter",
          mode: "lines",
          name: "Empirical CDF",
          line: { color: "#24211e", width: 2.5 },
        },
        {
          x: percentiles.map((p) => p.value),
          y: percentiles.map((p) => p.p),
          type: "scatter",
          mode: "markers+text",
          name: "Key Percentiles",
          text: percentiles.map((p) => `${p.label} (${p.value.toFixed(1)})`),
          textposition: "bottom right",
          marker: { color: "#b91c1c", size: 8 },
        },
      ];
    }

    return [];
  }, [data, selectedCol, isSelectedColNumeric, numericViewMode, binCount]);

  // Univariate Categorical Visuals
  const univariateCategoricalData = useMemo(() => {
    if (isSelectedColNumeric || !selectedCol) return [];
    const pareto = computeParetoCategorical(data, selectedCol, 15);

    if (categoricalViewMode === "pareto") {
      return [
        {
          x: pareto.categories,
          y: pareto.counts,
          type: "bar" as const,
          name: "Frequency",
          marker: {
            color: "#3d362e",
            line: { color: "#ded5c5", width: 1 },
          },
        },
        {
          x: pareto.categories,
          y: pareto.cumulativePct,
          type: "scatter" as const,
          mode: "lines+markers" as const,
          name: "Cumulative %",
          yaxis: "y2" as const,
          line: { color: "#b91c1c", width: 2 },
          marker: { color: "#b91c1c", size: 6 },
        },
      ];
    }

    // Donut chart
    return [
      {
        values: pareto.counts,
        labels: pareto.categories,
        type: "pie" as const,
        hole: 0.55,
        marker: {
          colors: [
            "#24211e",
            "#44403c",
            "#78716c",
            "#a8a29e",
            "#d6d3d1",
            "#b91c1c",
            "#d97706",
            "#059669",
            "#2563eb",
            "#7c3aed",
          ],
        },
        textinfo: "label+percent" as const,
        hoverinfo: "label+value+percent" as const,
      },
    ];
  }, [data, selectedCol, isSelectedColNumeric, categoricalViewMode]);

  // =========================================================================
  // 3. BIVARIATE VISUALS: Num vs Num (OLS/Contour), Cat vs Num (Grouped Box), Cat vs Cat (Heatmap)
  // =========================================================================
  const isXNum = profile.columnProfiles[bivariateColX]?.type === "Numerical";
  const isYNum = profile.columnProfiles[bivariateColY]?.type === "Numerical";

  const bivariatePlotData = useMemo(() => {
    if (!bivariateColX || !bivariateColY) return [];

    // Case 1: Numerical vs Numerical
    if (isXNum && isYNum) {
      const pts = data
        .map((d) => ({
          x: Number(d[bivariateColX]),
          y: Number(d[bivariateColY]),
        }))
        .filter((p) => !isNaN(p.x) && !isNaN(p.y));

      if (pts.length === 0) return [];

      if (bivariatePlotType === "contour") {
        return [
          {
            x: pts.map((p) => p.x),
            y: pts.map((p) => p.y),
            type: "histogram2dcontour" as const,
            colorscale: [
              [0, "#fdfbf7"],
              [0.3, "#e7dfd1"],
              [0.6, "#9e9382"],
              [1, "#24211e"],
            ],
            contours: { coloring: "heatmap" },
            name: "Density Surface",
          },
        ];
      }

      // Linear regression fit line calculation
      const n = pts.length;
      const meanX = pts.reduce((s, p) => s + p.x, 0) / n;
      const meanY = pts.reduce((s, p) => s + p.y, 0) / n;
      let num = 0;
      let den = 0;
      for (const p of pts) {
        num += (p.x - meanX) * (p.y - meanY);
        den += (p.x - meanX) ** 2;
      }
      const slope = den !== 0 ? num / den : 0;
      const intercept = meanY - slope * meanX;

      const minX = Math.min(...pts.map((p) => p.x));
      const maxX = Math.max(...pts.map((p) => p.x));

      return [
        {
          x: pts.map((p) => p.x),
          y: pts.map((p) => p.y),
          mode: "markers" as const,
          type: "scatter" as const,
          marker: {
            color: "#24211e",
            size: 6,
            opacity: 0.65,
          },
          name: "Observations",
        },
        {
          x: [minX, maxX],
          y: [minX * slope + intercept, maxX * slope + intercept],
          mode: "lines" as const,
          type: "scatter" as const,
          name: `Trendline (m=${slope.toFixed(2)})`,
          line: { color: "#b91c1c", width: 2 },
        },
      ];
    }

    // Case 2: Categorical vs Categorical (Cross-tabulation Heatmap or Grouped Bar)
    if (!isXNum && !isYNum) {
      const crossTab = computeCrossTabulation(data, bivariateColX, bivariateColY, 8);
      return [
        {
          z: crossTab.matrix,
          x: crossTab.xLabels,
          y: crossTab.yLabels,
          type: "heatmap" as const,
          colorscale: [
            [0, "#fdfbf7"],
            [0.2, "#ede5d8"],
            [0.5, "#9e9382"],
            [1, "#24211e"],
          ],
          hoverongaps: false,
          name: "Co-occurrence",
        },
      ];
    }

    // Case 3: Categorical vs Numerical (Grouped Box Plots per Category)
    const catCol = !isXNum ? bivariateColX : bivariateColY;
    const numCol = isXNum ? bivariateColX : bivariateColY;

    // Get top 8 categories
    const catCounts: Record<string, number> = {};
    for (const row of data) {
      const c = String(row[catCol] ?? "(Missing)").trim();
      catCounts[c] = (catCounts[c] || 0) + 1;
    }
    const topCats = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map((e) => e[0]);

    if (bivariatePlotType === "bar") {
      const catMeans = topCats.map((cat) => {
        const vals = data
          .filter((d) => String(d[catCol] ?? "(Missing)").trim() === cat)
          .map((d) => Number(d[numCol]))
          .filter((n) => !isNaN(n));
        const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return { cat, mean };
      });

      return [
        {
          x: catMeans.map((c) => c.cat),
          y: catMeans.map((c) => Number(c.mean.toFixed(2))),
          type: "bar" as const,
          marker: { color: "#3d362e" },
          name: `Mean ${numCol}`,
        },
      ];
    }

    // Grouped Box Plots for each category
    return topCats.map((cat, idx) => {
      const vals = data
        .filter((d) => String(d[catCol] ?? "(Missing)").trim() === cat)
        .map((d) => Number(d[numCol]))
        .filter((n) => !isNaN(n));

      const palette = ["#24211e", "#44403c", "#57534e", "#78716c", "#8c8273", "#a8a29e", "#b91c1c", "#d97706"];
      return {
        y: vals,
        type: "box" as const,
        name: cat,
        marker: { color: palette[idx % palette.length] },
        boxpoints: "outliers" as const,
      };
    });
  }, [data, bivariateColX, bivariateColY, isXNum, isYNum, bivariatePlotType]);

  // =========================================================================
  // 4. MISSINGNESS VISUALS: Nullity Matrix & Rate Bar
  // =========================================================================
  const missingnessChartData = useMemo(() => {
    const topMissing = edaReport.missingnessList.slice(0, 15);
    return [
      {
        x: topMissing.map((m) => m.column),
        y: topMissing.map((m) => m.missingPercentage),
        type: "bar" as const,
        marker: {
          color: topMissing.map((m) =>
            m.missingPercentage > 15 ? "#b91c1c" : m.missingPercentage > 5 ? "#d97706" : "#8c8273"
          ),
        },
        name: "Missing %",
      },
    ];
  }, [edaReport]);

  const nullityMatrixData = useMemo(() => {
    const cols = allColumns.slice(0, 15);
    const { z, xLabels, yLabels } = computeNullityMatrix(data, cols, 40);
    if (z.length === 0) return [];

    return [
      {
        z,
        x: xLabels,
        y: yLabels,
        type: "heatmap" as const,
        colorscale: [
          [0, "#fee2e2"], // Missing is light red
          [1, "#24211e"], // Present is dark charcoal
        ],
        showscale: false,
        hoverinfo: "x+y" as const,
      },
    ];
  }, [data, allColumns]);

  // =========================================================================
  // 5. OUTLIER VISUALS: Multi-Feature Box Plots, Outlier Counts, Inlier vs Outlier Strip
  // =========================================================================
  const outlierBarChartData = useMemo(() => {
    const profs = edaReport.outlierProfiles.slice(0, 12).reverse();
    return [
      {
        x: profs.map((p) => p.outlierPercentage),
        y: profs.map((p) => p.column),
        type: "bar" as const,
        orientation: "h" as const,
        marker: {
          color: profs.map((p) => (p.outlierPercentage > 5 ? "#b91c1c" : "#f59e0b")),
        },
        text: profs.map((p) => `${p.outlierCount} outliers (${p.outlierPercentage}%)`),
        textposition: "outside" as const,
      },
    ];
  }, [edaReport]);

  // Standardized Z-Score Box Plots across all numerical features
  const standardizedBoxData = useMemo(() => {
    const numCols = profile.numericalColumns.slice(0, 8);
    return numCols.map((col) => {
      const vals = data.map((d) => Number(d[col])).filter((n) => !isNaN(n));
      if (vals.length < 2) return { y: [], type: "box" as const, name: col };

      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1)) || 1;
      const zScores = vals.map((v) => Number(((v - mean) / std).toFixed(2)));

      return {
        y: zScores,
        type: "box" as const,
        name: col,
        boxpoints: "outliers" as const,
        marker: { size: 4 },
      };
    });
  }, [data, profile.numericalColumns]);

  // Outlier scatter strip for single selected column
  const outlierScatterStripData = useMemo(() => {
    if (!outlierSelectedCol) return [];
    const prof = profile.columnProfiles[outlierSelectedCol];
    if (!prof || prof.q25 === undefined || prof.q75 === undefined) return [];

    const iqr = prof.q75 - prof.q25;
    const lowerFence = prof.q25 - 1.5 * iqr;
    const upperFence = prof.q75 + 1.5 * iqr;

    const values = data.map((d) => Number(d[outlierSelectedCol])).filter((n) => !isNaN(n));
    const inliers = values.filter((v) => v >= lowerFence && v <= upperFence);
    const outliers = values.filter((v) => v < lowerFence || v > upperFence);

    return [
      {
        y: inliers,
        x: inliers.map(() => 0 + (Math.random() - 0.5) * 0.4),
        type: "scatter" as const,
        mode: "markers" as const,
        name: `Normal Inliers (${inliers.length})`,
        marker: { color: "#44403c", size: 5, opacity: 0.6 },
      },
      {
        y: outliers,
        x: outliers.map(() => 0 + (Math.random() - 0.5) * 0.4),
        type: "scatter" as const,
        mode: "markers" as const,
        name: `Tukey Outliers (${outliers.length})`,
        marker: { color: "#b91c1c", size: 8, symbol: "x" },
      },
      // Lower Fence Line
      {
        x: [-0.6, 0.6],
        y: [lowerFence, lowerFence],
        type: "scatter" as const,
        mode: "lines" as const,
        name: `Lower Fence (${lowerFence.toFixed(2)})`,
        line: { color: "#b91c1c", dash: "dash", width: 1.5 },
      },
      // Upper Fence Line
      {
        x: [-0.6, 0.6],
        y: [upperFence, upperFence],
        type: "scatter" as const,
        mode: "lines" as const,
        name: `Upper Fence (${upperFence.toFixed(2)})`,
        line: { color: "#b91c1c", dash: "dash", width: 1.5 },
      },
    ];
  }, [data, profile.columnProfiles, outlierSelectedCol]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#fdfbf7] p-6 rounded-2xl border border-[#ded5c5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#24211e] text-[#f7f4ef] rounded-xl shadow-xs">
            <Compass className="h-6 w-6 text-[#ded5c5]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1c1917] tracking-tight">
              Exploratory Data Analysis (EDA)
            </h1>
            <p className="text-xs text-[#736b5e]">
              Visual distributions, density estimations, bivariate interactions, missingness matrix, and Tukey outlier diagnostics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#ede5d8] text-[#24211e] rounded-full text-xs font-semibold border border-[#d8cdbc]">
            {profile.rows.toLocaleString()} Records
          </span>
          <span className="px-3 py-1 bg-[#ede5d8] text-[#24211e] rounded-full text-xs font-semibold border border-[#d8cdbc]">
            {profile.columns} Features
          </span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-[#ede6d8] rounded-xl border border-[#dcd2c0] text-xs font-medium scrollbar-none">
        {[
          { id: "overview", label: "Visual Data Blueprint", icon: Layers },
          { id: "univariate", label: "Univariate Distributions", icon: BarChart2 },
          { id: "bivariate", label: "Bivariate & Interactions", icon: TrendingUp },
          { id: "missingness", label: "Missingness Matrix", icon: AlertOctagon },
          { id: "outliers", label: "Outlier Profiling", icon: Grid },
          { id: "gallery", label: "Distributions Gallery", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#fdfbf7] text-[#1c1917] font-semibold shadow-xs"
                  : "text-[#736b5e] hover:text-[#1c1917]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 1. OVERVIEW & VISUAL BLUEPRINT                                 */}
      {/* ============================================================== */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#ded5c5] shadow-xs">
              <span className="text-xs text-[#736b5e] font-medium uppercase tracking-wider">Completeness</span>
              <div className="text-2xl font-bold text-[#1c1917] mt-1">{edaReport.completenessScore}%</div>
              <p className="text-[11px] text-[#8c8273] mt-1">Sparsity: {edaReport.sparsityPercentage}%</p>
            </div>

            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#ded5c5] shadow-xs">
              <span className="text-xs text-[#736b5e] font-medium uppercase tracking-wider">Duplicates</span>
              <div className="text-2xl font-bold text-[#1c1917] mt-1">{edaReport.duplicateCount.toLocaleString()}</div>
              <p className="text-[11px] text-[#8c8273] mt-1">{edaReport.duplicatePercentage}% of total rows</p>
            </div>

            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#ded5c5] shadow-xs">
              <span className="text-xs text-[#736b5e] font-medium uppercase tracking-wider">Continuous Vars</span>
              <div className="text-2xl font-bold text-[#1c1917] mt-1">{edaReport.numericalCount}</div>
              <p className="text-[11px] text-[#8c8273] mt-1">Quantitative metrics</p>
            </div>

            <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#ded5c5] shadow-xs">
              <span className="text-xs text-[#736b5e] font-medium uppercase tracking-wider">Categorical Dimensions</span>
              <div className="text-2xl font-bold text-[#1c1917] mt-1">{edaReport.categoricalCount}</div>
              <p className="text-[11px] text-[#8c8273] mt-1">Discrete dimensions</p>
            </div>
          </div>

          {/* Visual Charts Row: Type Breakdown + Cardinality Spectrum */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-[#736b5e]" />
                  <h3 className="text-sm font-bold text-[#1c1917]">Feature Type Composition</h3>
                </div>
                <span className="text-[11px] text-[#8c8273]">{profile.columns} Total Attributes</span>
              </div>
              <PlotlyChart
                data={typeCompositionData}
                layout={{
                  showlegend: true,
                  legend: { orientation: "h", y: -0.15 },
                  margin: { l: 20, r: 20, t: 20, b: 40 },
                }}
                height={260}
              />
            </div>

            <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[#736b5e]" />
                  <h3 className="text-sm font-bold text-[#1c1917]">Top Features by Unique Cardinality</h3>
                </div>
                <span className="text-[11px] text-[#8c8273]">Unique values</span>
              </div>
              <PlotlyChart
                data={cardinalityChartData}
                layout={{
                  xaxis: { title: { text: "Unique Values Count" } },
                  margin: { l: 110, r: 20, t: 20, b: 40 },
                }}
                height={260}
              />
            </div>
          </div>

          {/* Automated EDA Findings */}
          <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#ebd7c1] pb-3">
              <Sparkles className="h-5 w-5 text-[#9a3412]" />
              <h2 className="text-base font-bold text-[#1c1917]">Automated EDA Structural Findings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {edaReport.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-1 ${
                    insight.type === "warning"
                      ? "bg-[#fffbeb] border-[#fde68a] text-[#92400e]"
                      : insight.type === "positive"
                      ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                      : "bg-[#f4f2ee] border-[#ded5c5] text-[#44403c]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      {insight.type === "warning" && <AlertTriangle className="h-4 w-4 shrink-0" />}
                      {insight.type === "positive" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      {insight.type === "info" && <Info className="h-4 w-4 shrink-0" />}
                      {insight.title}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/5">
                      {insight.category}
                    </span>
                  </div>
                  <p className="opacity-90 leading-relaxed">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Cardinality Spectrum Table */}
          <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#1c1917]">Feature Cardinality Spectrum</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f5efe4] text-[#736b5e] uppercase tracking-wider font-semibold border-b border-[#ded5c5]">
                  <tr>
                    <th className="py-2.5 px-4">Feature</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Unique Values</th>
                    <th className="py-2.5 px-4">Uniqueness Ratio</th>
                    <th className="py-2.5 px-4">Cardinality Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebd7c1]">
                  {edaReport.cardinalitySpectrum.map((item, idx) => {
                    const prof = profile.columnProfiles[item.column];
                    return (
                      <tr key={idx} className="hover:bg-[#fbf8f2] transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-[#1c1917]">{item.column}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#ede5d8] text-[#24211e]">
                            {prof?.type || "Unknown"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono">{item.uniqueCount.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono">{(item.ratio * 100).toFixed(2)}%</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.level === "Constant"
                                ? "bg-red-100 text-red-800"
                                : item.level === "Low (<10)"
                                ? "bg-blue-100 text-blue-800"
                                : item.level === "Medium (10-50)"
                                ? "bg-amber-100 text-amber-800"
                                : item.level === "High (>50)"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. UNIVARIATE ANALYSIS                                         */}
      {/* ============================================================== */}
      {activeSubTab === "univariate" && (
        <div className="space-y-6">
          {/* Feature Selector & View Controls */}
          <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#8c8273]" />
                <label className="text-xs font-semibold text-[#44403c]">Target Variable:</label>
              </div>
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#24211e]"
              >
                {allColumns.map((col) => (
                  <option key={col} value={col}>
                    {col} ({profile.columnProfiles[col]?.type})
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Switcher */}
            {isSelectedColNumeric ? (
              <div className="flex items-center gap-2">
                <div className="flex p-1 bg-[#ede6d8] rounded-lg border border-[#dcd2c0] text-xs">
                  <button
                    onClick={() => setNumericViewMode("hist_kde")}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      numericViewMode === "hist_kde" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                    }`}
                  >
                    Histogram + KDE
                  </button>
                  <button
                    onClick={() => setNumericViewMode("box_violin")}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      numericViewMode === "box_violin" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                    }`}
                  >
                    Violin & Box Plot
                  </button>
                  <button
                    onClick={() => setNumericViewMode("qq")}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      numericViewMode === "qq" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                    }`}
                  >
                    Q-Q Normality Plot
                  </button>
                  <button
                    onClick={() => setNumericViewMode("ecdf")}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      numericViewMode === "ecdf" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                    }`}
                  >
                    Empirical CDF
                  </button>
                </div>

                {numericViewMode === "hist_kde" && (
                  <div className="flex items-center gap-1 text-xs text-[#736b5e] pl-2 border-l border-[#dcd2c0]">
                    <span>Bins:</span>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      value={binCount}
                      onChange={(e) => setBinCount(Number(e.target.value))}
                      className="w-18 accent-[#24211e]"
                    />
                    <span className="w-5 text-right font-mono">{binCount}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex p-1 bg-[#ede6d8] rounded-lg border border-[#dcd2c0] text-xs">
                <button
                  onClick={() => setCategoricalViewMode("pareto")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoricalViewMode === "pareto" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                  }`}
                >
                  Pareto Frequency
                </button>
                <button
                  onClick={() => setCategoricalViewMode("donut")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    categoricalViewMode === "donut" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                  }`}
                >
                  Donut Proportion
                </button>
              </div>
            )}
          </div>

          {isSelectedColNumeric ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Primary Distribution Chart */}
              <div className="lg:col-span-2 bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1c1917]">
                    {numericViewMode === "hist_kde" && `Density & Frequency Distribution: ${selectedCol}`}
                    {numericViewMode === "box_violin" && `Violin Distribution & Box Jitter: ${selectedCol}`}
                    {numericViewMode === "qq" && `Quantile-Quantile (Q-Q) Normality Test: ${selectedCol}`}
                    {numericViewMode === "ecdf" && `Empirical Cumulative Distribution Function (ECDF): ${selectedCol}`}
                  </h3>
                  <span className="text-xs text-[#8c8273]">
                    {numericViewMode === "hist_kde" && "Kernel density curve overlaid"}
                    {numericViewMode === "box_violin" && "Raw point jitter with IQR box"}
                    {numericViewMode === "qq" && "Red dashed line = Normal theoretical quantiles"}
                    {numericViewMode === "ecdf" && "Cumulative probability [0 - 1.0]"}
                  </span>
                </div>

                <PlotlyChart
                  data={univariateNumericData}
                  layout={{
                    xaxis: {
                      title: {
                        text:
                          numericViewMode === "qq"
                            ? "Theoretical Normal Quantiles"
                            : selectedCol,
                      },
                    },
                    yaxis: {
                      title: {
                        text:
                          numericViewMode === "hist_kde"
                            ? "Frequency Count"
                            : numericViewMode === "qq"
                            ? `Observed ${selectedCol}`
                            : numericViewMode === "ecdf"
                            ? "Cumulative Probability P(X ≤ x)"
                            : selectedCol,
                      },
                    },
                    bargap: 0.05,
                  }}
                  height={350}
                />
              </div>

              {/* Statistical Five-Number Summary & Moments */}
              <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#1c1917]">Summary Statistics & Moments</h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Count (Valid):</span>
                    <span className="font-mono font-medium">
                      {(profile.rows - (selectedColProfile?.missingCount || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Mean (Average):</span>
                    <span className="font-mono font-bold text-[#1c1917]">{selectedColProfile?.mean ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Std Deviation:</span>
                    <span className="font-mono font-medium">{selectedColProfile?.std ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Min Value:</span>
                    <span className="font-mono font-medium">{selectedColProfile?.min ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Q1 (25th Percentile):</span>
                    <span className="font-mono font-medium">{selectedColProfile?.q25 ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Median (50th Percentile):</span>
                    <span className="font-mono font-bold text-[#1c1917]">{selectedColProfile?.median ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Q3 (75th Percentile):</span>
                    <span className="font-mono font-medium">{selectedColProfile?.q75 ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Max Value:</span>
                    <span className="font-mono font-medium">{selectedColProfile?.max ?? "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ebd7c1]">
                    <span className="text-[#736b5e]">Interquartile Range (IQR):</span>
                    <span className="font-mono font-medium">
                      {selectedColProfile?.q75 && selectedColProfile?.q25
                        ? (selectedColProfile.q75 - selectedColProfile.q25).toFixed(2)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#736b5e]">Skewness:</span>
                    <span
                      className={`font-mono font-bold ${
                        Math.abs(selectedColProfile?.skewness || 0) > 1 ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {selectedColProfile?.skewness ?? "N/A"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#f5efe4] rounded-lg border border-[#e2d5c0] text-[11px] text-[#736b5e]">
                  {Math.abs(selectedColProfile?.skewness || 0) < 0.5
                    ? "Distribution is approximately symmetric."
                    : selectedColProfile?.skewness && selectedColProfile.skewness > 0.5
                    ? "Distribution is moderately to heavily right-skewed (positive skew)."
                    : "Distribution is moderately to heavily left-skewed (negative skew)."}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1c1917]">
                    {categoricalViewMode === "pareto" ? "Pareto Distribution (Counts + Cumulative %)" : "Category Share (Donut Chart)"}
                  </h3>
                  <span className="text-xs text-[#8c8273]">Top categories shown</span>
                </div>

                <PlotlyChart
                  data={univariateCategoricalData}
                  layout={{
                    xaxis: { title: { text: selectedCol }, tickangle: -25 },
                    yaxis: { title: { text: "Frequency Count" } },
                    yaxis2:
                      categoricalViewMode === "pareto"
                        ? {
                            title: { text: "Cumulative %" },
                            overlaying: "y",
                            side: "right",
                            range: [0, 105],
                          }
                        : undefined,
                  }}
                  height={360}
                />
              </div>

              {/* Category Breakdown Table */}
              <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-[#1c1917]">Category Frequency Table</h3>
                <div className="overflow-y-auto max-h-[340px] text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#f5efe4] text-[#736b5e] uppercase sticky top-0">
                      <tr>
                        <th className="py-2 px-2.5">Category</th>
                        <th className="py-2 px-2.5 text-right">Count</th>
                        <th className="py-2 px-2.5 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ebd7c1]">
                      {Object.entries(selectedColProfile?.topCategories || {}).map(([cat, cnt], idx) => {
                        const pct = ((Number(cnt) / profile.rows) * 100).toFixed(1);
                        return (
                          <tr key={idx} className="hover:bg-[#fbf8f2]">
                            <td className="py-2 px-2.5 font-medium text-[#1c1917] truncate max-w-[120px]">{cat}</td>
                            <td className="py-2 px-2.5 text-right font-mono">{cnt.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-right font-mono text-[#736b5e]">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. BIVARIATE & CROSS-FEATURE ANALYSIS                          */}
      {/* ============================================================== */}
      {activeSubTab === "bivariate" && (
        <div className="space-y-6">
          <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#44403c]">Feature X:</label>
                <select
                  value={bivariateColX}
                  onChange={(e) => setBivariateColX(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                >
                  {allColumns.map((col) => (
                    <option key={col} value={col}>
                      {col} ({profile.columnProfiles[col]?.type})
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight className="h-4 w-4 text-[#8c8273]" />

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#44403c]">Feature Y:</label>
                <select
                  value={bivariateColY}
                  onChange={(e) => setBivariateColY(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                >
                  {allColumns.map((col) => (
                    <option key={col} value={col}>
                      {col} ({profile.columnProfiles[col]?.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Plot Type toggles depending on column pair */}
            {isXNum && isYNum && (
              <div className="flex p-1 bg-[#ede6d8] rounded-lg border border-[#dcd2c0] text-xs">
                <button
                  onClick={() => setBivariatePlotType("scatter")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    bivariatePlotType === "scatter" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                  }`}
                >
                  Scatter + OLS Fit
                </button>
                <button
                  onClick={() => setBivariatePlotType("contour")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    bivariatePlotType === "contour" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                  }`}
                >
                  2D Density Contour
                </button>
              </div>
            )}

            {((isXNum && !isYNum) || (!isXNum && isYNum)) && (
              <div className="flex p-1 bg-[#ede6d8] rounded-lg border border-[#dcd2c0] text-xs">
                <button
                  onClick={() => setBivariatePlotType("box")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    bivariatePlotType === "box" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                  }`}
                >
                  Grouped Box Plots
                </button>
                <button
                  onClick={() => setBivariatePlotType("bar")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    bivariatePlotType === "bar" ? "bg-white text-[#1c1917] font-bold shadow-xs" : "text-[#736b5e]"
                  }`}
                >
                  Mean Value Bar
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1c1917]">
                Cross-Feature Analysis: {bivariateColX} vs {bivariateColY}
              </h3>
              <span className="text-xs text-[#8c8273]">
                {isXNum && isYNum
                  ? "Quantitative correlation with least-squares trendline"
                  : !isXNum && !isYNum
                  ? "Contingency Matrix Heatmap (Frequency of Joint Co-occurrence)"
                  : "Category conditional distribution of continuous response"}
              </span>
            </div>
            <PlotlyChart
              data={bivariatePlotData}
              layout={{
                xaxis: { title: { text: bivariateColX } },
                yaxis: { title: { text: bivariateColY } },
              }}
              height={400}
            />
          </div>

          {/* Quick Correlation Pairs List */}
          {edaReport.topCorrelations.length > 0 && (
            <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#736b5e]">
                Top Discovered Bivariate Correlations
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {edaReport.topCorrelations.slice(0, 6).map((corr, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBivariateColX(corr.col1);
                      setBivariateColY(corr.col2);
                      setBivariatePlotType("scatter");
                    }}
                    className="p-3 rounded-lg border border-[#ded5c5] hover:border-[#24211e] bg-white transition-all text-left cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs text-[#1c1917] block">
                        {corr.col1} & {corr.col2}
                      </span>
                      <span className="text-[11px] text-[#8c8273]">{corr.relationship}</span>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                        corr.correlation > 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                      }`}
                    >
                      r = {corr.correlation}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MISSINGNESS MATRIX & HEATMAP                                */}
      {/* ============================================================== */}
      {activeSubTab === "missingness" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Missing Values Rate Bar Chart */}
            <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1c1917]">Missing Values Rate by Variable (%)</h3>
                <span className="text-xs text-[#8c8273]">Ranked by sparsity</span>
              </div>
              <PlotlyChart
                data={missingnessChartData}
                layout={{
                  xaxis: { title: { text: "Features" }, tickangle: -30 },
                  yaxis: { title: { text: "Missing Percentage (%)" }, range: [0, 100] },
                }}
                height={320}
              />
            </div>

            {/* Nullity Matrix Heatmap */}
            <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1c1917]">Nullity Matrix Heatmap (missingno-style)</h3>
                <span className="text-xs text-[#8c8273]">Dark = Present | Light Red = Missing</span>
              </div>
              <PlotlyChart
                data={nullityMatrixData}
                layout={{
                  xaxis: { tickangle: -35 },
                  yaxis: { showticklabels: false, title: { text: "Sampled Rows" } },
                  margin: { l: 40, r: 20, t: 20, b: 60 },
                }}
                height={320}
              />
            </div>
          </div>

          {/* Missingness Breakdown Table */}
          <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#1c1917]">Missingness Breakdown Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f5efe4] text-[#736b5e] uppercase font-semibold border-b border-[#ded5c5]">
                  <tr>
                    <th className="py-2.5 px-4">Feature</th>
                    <th className="py-2.5 px-4">Data Type</th>
                    <th className="py-2.5 px-4">Missing Cells</th>
                    <th className="py-2.5 px-4">Missing Ratio</th>
                    <th className="py-2.5 px-4">Data Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebd7c1]">
                  {edaReport.missingnessList.map((m, idx) => (
                    <tr key={idx} className="hover:bg-[#fbf8f2]">
                      <td className="py-2.5 px-4 font-semibold text-[#1c1917]">{m.column}</td>
                      <td className="py-2.5 px-4">{m.type}</td>
                      <td className="py-2.5 px-4 font-mono">{m.missingCount.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono">{m.missingPercentage}%</td>
                      <td className="py-2.5 px-4">
                        {m.missingPercentage === 0 ? (
                          <span className="text-[#059669] font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Complete (100%)
                          </span>
                        ) : m.missingPercentage < 5 ? (
                          <span className="text-[#d97706] font-medium">Low Missingness</span>
                        ) : (
                          <span className="text-[#b91c1c] font-medium">High Sparsity (Impute)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. OUTLIER PROFILING (TUKEY IQR & MULTI-FEATURE BOX PLOTS)     */}
      {/* ============================================================== */}
      {activeSubTab === "outliers" && (
        <div className="space-y-6">
          {/* Charts Row: Outlier Frequency Bar + Standardized Box Plot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1c1917]">Outlier Proportion by Variable (%)</h3>
                <span className="text-xs text-[#8c8273]">Tukey 1.5×IQR Rule</span>
              </div>
              <PlotlyChart
                data={outlierBarChartData}
                layout={{
                  xaxis: { title: { text: "Outlier Percentage (%)" } },
                  margin: { l: 110, r: 20, t: 20, b: 40 },
                }}
                height={300}
              />
            </div>

            <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1c1917]">Standardized Multi-Feature Box Plots</h3>
                <span className="text-xs text-[#8c8273]">Normalized Z-Scores (-4 to +4)</span>
              </div>
              <PlotlyChart
                data={standardizedBoxData}
                layout={{
                  yaxis: { title: { text: "Standardized Z-Score (σ)" } },
                  xaxis: { tickangle: -25 },
                  margin: { l: 45, r: 20, t: 20, b: 50 },
                }}
                height={300}
              />
            </div>
          </div>

          {/* Interactive Outlier Scatter Strip */}
          <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1c1917]">Inlier vs Outlier Distribution Strip</h3>
                <p className="text-xs text-[#736b5e]">
                  Inspect individual observations relative to the Upper Fence (Q3 + 1.5 × IQR) and Lower Fence (Q1 - 1.5 × IQR).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#44403c]">Select Variable:</label>
                <select
                  value={outlierSelectedCol}
                  onChange={(e) => setOutlierSelectedCol(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                >
                  {profile.numericalColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <PlotlyChart
              data={outlierScatterStripData}
              layout={{
                yaxis: { title: { text: outlierSelectedCol } },
                xaxis: { showticklabels: false, range: [-1, 1] },
                height: 320,
              }}
              height={320}
            />
          </div>

          {/* Outlier Diagnostics Summary Table */}
          <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1c1917]">Tukey 1.5×IQR Outlier Diagnostics Table</h3>
                <p className="text-xs text-[#736b5e]">
                  Features exceeding 5% outliers should be investigated for sensor anomalies or skewness before running linear models.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f5efe4] text-[#736b5e] uppercase font-semibold border-b border-[#ded5c5]">
                  <tr>
                    <th className="py-2.5 px-4">Numerical Variable</th>
                    <th className="py-2.5 px-4">Outlier Count</th>
                    <th className="py-2.5 px-4">Outlier %</th>
                    <th className="py-2.5 px-4">Lower Fence</th>
                    <th className="py-2.5 px-4">Upper Fence</th>
                    <th className="py-2.5 px-4">Extreme Range [Min, Max]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebd7c1]">
                  {edaReport.outlierProfiles.map((p, idx) => (
                    <tr key={idx} className="hover:bg-[#fbf8f2]">
                      <td className="py-2.5 px-4 font-semibold text-[#1c1917]">{p.column}</td>
                      <td className="py-2.5 px-4 font-mono font-medium">{p.outlierCount.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.outlierPercentage > 5
                              ? "bg-red-100 text-red-800"
                              : p.outlierPercentage > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {p.outlierPercentage}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono">{p.lowerFence}</td>
                      <td className="py-2.5 px-4 font-mono">{p.upperFence}</td>
                      <td className="py-2.5 px-4 font-mono text-[#736b5e]">
                        [{p.extremeMin}, {p.extremeMax}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. DISTRIBUTIONS GALLERY (MULTI-FEATURE GRID)                  */}
      {/* ============================================================== */}
      {activeSubTab === "gallery" && (
        <div className="space-y-6">
          <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1c1917]">Multi-Variable Distribution Gallery</h2>
              <p className="text-xs text-[#736b5e]">
                Instant comparative view of all numerical variables in the dataset to diagnose skewness, kurtosis, and modalities.
              </p>
            </div>
            <span className="px-3 py-1 bg-[#ede5d8] rounded-full text-xs font-semibold text-[#24211e]">
              {profile.numericalColumns.length} Numerical Variables
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {profile.numericalColumns.map((col) => {
              const vals = data.map((d) => Number(d[col])).filter((n) => !isNaN(n));
              const prof = profile.columnProfiles[col];

              return (
                <div key={col} className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1c1917] truncate">{col}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        Math.abs(prof?.skewness || 0) > 1
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      Skew: {prof?.skewness ?? 0}
                    </span>
                  </div>

                  <PlotlyChart
                    data={[
                      {
                        x: vals,
                        type: "histogram",
                        marker: { color: "#3d362e" },
                        nbinsx: 15,
                      },
                    ]}
                    layout={{
                      margin: { l: 25, r: 10, t: 10, b: 25 },
                      xaxis: { showticklabels: true },
                      yaxis: { showticklabels: false },
                    }}
                    height={160}
                  />

                  <div className="flex justify-between text-[10px] text-[#736b5e] pt-1 border-t border-[#ebd7c1]">
                    <span>Mean: {prof?.mean?.toFixed(1) ?? "N/A"}</span>
                    <span>Median: {prof?.median?.toFixed(1) ?? "N/A"}</span>
                    <span>Std: {prof?.std?.toFixed(1) ?? "N/A"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
