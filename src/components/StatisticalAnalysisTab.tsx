import React, { useState, useMemo } from "react";
import { DatasetProfile } from "../types";
import {
  computeDetailedStats,
  runTwoSampleTTest,
  runOneWayAnova,
  runChiSquareTest,
  DetailedStats,
  TTestResult,
  AnovaResult,
  ChiSquareResult,
} from "../utils/statEngine";
import { PlotlyChart } from "./PlotlyChart";
import {
  Sigma,
  Table as TableIcon,
  FlaskConical,
  Activity,
  Download,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  Filter,
} from "lucide-react";

interface StatisticalAnalysisTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
  datasetName: string;
}

export const StatisticalAnalysisTab: React.FC<StatisticalAnalysisTabProps> = ({
  data,
  profile,
  datasetName,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"descriptive" | "hypothesis" | "normality" | "ci">(
    "descriptive"
  );

  // Filter for descriptive stats table
  const [searchTerm, setSearchTerm] = useState("");

  // All detailed stats for numerical columns
  const descriptiveStatsList = useMemo(() => {
    const list: DetailedStats[] = [];
    for (const col of profile.numericalColumns) {
      const stats = computeDetailedStats(col, data);
      if (stats) list.push(stats);
    }
    return list;
  }, [data, profile.numericalColumns]);

  const filteredStats = useMemo(() => {
    if (!searchTerm) return descriptiveStatsList;
    return descriptiveStatsList.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [descriptiveStatsList, searchTerm]);

  // -------------------------------------------------------------
  // Hypothesis Testing State
  // -------------------------------------------------------------
  const [testType, setTestType] = useState<"ttest" | "anova" | "chisquare">("ttest");

  // t-test state
  const [tTestVar, setTTestVar] = useState<string>(profile.numericalColumns[0] || "");
  const [tTestGroupCol, setTTestGroupCol] = useState<string>(profile.categoricalColumns[0] || "");
  const [alpha, setAlpha] = useState<number>(0.05);

  // Distinct groups available for selected categorical column
  const groupValues = useMemo(() => {
    if (!tTestGroupCol) return [];
    const set = new Set<string>();
    for (const row of data) {
      const val = String(row[tTestGroupCol] ?? "").trim();
      if (val) set.add(val);
    }
    return Array.from(set).sort();
  }, [data, tTestGroupCol]);

  const [group1, setGroup1] = useState<string>(groupValues[0] || "");
  const [group2, setGroup2] = useState<string>(groupValues[1] || "");

  // Update group defaults when categorical column changes
  React.useEffect(() => {
    if (groupValues.length >= 2) {
      setGroup1(groupValues[0]);
      setGroup2(groupValues[1]);
    }
  }, [groupValues]);

  // Execute t-test
  const tTestResult = useMemo<TTestResult | null>(() => {
    if (testType !== "ttest" || !tTestVar || !tTestGroupCol || !group1 || !group2 || group1 === group2) {
      return null;
    }
    return runTwoSampleTTest(data, tTestVar, tTestGroupCol, group1, group2, alpha);
  }, [data, testType, tTestVar, tTestGroupCol, group1, group2, alpha]);

  // ANOVA state & execution
  const [anovaVar, setAnovaVar] = useState<string>(profile.numericalColumns[0] || "");
  const [anovaGroupCol, setAnovaGroupCol] = useState<string>(profile.categoricalColumns[0] || "");
  const anovaResult = useMemo<AnovaResult | null>(() => {
    if (testType !== "anova" || !anovaVar || !anovaGroupCol) return null;
    return runOneWayAnova(data, anovaVar, anovaGroupCol, alpha);
  }, [data, testType, anovaVar, anovaGroupCol, alpha]);

  // Chi-Square state & execution
  const [chiCol1, setChiCol1] = useState<string>(profile.categoricalColumns[0] || "");
  const [chiCol2, setChiCol2] = useState<string>(profile.categoricalColumns[1] || profile.categoricalColumns[0] || "");
  const chiResult = useMemo<ChiSquareResult | null>(() => {
    if (testType !== "chisquare" || !chiCol1 || !chiCol2 || chiCol1 === chiCol2) return null;
    return runChiSquareTest(data, chiCol1, chiCol2, alpha);
  }, [data, testType, chiCol1, chiCol2, alpha]);

  // -------------------------------------------------------------
  // Normality & Distribution State
  // -------------------------------------------------------------
  const [normalityVar, setNormalityVar] = useState<string>(profile.numericalColumns[0] || "");
  const selectedNormalityStats = useMemo(() => {
    return descriptiveStatsList.find((s) => s.name === normalityVar) || descriptiveStatsList[0];
  }, [descriptiveStatsList, normalityVar]);

  // Normal distribution overlay chart
  const normalityChartData = useMemo(() => {
    if (!selectedNormalityStats) return [];
    const values = data.map((d) => Number(d[normalityVar])).filter((n) => !isNaN(n));
    return [
      {
        x: values,
        type: "histogram" as const,
        name: "Observed Data",
        histnorm: "probability density" as const,
        marker: { color: "#24211e", opacity: 0.75 },
      },
    ];
  }, [data, normalityVar, selectedNormalityStats]);

  // -------------------------------------------------------------
  // Confidence Interval Forest Plot
  // -------------------------------------------------------------
  const forestPlotData = useMemo(() => {
    const sorted = descriptiveStatsList.slice(0, 10);
    return [
      {
        x: sorted.map((s) => s.mean),
        y: sorted.map((s) => s.name),
        error_x: {
          type: "data" as const,
          symmetric: false,
          array: sorted.map((s) => s.ci95Upper - s.mean),
          arrayminus: sorted.map((s) => s.mean - s.ci95Lower),
          color: "#9a3412",
          thickness: 2,
          width: 6,
        },
        mode: "markers" as const,
        type: "scatter" as const,
        marker: { color: "#24211e", size: 8 },
        name: "Mean & 95% CI",
      },
    ];
  }, [descriptiveStatsList]);

  // Export descriptive statistics to CSV
  const handleExportCsv = () => {
    if (descriptiveStatsList.length === 0) return;
    const headers = [
      "Variable",
      "Count",
      "ValidCount",
      "MissingCount",
      "MissingPct",
      "Mean",
      "Median",
      "Mode",
      "StdDev",
      "Variance",
      "SEM",
      "CV%",
      "Min",
      "Q25",
      "Q75",
      "Max",
      "IQR",
      "Skewness",
      "Kurtosis",
      "95%_CI_Lower",
      "95%_CI_Upper",
    ];

    const rows = descriptiveStatsList.map((s) => [
      `"${s.name}"`,
      s.count,
      s.validCount,
      s.missingCount,
      s.missingPercentage,
      s.mean,
      s.median,
      typeof s.mode === "string" ? `"${s.mode}"` : s.mode,
      s.std,
      s.variance,
      s.sem,
      s.cv,
      s.min,
      s.q25,
      s.q75,
      s.max,
      s.iqr,
      s.skewness,
      s.kurtosis,
      s.ci95Lower,
      s.ci95Upper,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${datasetName}_descriptive_statistics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#fdfbf7] p-6 rounded-2xl border border-[#ded5c5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#24211e] text-[#f7f4ef] rounded-xl shadow-xs">
            <Sigma className="h-6 w-6 text-[#ded5c5]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1c1917] tracking-tight">
              Statistical Analysis & Hypothesis Testing
            </h1>
            <p className="text-xs text-[#736b5e]">
              Rigorous parametric and non-parametric estimators, two-sample t-tests, one-way ANOVA, and Chi-Square tests.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#24211e] text-[#f7f4ef] text-xs font-semibold hover:bg-[#38332e] transition-colors cursor-pointer shadow-xs self-start md:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>Export Stats CSV</span>
        </button>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-[#ede6d8] rounded-xl border border-[#dcd2c0] text-xs font-medium scrollbar-none">
        {[
          { id: "descriptive", label: "Descriptive Statistics Table", icon: TableIcon },
          { id: "hypothesis", label: "Hypothesis Testing (t-test / ANOVA / χ²)", icon: FlaskConical },
          { id: "normality", label: "Distribution & Normality", icon: Activity },
          { id: "ci", label: "Confidence Intervals (95% CI)", icon: TrendingUp },
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
      {/* 1. DESCRIPTIVE STATISTICS TABLE                                */}
      {/* ============================================================== */}
      {activeSubTab === "descriptive" && (
        <div className="bg-[#fdfbf7] rounded-xl border border-[#ded5c5] shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ebd7c1] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#1c1917]">Full Statistical Summary Matrix</h2>
              <p className="text-xs text-[#736b5e]">
                Central tendency, dispersion, higher-order moments (skewness, kurtosis), and error metrics.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-[#24211e]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f5efe4] text-[#736b5e] uppercase font-semibold border-b border-[#ded5c5]">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Variable</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Mean</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Median</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Std Dev</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Variance</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">SEM</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">CV%</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">IQR</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Range [Min, Max]</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Skewness</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Kurtosis</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">95% CI (Mean)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebd7c1]">
                {filteredStats.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#fbf8f2] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#1c1917]">{s.name}</td>
                    <td className="py-2.5 px-3 font-mono font-medium">{s.mean}</td>
                    <td className="py-2.5 px-3 font-mono">{s.median}</td>
                    <td className="py-2.5 px-3 font-mono">{s.std}</td>
                    <td className="py-2.5 px-3 font-mono text-[#736b5e]">{s.variance}</td>
                    <td className="py-2.5 px-3 font-mono text-[#736b5e]">{s.sem}</td>
                    <td className="py-2.5 px-3 font-mono">{s.cv}%</td>
                    <td className="py-2.5 px-3 font-mono">{s.iqr}</td>
                    <td className="py-2.5 px-3 font-mono text-[#736b5e]">
                      [{s.min}, {s.max}]
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                          Math.abs(s.skewness) > 1.0
                            ? "bg-amber-100 text-amber-900 font-bold"
                            : "bg-[#ede5d8] text-[#24211e]"
                        }`}
                      >
                        {s.skewness}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{s.kurtosis}</td>
                    <td className="py-2.5 px-3 font-mono text-[#9a3412] font-semibold whitespace-nowrap">
                      [{s.ci95Lower}, {s.ci95Upper}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. HYPOTHESIS TESTING SUITE                                    */}
      {/* ============================================================== */}
      {activeSubTab === "hypothesis" && (
        <div className="space-y-6">
          {/* Test Selector Tabs */}
          <div className="flex gap-2 border-b border-[#ded5c5] pb-2 text-xs font-semibold">
            <button
              onClick={() => setTestType("ttest")}
              className={`pb-2 px-3 border-b-2 cursor-pointer transition-colors ${
                testType === "ttest"
                  ? "border-[#24211e] text-[#1c1917]"
                  : "border-transparent text-[#8c8273] hover:text-[#1c1917]"
              }`}
            >
              Two-Sample Student's t-test (Welch)
            </button>
            <button
              onClick={() => setTestType("anova")}
              className={`pb-2 px-3 border-b-2 cursor-pointer transition-colors ${
                testType === "anova"
                  ? "border-[#24211e] text-[#1c1917]"
                  : "border-transparent text-[#8c8273] hover:text-[#1c1917]"
              }`}
            >
              One-Way ANOVA (F-Test)
            </button>
            <button
              onClick={() => setTestType("chisquare")}
              className={`pb-2 px-3 border-b-2 cursor-pointer transition-colors ${
                testType === "chisquare"
                  ? "border-[#24211e] text-[#1c1917]"
                  : "border-transparent text-[#8c8273] hover:text-[#1c1917]"
              }`}
            >
              Chi-Square (χ²) Test of Independence
            </button>
          </div>

          {/* Controls Bar */}
          <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {testType === "ttest" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">Numerical Metric:</label>
                    <select
                      value={tTestVar}
                      onChange={(e) => setTTestVar(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                    >
                      {profile.numericalColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">Grouping Dimension:</label>
                    <select
                      value={tTestGroupCol}
                      onChange={(e) => setTTestGroupCol(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                    >
                      {profile.categoricalColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">Group 1:</label>
                    <select
                      value={group1}
                      onChange={(e) => setGroup1(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                    >
                      {groupValues.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">Group 2:</label>
                    <select
                      value={group2}
                      onChange={(e) => setGroup2(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                    >
                      {groupValues.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {testType === "anova" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">Continuous Metric:</label>
                    <select
                      value={anovaVar}
                      onChange={(e) => setAnovaVar(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                    >
                      {profile.numericalColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">Multi-Category Factor:</label>
                    <select
                      value={anovaGroupCol}
                      onChange={(e) => setAnovaGroupCol(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                    >
                      {profile.categoricalColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {testType === "chisquare" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">Categorical Variable A:</label>
                    <select
                      value={chiCol1}
                      onChange={(e) => setChiCol1(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                    >
                      {profile.categoricalColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">Categorical Variable B:</label>
                    <select
                      value={chiCol2}
                      onChange={(e) => setChiCol2(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                    >
                      {profile.categoricalColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">Significance Level (α):</label>
                <select
                  value={alpha}
                  onChange={(e) => setAlpha(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
                >
                  <option value={0.01}>α = 0.01 (99% Confidence)</option>
                  <option value={0.05}>α = 0.05 (95% Confidence)</option>
                  <option value={0.1}>α = 0.10 (90% Confidence)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Presentation */}
          {testType === "ttest" && tTestResult && (
            <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-5">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  tTestResult.isSignificant
                    ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                    : "bg-[#fffbeb] border-[#fde68a] text-[#92400e]"
                }`}
              >
                {tTestResult.isSignificant ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {tTestResult.isSignificant
                      ? "Statistically Significant Difference Detected"
                      : "No Statistically Significant Difference"}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed">{tTestResult.interpretation}</p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">t-statistic</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">{tTestResult.tStat}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">Degrees of Freedom</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">{tTestResult.df}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">p-value</span>
                  <div className="text-lg font-bold font-mono text-[#9a3412] mt-1">{tTestResult.pValue}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">Cohen's d (Effect Size)</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">{tTestResult.cohensD}</div>
                </div>
              </div>

              {/* Group Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f5efe4] text-[#736b5e] font-semibold border-b border-[#ded5c5]">
                    <tr>
                      <th className="py-2.5 px-4">Group Name</th>
                      <th className="py-2.5 px-4">Sample Size (n)</th>
                      <th className="py-2.5 px-4">Mean</th>
                      <th className="py-2.5 px-4">Standard Deviation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ebd7c1]">
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-[#1c1917]">{tTestResult.group1Name}</td>
                      <td className="py-2.5 px-4 font-mono">{tTestResult.group1Count}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold">{tTestResult.group1Mean}</td>
                      <td className="py-2.5 px-4 font-mono">{tTestResult.group1Std}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-[#1c1917]">{tTestResult.group2Name}</td>
                      <td className="py-2.5 px-4 font-mono">{tTestResult.group2Count}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold">{tTestResult.group2Mean}</td>
                      <td className="py-2.5 px-4 font-mono">{tTestResult.group2Std}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {testType === "anova" && anovaResult && (
            <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-5">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  anovaResult.isSignificant
                    ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                    : "bg-[#fffbeb] border-[#fde68a] text-[#92400e]"
                }`}
              >
                {anovaResult.isSignificant ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {anovaResult.isSignificant
                      ? "Statistically Significant Variance Across Categories"
                      : "No Statistically Significant Variance"}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed">{anovaResult.interpretation}</p>
                </div>
              </div>

              {/* ANOVA Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">F-Statistic</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">{anovaResult.fStat}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">p-value</span>
                  <div className="text-lg font-bold font-mono text-[#9a3412] mt-1">{anovaResult.pValue}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">Eta-Squared (η²)</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">{anovaResult.etaSquared}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">DF (Between, Within)</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">
                    ({anovaResult.dfBetween}, {anovaResult.dfWithin})
                  </div>
                </div>
              </div>
            </div>
          )}

          {testType === "chisquare" && chiResult && (
            <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-5">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  chiResult.isSignificant
                    ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                    : "bg-[#fffbeb] border-[#fde68a] text-[#92400e]"
                }`}
              >
                {chiResult.isSignificant ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {chiResult.isSignificant
                      ? "Categorical Variables Are Significantly Associated"
                      : "Variables Appear Independent"}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed">{chiResult.interpretation}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">Chi-Square (χ²)</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">{chiResult.chi2}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">p-value</span>
                  <div className="text-lg font-bold font-mono text-[#9a3412] mt-1">{chiResult.pValue}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">Degrees of Freedom</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">{chiResult.df}</div>
                </div>
                <div className="p-3 bg-[#f7f4ee] rounded-xl border border-[#ded5c5]">
                  <span className="text-[11px] text-[#736b5e] uppercase">Cramer's V</span>
                  <div className="text-lg font-bold font-mono text-[#1c1917] mt-1">{chiResult.cramersV}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DISTRIBUTION & NORMALITY TESTING                            */}
      {/* ============================================================== */}
      {activeSubTab === "normality" && selectedNormalityStats && (
        <div className="space-y-6">
          <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] flex items-center justify-between shadow-xs">
            <label className="text-xs font-semibold text-[#44403c]">Select Variable to Check Normality:</label>
            <select
              value={normalityVar}
              onChange={(e) => setNormalityVar(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#ded5c5] bg-white text-xs font-medium"
            >
              {profile.numericalColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[#1c1917]">Observed Density vs Normal Distribution</h3>
              <PlotlyChart
                data={normalityChartData}
                layout={{
                  xaxis: { title: { text: normalityVar } },
                  yaxis: { title: { text: "Density" } },
                }}
                height={320}
              />
            </div>

            <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#1c1917]">Moments & Shape Diagnostics</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-[#f7f4ee] border border-[#ded5c5] space-y-1">
                  <span className="text-[#736b5e]">Skewness:</span>
                  <div className="font-bold text-sm font-mono text-[#1c1917]">{selectedNormalityStats.skewness}</div>
                  <span className="text-[11px] text-[#8c8273]">{selectedNormalityStats.skewnessType}</span>
                </div>

                <div className="p-3 rounded-lg bg-[#f7f4ee] border border-[#ded5c5] space-y-1">
                  <span className="text-[#736b5e]">Excess Kurtosis:</span>
                  <div className="font-bold text-sm font-mono text-[#1c1917]">{selectedNormalityStats.kurtosis}</div>
                  <span className="text-[11px] text-[#8c8273]">{selectedNormalityStats.kurtosisType}</span>
                </div>

                <div
                  className={`p-3 rounded-lg border text-[11px] font-medium ${
                    selectedNormalityStats.isNormalCandidate
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  {selectedNormalityStats.isNormalCandidate
                    ? "✓ Distribution conforms well to parametric normality assumptions."
                    : "⚠ Non-normal characteristics detected. Non-parametric methods recommended."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. CONFIDENCE INTERVALS (FOREST PLOT)                          */}
      {/* ============================================================== */}
      {activeSubTab === "ci" && (
        <div className="bg-[#fdfbf7] p-6 rounded-xl border border-[#ded5c5] shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#1c1917]">Population Mean 95% Confidence Intervals (Forest Plot)</h3>
            <p className="text-xs text-[#736b5e]">
              Error margins represent [x̄ - 1.96 × SEM, x̄ + 1.96 × SEM] for each quantitative continuous metric.
            </p>
          </div>

          <PlotlyChart
            data={forestPlotData}
            layout={{
              xaxis: { title: { text: "Estimated Population Mean with 95% Confidence Interval" } },
              yaxis: { title: { text: "Variable" } },
              margin: { l: 120, r: 30, t: 30, b: 50 },
            }}
            height={380}
          />
        </div>
      )}
    </div>
  );
};
