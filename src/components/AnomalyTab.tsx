import React, { useState, useMemo, useEffect } from "react";
import { DatasetProfile, AnomalyResult, BivariateAnomalyPoint } from "../types";
import { detectAnomalies, detectBivariateAnomalies } from "../utils/dataEngine";
import { PlotlyChart } from "./PlotlyChart";
import {
  AlertTriangle,
  Sparkles,
  Filter,
  ShieldAlert,
  SlidersHorizontal,
  Download,
  Search,
  Activity,
  Compass,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface AnomalyTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
}

interface BivariateAnomalyResult {
  points: BivariateAnomalyPoint[];
  anomalyCount: number;
  anomalyPercentage: number;
  threshold: number;
}

export const AnomalyTab: React.FC<AnomalyTabProps> = ({ data, profile }) => {
  const numCols = profile.numericalColumns;

  // Analysis Mode: 'univariate' | 'bivariate' | 'global'
  const [analysisMode, setAnalysisMode] = useState<"univariate" | "bivariate" | "global">("univariate");

  // Univariate State
  const [selectedCol, setSelectedCol] = useState<string>(() => numCols[0] || "");
  const [method, setMethod] = useState<"IQR" | "Z-Score" | "Isolation Forest">("IQR");
  const [threshold, setThreshold] = useState<number>(1.5);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyResult | null>(() =>
    numCols.length > 0 ? detectAnomalies(data, numCols[0], "IQR", 1.5) : null
  );

  // Bivariate State
  const [bivarColX, setBivarColX] = useState<string>(() => numCols[0] || "");
  const [bivarColY, setBivarColY] = useState<string>(() => numCols[1] || numCols[0] || "");
  const [bivarThreshold, setBivarThreshold] = useState<number>(3.0);
  const [bivarResults, setBivarResults] = useState<BivariateAnomalyResult | null>(() =>
    numCols.length >= 2 ? detectBivariateAnomalies(data, numCols[0], numCols[1] || numCols[0], 3.0) : null
  );

  // Outlier table search
  const [tableSearch, setTableSearch] = useState("");
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  // Keep state synchronized when dataset or profile changes
  useEffect(() => {
    if (numCols.length > 0) {
      const col1 = numCols.includes(selectedCol) ? selectedCol : numCols[0];
      setSelectedCol(col1);

      const bx = numCols.includes(bivarColX) ? bivarColX : numCols[0];
      const by = numCols.includes(bivarColY) ? bivarColY : (numCols[1] || numCols[0]);
      setBivarColX(bx);
      setBivarColY(by);

      setAnomalyResult(detectAnomalies(data, col1, method, threshold));
      if (numCols.length >= 2) {
        setBivarResults(detectBivariateAnomalies(data, bx, by, bivarThreshold));
      } else {
        setBivarResults(null);
      }
    } else {
      setSelectedCol("");
      setAnomalyResult(null);
      setBivarResults(null);
    }
  }, [data, profile]);

  // Global Scan of all columns
  const globalScan = useMemo(() => {
    return numCols.map((col) => {
      const res = detectAnomalies(data, col, "IQR", 1.5);
      return {
        column: col,
        count: res.anomalyCount,
        percentage: res.anomalyPercentage,
        lowerBound: res.lowerBound,
        upperBound: res.upperBound,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [data, numCols]);

  const handleRunUnivariate = () => {
    if (!selectedCol) return;
    const result = detectAnomalies(data, selectedCol, method, threshold);
    setAnomalyResult(result);
    setAiExplanation("");
  };

  const handleRunBivariate = () => {
    if (!bivarColX || !bivarColY) return;
    const res = detectBivariateAnomalies(data, bivarColX, bivarColY, bivarThreshold);
    setBivarResults(res);
  };

  const handleFetchAiExplanation = async () => {
    if (!anomalyResult) return;
    setLoadingAi(true);
    try {
      const resp = await fetch("/api/gemini/explain-artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Anomaly Detection",
          details: {
            column: anomalyResult.column,
            method: anomalyResult.method,
            threshold: anomalyResult.threshold,
            anomalyCount: anomalyResult.anomalyCount,
            anomalyPercentage: anomalyResult.anomalyPercentage,
            lowerBound: anomalyResult.lowerBound,
            upperBound: anomalyResult.upperBound,
            samples: anomalyResult.affectedRecords.slice(0, 5),
          },
          context: {
            rows: profile.rows,
            columns: profile.columns,
          },
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        setAiExplanation(json.explanation || "");
      }
    } catch (e) {
      setAiExplanation("AI explanation service unavailable.");
    } finally {
      setLoadingAi(false);
    }
  };

  const exportAnomaliesCSV = () => {
    if (!anomalyResult || anomalyResult.affectedRecords.length === 0) return;
    const headers = Object.keys(anomalyResult.affectedRecords[0]);
    const csv = [
      headers.join(","),
      ...anomalyResult.affectedRecords.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anomalies_${anomalyResult.column}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (numCols.length === 0) {
    return (
      <div className="rounded-2xl border border-[#ded5c5] bg-[#fdfbf7] p-8 text-center text-[#70685c]">
        No numerical columns available in this dataset for anomaly detection.
      </div>
    );
  }

  // Scatter chart data for univariate
  const univariateChartData: Plotly.Data[] = [];
  if (anomalyResult && data && data.length > 0) {
    const indices = Array.isArray(anomalyResult.anomalyIndices) ? anomalyResult.anomalyIndices : [];
    const normalIndices = data.map((_, i) => i).filter((i) => !indices.includes(i));
    
    univariateChartData.push({
      type: "scatter",
      mode: "markers",
      name: "Normal Points",
      x: normalIndices,
      y: normalIndices.map((i) => Number(data[i]?.[selectedCol])),
      marker: { color: "#443e37", size: 6, opacity: 0.65 },
    });

    if (indices.length > 0) {
      univariateChartData.push({
        type: "scatter",
        mode: "markers",
        name: "Detected Anomalies",
        x: indices,
        y: indices.map((i) => Number(data[i]?.[selectedCol])),
        marker: { color: "#b91c1c", size: 9, symbol: "diamond", line: { width: 2, color: "#7f1d1d" } },
      });
    }
  }

  // Bivariate Scatter chart data
  const bivariateChartData: Plotly.Data[] = [];
  if (bivarResults && Array.isArray(bivarResults.points)) {
    const normalBivar = bivarResults.points.filter((p) => !p.isAnomaly);
    const outlierBivar = bivarResults.points.filter((p) => p.isAnomaly);

    bivariateChartData.push({
      type: "scatter",
      mode: "markers",
      name: "Standard Covariance",
      x: normalBivar.map((p) => p.x),
      y: normalBivar.map((p) => p.y),
      marker: { color: "#544d44", size: 6, opacity: 0.65 },
    });

    if (outlierBivar.length > 0) {
      bivariateChartData.push({
        type: "scatter",
        mode: "markers",
        name: "Mahalanobis Outliers",
        x: outlierBivar.map((p) => p.x),
        y: outlierBivar.map((p) => p.y),
        text: outlierBivar.map((p) => `Dist: ${(p.score ?? 0).toFixed(2)}`),
        marker: { color: "#dc2626", size: 10, symbol: "diamond", line: { width: 2, color: "#991b1b" } },
      });
    }
  }

  // Filtered outlier records
  const filteredOutliers = (anomalyResult?.affectedRecords || []).filter((r) => {
    if (!tableSearch) return true;
    const term = tableSearch.toLowerCase();
    return Object.values(r).some((v) => String(v).toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-rose-700" />
            Statistical & Machine Learning Anomaly Detection
          </h2>
          <p className="text-xs text-[#70685c] mt-0.5">
            Univariate statistical thresholds (IQR, Z-Score), 2D Mahalanobis covariance distance, and dataset-wide scans.
          </p>
        </div>

        {/* Mode Selector Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-1 shadow-xs">
          <button
            onClick={() => setAnalysisMode("univariate")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              analysisMode === "univariate"
                ? "bg-[#24211e] text-[#f7f4ef] shadow-xs"
                : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Feature Anomaly</span>
          </button>
          <button
            onClick={() => {
              setAnalysisMode("bivariate");
              if (!bivarResults) handleRunBivariate();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              analysisMode === "bivariate"
                ? "bg-[#24211e] text-[#f7f4ef] shadow-xs"
                : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>2D Mahalanobis</span>
          </button>
          <button
            onClick={() => setAnalysisMode("global")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              analysisMode === "global"
                ? "bg-[#24211e] text-[#f7f4ef] shadow-xs"
                : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Global Ranking</span>
          </button>
        </div>
      </div>

      {/* MODE 1: UNIVARIATE ANOMALY DETECTION */}
      {analysisMode === "univariate" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Target Feature</label>
                <select
                  value={selectedCol}
                  onChange={(e) => setSelectedCol(e.target.value)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none cursor-pointer"
                >
                  {numCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Algorithm / Method</label>
                <select
                  value={method}
                  onChange={(e) => {
                    const m = e.target.value as "IQR" | "Z-Score" | "Isolation Forest";
                    setMethod(m);
                    if (m === "Z-Score") setThreshold(3.0);
                    else setThreshold(1.5);
                  }}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none cursor-pointer"
                >
                  <option value="IQR">Tukey IQR Fences (Robust)</option>
                  <option value="Z-Score">Z-Score Gaussian (Std Dev)</option>
                  <option value="Isolation Forest">Isolation Forest Proxy (Tree Depth)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[#5c554b] mb-1">
                  <span>Sensitivity Threshold</span>
                  <span className="font-mono text-[#1c1917]">{threshold}</span>
                </div>
                <input
                  type="range"
                  min={method === "Z-Score" ? 1.5 : 1.0}
                  max={method === "Z-Score" ? 4.5 : 3.0}
                  step={0.1}
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#ded5c5] rounded-lg appearance-none cursor-pointer accent-[#24211e]"
                />
              </div>

              <button
                onClick={handleRunUnivariate}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#24211e] px-4 py-2 text-xs font-semibold text-[#f7f4ef] shadow-xs hover:bg-[#38332e] transition-colors cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Detect Anomalies</span>
              </button>
            </div>
          </div>

          {anomalyResult && (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-xs font-semibold text-[#70685c] uppercase">Anomalies Detected</div>
                  <div className="text-2xl font-bold mt-1 text-rose-700">
                    {anomalyResult.anomalyCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-rose-700 mt-1 font-semibold">Flagged records</div>
                </div>

                <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-xs font-semibold text-[#70685c] uppercase">Anomaly Rate</div>
                  <div className="text-2xl font-bold mt-1 text-[#1c1917]">{anomalyResult.anomalyPercentage}%</div>
                  <div className="text-xs text-[#8c8273] mt-1">Of total records</div>
                </div>

                <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-xs font-semibold text-[#70685c] uppercase">Lower Bound</div>
                  <div className="text-2xl font-bold mt-1 text-[#1c1917]">
                    {anomalyResult.lowerBound !== undefined ? anomalyResult.lowerBound.toLocaleString() : "N/A"}
                  </div>
                  <div className="text-xs text-[#8c8273] mt-1">Lower fence limit</div>
                </div>

                <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-xs font-semibold text-[#70685c] uppercase">Upper Bound</div>
                  <div className="text-2xl font-bold mt-1 text-[#1c1917]">
                    {anomalyResult.upperBound !== undefined ? anomalyResult.upperBound.toLocaleString() : "N/A"}
                  </div>
                  <div className="text-xs text-[#8c8273] mt-1">Upper fence limit</div>
                </div>
              </div>

              {/* Scatter Chart */}
              <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs">
                <h3 className="text-sm font-bold text-[#1c1917] mb-2">
                  Distribution Dispersion Map: {selectedCol}
                </h3>
                <PlotlyChart
                  height={340}
                  data={univariateChartData}
                  layout={{
                    xaxis: { title: "Row / Index Position" },
                    yaxis: { title: selectedCol },
                  }}
                />
              </div>

              {/* AI Narrative Section */}
              <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#1c1917]">
                    <Sparkles className="h-4 w-4 text-[#24211e]" />
                    <span>AI Anomaly Explanation & Operational Remediation</span>
                  </div>
                  {!aiExplanation && (
                    <button
                      onClick={handleFetchAiExplanation}
                      disabled={loadingAi}
                      className="rounded-lg bg-[#24211e] px-3 py-1.5 text-xs font-semibold text-[#f7f4ef] shadow-xs hover:bg-[#38332e] transition-colors cursor-pointer"
                    >
                      {loadingAi ? "Analyzing with Gemini..." : "Generate AI Insights"}
                    </button>
                  )}
                </div>

                {aiExplanation ? (
                  <p className="text-xs sm:text-sm text-[#2c2824] leading-relaxed whitespace-pre-wrap">
                    {aiExplanation}
                  </p>
                ) : (
                  <p className="text-xs text-[#70685c]">
                    Click "Generate AI Insights" to obtain a grounded interpretation of these outliers, identifying whether they represent operational errors or high-value business anomalies.
                  </p>
                )}
              </div>

              {/* Outlier Data Table with Search & Export */}
              {anomalyResult.anomalyCount > 0 && (
                <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-[#1c1917] flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-700" />
                      <span>
                        Flagged Outlier Records ({filteredOutliers.length.toLocaleString()} of{" "}
                        {anomalyResult.anomalyCount.toLocaleString()})
                      </span>
                    </h3>

                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-[#8c8275]" />
                        <input
                          type="text"
                          placeholder="Search flagged records..."
                          value={tableSearch}
                          onChange={(e) => setTableSearch(e.target.value)}
                          className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] pl-7 pr-3 py-1 text-xs text-[#1c1917] placeholder-[#8c8275] focus:outline-none w-48"
                        />
                      </div>
                      <button
                        onClick={exportAnomaliesCSV}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1 text-xs font-semibold text-[#2c2824] hover:bg-[#ede5d8] cursor-pointer transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[#ded5c5]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#ded5c5] bg-[#f7f3eb] text-[#5c554b] font-semibold">
                          {Object.keys(anomalyResult.affectedRecords[0] || {}).map((c) => (
                            <th key={c} className="px-3 py-2 whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ede5d8] font-mono text-[11px]">
                        {filteredOutliers.slice(0, 30).map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#f5eee4]">
                            {Object.keys(row).map((c) => (
                              <td
                                key={c}
                                className={`px-3 py-2 whitespace-nowrap ${
                                  c === selectedCol ? "font-bold text-rose-700 bg-[#fae8e8]" : "text-[#2c2824]"
                                }`}
                              >
                                {String(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODE 2: BIVARIATE 2D MAHALANOBIS ANOMALIES */}
      {analysisMode === "bivariate" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Feature X</label>
                <select
                  value={bivarColX}
                  onChange={(e) => setBivarColX(e.target.value)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none cursor-pointer"
                >
                  {numCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Feature Y</label>
                <select
                  value={bivarColY}
                  onChange={(e) => setBivarColY(e.target.value)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none cursor-pointer"
                >
                  {numCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[#5c554b] mb-1">
                  <span>Mahalanobis Distance Cutoff</span>
                  <span className="font-mono text-[#1c1917]">{bivarThreshold} σ</span>
                </div>
                <input
                  type="range"
                  min={1.5}
                  max={5.0}
                  step={0.1}
                  value={bivarThreshold}
                  onChange={(e) => setBivarThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#ded5c5] rounded-lg appearance-none cursor-pointer accent-[#24211e]"
                />
              </div>

              <button
                onClick={handleRunBivariate}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#24211e] px-4 py-2 text-xs font-semibold text-[#f7f4ef] shadow-xs hover:bg-[#38332e] cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Compute 2D Covariance</span>
              </button>
            </div>
          </div>

          {bivarResults && bivarResults.points && (
            <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#1c1917]">
                    Bivariate Mahalanobis Outliers: {bivarColX} vs {bivarColY}
                  </h3>
                  <p className="text-xs text-[#70685c]">
                    Identifies multidimensional anomalies that deviate from joint feature covariance even if univariate bounds appear normal.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-md">
                    {bivarResults.anomalyCount ?? bivarResults.points.filter((p) => p.isAnomaly).length} Multidimensional Outliers
                  </span>
                </div>
              </div>

              <PlotlyChart
                height={380}
                data={bivariateChartData}
                layout={{
                  xaxis: { title: bivarColX },
                  yaxis: { title: bivarColY },
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* MODE 3: DATASET OVERVIEW (ALL COLUMNS RANKED) */}
      {analysisMode === "global" && (
        <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#1c1917]">Dataset-Wide Anomaly Risk Ranking</h3>
            <p className="text-xs text-[#70685c]">
              Comprehensive scan of all {numCols.length} numerical columns ranked by percentage of values exceeding standard IQR fences.
            </p>
          </div>

          <div className="space-y-3">
            {globalScan.map((col) => {
              const barWidth = Math.min(100, col.percentage * 5);
              return (
                <div key={col.column} className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1c1917]">{col.column}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#5c554b]">
                        {col.count.toLocaleString()} outliers ({col.percentage}%)
                      </span>
                      <button
                        onClick={() => {
                          setSelectedCol(col.column);
                          setAnalysisMode("univariate");
                          const res = detectAnomalies(data, col.column, "IQR", 1.5);
                          setAnomalyResult(res);
                        }}
                        className="rounded-md bg-[#24211e] px-2.5 py-1 text-[11px] font-semibold text-[#f7f4ef] hover:bg-[#38332e] cursor-pointer"
                      >
                        Deep Dive
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-[#ede5d8] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        col.percentage > 5 ? "bg-rose-700" : col.percentage > 1 ? "bg-amber-700" : "bg-emerald-700"
                      }`}
                      style={{ width: `${Math.max(3, barWidth)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#70685c]">
                    <span>Lower Fence: {col.lowerBound?.toLocaleString() ?? "-"}</span>
                    <span>Upper Fence: {col.upperBound?.toLocaleString() ?? "-"}</span>
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
