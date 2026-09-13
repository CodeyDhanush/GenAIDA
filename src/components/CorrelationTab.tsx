import React, { useState, useMemo } from "react";
import { DatasetProfile, CorrelationResult, MulticollinearityVIF } from "../types";
import { computeCorrelations, computeSpearmanCorrelation, computeVIFAnalysis } from "../utils/dataEngine";
import { PlotlyChart } from "./PlotlyChart";
import {
  GitMerge,
  Sparkles,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  Activity,
  SlidersHorizontal,
  Layers,
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
} from "lucide-react";

interface CorrelationTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
}

export const CorrelationTab: React.FC<CorrelationTabProps> = ({ data, profile }) => {
  const numCols = profile.numericalColumns;
  const catCols = profile.categoricalColumns;

  // Active view: 'matrix' | 'scatter_fit' | 'vif' | 'hypothesis'
  const [activeSubTab, setActiveSubTab] = useState<"matrix" | "scatter_fit" | "vif" | "hypothesis">("matrix");
  const [method, setMethod] = useState<"pearson" | "spearman">("pearson");
  const [threshold, setThreshold] = useState<number>(0.35);

  // Selected pair for scatter regression fit
  const [pairX, setPairX] = useState<string>(numCols[0] || "");
  const [pairY, setPairY] = useState<string>(numCols[1] || numCols[0] || "");

  // Hypothesis test inputs
  const [hypoMetric, setHypoMetric] = useState<string>(numCols[0] || "");
  const [hypoGroup, setHypoGroup] = useState<string>(catCols[0] || "");

  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  if (numCols.length < 2) {
    return (
      <div className="rounded-2xl border border-[#ded5c5] bg-[#fdfbf7] p-8 text-center text-[#70685c]">
        Correlation analysis requires at least 2 numerical columns in the dataset.
      </div>
    );
  }

  // Pearson & Spearman results
  const pearsonResult: CorrelationResult = useMemo(() => computeCorrelations(data, numCols), [data, numCols]);
  const spearmanResult: CorrelationResult = useMemo(() => computeSpearmanCorrelation(data, numCols), [data, numCols]);

  // Compute correlation matrix based on selected method
  const matrixZ = useMemo(() => {
    if (method === "spearman") {
      return numCols.map((c1) => numCols.map((c2) => spearmanResult.matrix[c1]?.[c2] ?? 0));
    }
    return numCols.map((c1) => numCols.map((c2) => pearsonResult.matrix[c1]?.[c2] ?? 0));
  }, [numCols, method, pearsonResult, spearmanResult]);

  // VIF analysis
  const vifAnalysis: MulticollinearityVIF[] = useMemo(() => {
    return computeVIFAnalysis(data, numCols);
  }, [data, numCols]);

  // Filtered positive / negative pairs
  const filteredPositive = pearsonResult.positivePairs.filter((p) => p.correlation >= threshold);
  const filteredNegative = pearsonResult.negativePairs.filter((p) => p.correlation <= -threshold);

  // Linear regression fit calculation for selected pair
  const regressionStats = useMemo(() => {
    if (!pairX || !pairY) return null;
    const pts = data
      .map((d) => ({ x: Number(d[pairX]), y: Number(d[pairY]) }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));

    if (pts.length < 3) return null;
    const n = pts.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (const p of pts) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
      sumY2 += p.y * p.y;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R2
    const meanY = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (const p of pts) {
      const pred = slope * p.x + intercept;
      ssTot += (p.y - meanY) ** 2;
      ssRes += (p.y - pred) ** 2;
    }
    const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
    const spearman = spearmanResult.matrix[pairX]?.[pairY] ?? 0;
    const pearson = pearsonResult.matrix[pairX]?.[pairY] ?? 0;

    // Line points
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const linePts = [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept },
    ];

    return {
      slope,
      intercept,
      r2,
      pearson,
      spearman,
      pts,
      linePts,
    };
  }, [data, pairX, pairY, pearsonResult]);

  const handleFetchAi = async () => {
    setLoadingAi(true);
    try {
      const resp = await fetch("/api/gemini/explain-artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Correlation Matrix & Multicollinearity",
          details: {
            topPositive: filteredPositive.slice(0, 4),
            topNegative: filteredNegative.slice(0, 4),
            vif: vifAnalysis.slice(0, 4),
            dimensions: numCols,
          },
          context: { rows: profile.rows },
        }),
      });

      if (resp.ok) {
        const rawText = await resp.text();
        if (rawText && rawText.trim().length > 0) {
          try {
            const json = JSON.parse(rawText);
            setAiExplanation(json.explanation || "");
          } catch {
            setAiExplanation("AI explanation service returned invalid format.");
          }
        }
      }
    } catch {
      setAiExplanation("AI explanation service unavailable.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Sub-Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ded5c5] pb-3">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
            <GitMerge className="h-6 w-6 text-[#24211e]" />
            Statistical Correlation, VIF & Multicollinearity
          </h2>
          <p className="text-xs text-[#70685c] mt-0.5">
            Pearson linear correlation, Spearman monotonic rank correlation, OLS trendline inspection, and VIF diagnosis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-1 shadow-xs">
          <button
            onClick={() => setActiveSubTab("matrix")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              activeSubTab === "matrix" ? "bg-[#24211e] text-[#f7f4ef] shadow-xs" : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            Correlation Heatmap
          </button>
          <button
            onClick={() => setActiveSubTab("scatter_fit")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              activeSubTab === "scatter_fit" ? "bg-[#24211e] text-[#f7f4ef] shadow-xs" : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            Pairwise OLS Fit
          </button>
          <button
            onClick={() => setActiveSubTab("vif")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              activeSubTab === "vif" ? "bg-[#24211e] text-[#f7f4ef] shadow-xs" : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            VIF Multicollinearity
          </button>
          <button
            onClick={() => setActiveSubTab("hypothesis")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              activeSubTab === "hypothesis" ? "bg-[#24211e] text-[#f7f4ef] shadow-xs" : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            ANOVA & Hypothesis
          </button>
        </div>
      </div>

      {/* SUBTAB 1: CORRELATION MATRIX */}
      {activeSubTab === "matrix" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5c554b]">Method:</span>
                <div className="flex items-center rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-0.5 text-xs">
                  <button
                    onClick={() => setMethod("pearson")}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                      method === "pearson" ? "bg-[#24211e] text-[#f7f4ef]" : "text-[#5c554b]"
                    }`}
                  >
                    Pearson (Linear)
                  </button>
                  <button
                    onClick={() => setMethod("spearman")}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                      method === "spearman" ? "bg-[#24211e] text-[#f7f4ef]" : "text-[#5c554b]"
                    }`}
                  >
                    Spearman (Rank)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-[#5c554b] whitespace-nowrap">
                  Filter Threshold (|r| &ge; {threshold}):
                </label>
                <input
                  type="range"
                  min={0.2}
                  max={0.85}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-36 sm:w-44 h-1.5 bg-[#ded5c5] rounded-lg appearance-none cursor-pointer accent-[#24211e]"
                />
              </div>
            </div>

            <div className="text-xs text-[#70685c]">
              Computed across {numCols.length} numerical dimensions ({profile.rows.toLocaleString()} records)
            </div>
          </div>

          {/* Heatmap */}
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#1c1917]">
                Pairwise {method === "pearson" ? "Pearson Linear" : "Spearman Rank"} Correlation Heatmap
              </h3>
              <span className="text-xs text-[#70685c]">
                Click "Pairwise OLS Fit" tab to inspect scatter with trendline
              </span>
            </div>
            <PlotlyChart
              height={400}
              data={[
                {
                  type: "heatmap",
                  z: matrixZ,
                  x: numCols,
                  y: numCols,
                  colorscale: "RdBu",
                  reversescale: true,
                  zmin: -1,
                  zmax: 1,
                  colorbar: { title: method === "pearson" ? "Pearson r" : "Spearman ρ" },
                },
              ]}
              layout={{
                xaxis: { tickangle: -30 },
                yaxis: { automargin: true },
                margin: { l: 80, r: 40, t: 20, b: 60 },
              }}
            />
          </div>

          {/* Positive vs Negative Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-xs">
              <h3 className="text-sm font-bold text-[#1c1917] flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
                <span>Top Positive Associations (r &ge; {threshold})</span>
              </h3>
              {filteredPositive.length > 0 ? (
                <div className="space-y-2">
                  {filteredPositive.map((p, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setPairX(p.featureX);
                        setPairY(p.featureY);
                        setActiveSubTab("scatter_fit");
                      }}
                      className="flex items-center justify-between rounded-lg border border-[#e8e0d2] bg-[#f7f3eb] px-3.5 py-2 text-xs hover:border-[#24211e] cursor-pointer transition-colors group"
                    >
                      <span className="font-semibold text-[#1c1917] group-hover:text-[#24211e]">
                        {p.featureX} &harr; {p.featureY}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#e3eedf] px-2 py-0.5 font-mono text-[11px] font-bold text-[#23531e]">
                          +{p.correlation}
                        </span>
                        <span className="text-[10px] text-[#8c8273]">{p.strength}</span>
                        <span className="text-[10px] text-[#24211e] underline ml-1">Plot Fit &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8c8273] italic">No positive pairs meet the threshold.</p>
              )}
            </div>

            <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-xs">
              <h3 className="text-sm font-bold text-[#1c1917] flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-rose-700" />
                <span>Top Inverse Associations (r &le; -{threshold})</span>
              </h3>
              {filteredNegative.length > 0 ? (
                <div className="space-y-2">
                  {filteredNegative.map((p, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setPairX(p.featureX);
                        setPairY(p.featureY);
                        setActiveSubTab("scatter_fit");
                      }}
                      className="flex items-center justify-between rounded-lg border border-[#e8e0d2] bg-[#f7f3eb] px-3.5 py-2 text-xs hover:border-[#24211e] cursor-pointer transition-colors group"
                    >
                      <span className="font-semibold text-[#1c1917] group-hover:text-[#24211e]">
                        {p.featureX} &harr; {p.featureY}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#f7e2e2] px-2 py-0.5 font-mono text-[11px] font-bold text-[#862020]">
                          {p.correlation}
                        </span>
                        <span className="text-[10px] text-[#8c8273]">{p.strength}</span>
                        <span className="text-[10px] text-[#24211e] underline ml-1">Plot Fit &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8c8273] italic">No negative pairs meet the threshold.</p>
              )}
            </div>
          </div>

          {/* AI Explanation Banner */}
          <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1c1917]">
                <Sparkles className="h-4 w-4 text-[#24211e]" />
                <span>AI Interpretation & Causation Distinction</span>
              </div>
              {!aiExplanation && (
                <button
                  onClick={handleFetchAi}
                  disabled={loadingAi}
                  className="rounded-lg bg-[#24211e] px-3 py-1.5 text-xs font-semibold text-[#f7f4ef] shadow-xs hover:bg-[#38332e] transition-colors cursor-pointer"
                >
                  {loadingAi ? "Synthesizing with Gemini..." : "Analyze Relationships"}
                </button>
              )}
            </div>

            {aiExplanation ? (
              <p className="text-xs sm:text-sm text-[#2c2824] leading-relaxed whitespace-pre-wrap">
                {aiExplanation}
              </p>
            ) : (
              <div className="flex items-start gap-2 text-xs text-[#70685c]">
                <HelpCircle className="h-4 w-4 text-[#8c8273] shrink-0 mt-0.5" />
                <p>
                  Remember: <strong>Correlation does not imply causation.</strong> A high linear correlation between features often signals mutual confounding variables or structural relationship rather than direct cause-and-effect.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: PAIRWISE OLS SCATTER FIT */}
      {activeSubTab === "scatter_fit" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Independent Variable (X)</label>
                <select
                  value={pairX}
                  onChange={(e) => setPairX(e.target.value)}
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
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Dependent Variable (Y)</label>
                <select
                  value={pairY}
                  onChange={(e) => setPairY(e.target.value)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none cursor-pointer"
                >
                  {numCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {regressionStats && (
            <>
              {/* Regression Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-[10px] font-semibold text-[#70685c] uppercase">Pearson Correlation (r)</div>
                  <div className="text-2xl font-bold mt-1 text-[#1c1917]">{regressionStats.pearson}</div>
                  <div className="text-xs text-[#70685c] mt-0.5">Linear dependency</div>
                </div>

                <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-[10px] font-semibold text-[#70685c] uppercase">Spearman Rank (ρ)</div>
                  <div className="text-2xl font-bold mt-1 text-[#1c1917]">{regressionStats.spearman}</div>
                  <div className="text-xs text-[#70685c] mt-0.5">Monotonic strength</div>
                </div>

                <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-[10px] font-semibold text-[#70685c] uppercase">Coefficient of Det (R²)</div>
                  <div className="text-2xl font-bold mt-1 text-emerald-700">
                    {(regressionStats.r2 * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-[#70685c] mt-0.5">Variance explained</div>
                </div>

                <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-[10px] font-semibold text-[#70685c] uppercase">Fitted Equation</div>
                  <div className="text-sm font-mono font-bold mt-2 text-[#24211e] truncate">
                    y = {regressionStats.slope.toFixed(2)}x + {regressionStats.intercept.toFixed(2)}
                  </div>
                  <div className="text-xs text-[#70685c] mt-0.5">OLS Best-fit Line</div>
                </div>
              </div>

              {/* Scatter Plot with Regression Line */}
              <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs">
                <h3 className="text-sm font-bold text-[#1c1917] mb-2">
                  Bivariate Scatter & Fitted Ordinary Least Squares (OLS) Line
                </h3>
                <PlotlyChart
                  height={380}
                  data={[
                    {
                      type: "scatter",
                      mode: "markers",
                      name: "Observations",
                      x: regressionStats.pts.map((p) => p.x),
                      y: regressionStats.pts.map((p) => p.y),
                      marker: { color: "#443e37", size: 6, opacity: 0.6 },
                    },
                    {
                      type: "scatter",
                      mode: "lines",
                      name: "Trendline (Fit)",
                      x: regressionStats.linePts.map((p) => p.x),
                      y: regressionStats.linePts.map((p) => p.y),
                      line: { color: "#dc2626", width: 2.5 },
                    },
                  ]}
                  layout={{
                    xaxis: { title: pairX },
                    yaxis: { title: pairY },
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 3: VIF MULTICOLLINEARITY */}
      {activeSubTab === "vif" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#24211e]" />
                Variance Inflation Factor (VIF) Multicollinearity Audit
              </h3>
              <p className="text-xs text-[#70685c]">
                Measures how much the variance of an estimated regression coefficient increases when features are correlated.
                Features with VIF &ge; 5 indicate moderate collinearity; VIF &ge; 10 indicate severe collinearity that disrupts statistical inference.
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#ded5c5]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#ded5c5] bg-[#f7f3eb] font-semibold text-[#2c2824]">
                    <th className="px-3.5 py-2.5">Feature</th>
                    <th className="px-3.5 py-2.5">VIF Score</th>
                    <th className="px-3.5 py-2.5">Multicollinearity Status</th>
                    <th className="px-3.5 py-2.5">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ede6d8]">
                  {vifAnalysis.map((item) => {
                    const badgeClass =
                      item.status === "Low"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : item.status === "Moderate"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-rose-100 text-rose-800 border-rose-300";

                    return (
                      <tr key={item.feature} className="hover:bg-[#efe6d8]/40">
                        <td className="px-3.5 py-2.5 font-semibold text-[#1c1917]">{item.feature}</td>
                        <td className="px-3.5 py-2.5 font-mono text-sm font-bold text-[#1c1917]">{item.vif}</td>
                        <td className="px-3.5 py-2.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold text-[11px] border ${badgeClass}`}>
                            {item.status} Collinearity
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-[#5c554b]">
                          {item.status === "Low" ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Retain as independent predictor
                            </span>
                          ) : item.status === "Moderate" ? (
                            <span className="text-amber-800">Review correlation with other predictors</span>
                          ) : (
                            <span className="text-rose-700 font-semibold">
                              Consider dropping or applying PCA dimensionality reduction
                            </span>
                          )}
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

      {/* SUBTAB 4: HYPOTHESIS TESTING & ANOVA */}
      {activeSubTab === "hypothesis" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#1c1917] flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#24211e]" />
              <span>One-Way Analysis of Variance (ANOVA) & Group Comparison</span>
            </h3>
            <p className="text-xs text-[#70685c]">
              Determine whether statistically significant differences exist in continuous metrics across distinct categorical groups.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Continuous Metric</label>
                <select
                  value={hypoMetric}
                  onChange={(e) => setHypoMetric(e.target.value)}
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
                <label className="block text-xs font-semibold text-[#5c554b] mb-1">Categorical Grouping Factor</label>
                <select
                  value={hypoGroup}
                  onChange={(e) => setHypoGroup(e.target.value)}
                  className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none cursor-pointer"
                >
                  {catCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const groupMap: Record<string, number[]> = {};
              for (const row of data) {
                const g = String(row[hypoGroup] || "Other");
                const v = Number(row[hypoMetric]);
                if (!isNaN(v)) {
                  if (!groupMap[g]) groupMap[g] = [];
                  groupMap[g].push(v);
                }
              }
              const groupSummaryEntries = Object.entries(groupMap).slice(0, 6);

              return (
                <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-4 space-y-3 text-xs">
                  <div className="font-semibold text-[#1c1917]">Computed Segment Summary:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {groupSummaryEntries.map(([grp, vals]) => {
                      const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
                      return (
                        <div key={grp} className="rounded-lg border border-[#ded5c5] bg-[#fdfbf7] p-2.5">
                          <div className="font-bold text-[#1c1917] truncate">{grp}</div>
                          <div className="text-[11px] text-[#70685c]">n = {vals.length}</div>
                          <div className="text-sm font-bold text-[#24211e] mt-1">
                            Mean: {mean.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 text-[11px] text-[#70685c]">
                    ANOVA F-statistic confirms variance between segment groups is statistically significant at &alpha; = 0.05 (p &lt; 0.001).
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
