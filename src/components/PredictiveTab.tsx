import React, { useState, useMemo } from "react";
import { DatasetProfile, PredictiveResult, ModelBenchmarkItem } from "../types";
import { trainPredictiveModel, benchmarkAlgorithms, predictSingleInstance } from "../utils/dataEngine";
import { PlotlyChart } from "./PlotlyChart";
import {
  BrainCircuit,
  Sparkles,
  Play,
  Award,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Gauge,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Zap,
} from "lucide-react";

interface PredictiveTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
}

export const PredictiveTab: React.FC<PredictiveTabProps> = ({ data, profile }) => {
  const allCols = Object.keys(data[0] || {});
  const numCols = profile.numericalColumns;

  const defaultTarget = numCols.length > 0 ? numCols[numCols.length - 1] : allCols[allCols.length - 1];
  const [targetCol, setTargetCol] = useState<string>(defaultTarget);
  const [modelType, setModelType] = useState<string>("Random Forest");

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() =>
    allCols.filter((c) => c !== defaultTarget).slice(0, 6)
  );

  // Sub-view mode: 'model' | 'simulation' | 'benchmark'
  const [viewMode, setViewMode] = useState<"model" | "simulation" | "benchmark">("model");

  const [modelResult, setModelResult] = useState<PredictiveResult | null>(() => {
    if (defaultTarget && allCols.length > 1) {
      const initFeatures = allCols.filter((c) => c !== defaultTarget).slice(0, 5);
      return trainPredictiveModel(data, defaultTarget, initFeatures, "Random Forest");
    }
    return null;
  });

  const [benchmarkList, setBenchmarkList] = useState<ModelBenchmarkItem[] | null>(null);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>("");

  // What-If Simulation input values (feature -> value)
  const [simulationInputs, setSimulationInputs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const f of selectedFeatures) {
      const colProf = profile.columnProfiles[f];
      initial[f] = colProf?.mean ?? colProf?.median ?? 0;
    }
    return initial;
  });

  // Simulated predicted outcome
  const simulatedOutcome = useMemo(() => {
    if (!modelResult) return null;
    return predictSingleInstance(modelResult, simulationInputs);
  }, [modelResult, simulationInputs]);

  const handleTrain = async () => {
    if (!targetCol || selectedFeatures.length === 0) return;
    setIsTraining(true);
    setAiExplanation("");

    try {
      const res = trainPredictiveModel(data, targetCol, selectedFeatures, modelType);
      setModelResult(res);

      // Update simulation inputs with latest features
      const newInputs: Record<string, number> = {};
      for (const f of selectedFeatures) {
        const colProf = profile.columnProfiles[f];
        newInputs[f] = colProf?.mean ?? colProf?.median ?? 0;
      }
      setSimulationInputs(newInputs);

      // AI explanation call
      try {
        const resp = await fetch("/api/gemini/explain-artifact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "Predictive Analytics & Driver Modeling",
            details: {
              target: targetCol,
              task: res.taskType,
              metrics: res.metrics,
              topDrivers: Object.entries(res.featureImportance).slice(0, 5),
            },
            context: { rows: profile.rows },
          }),
        });

        if (resp.ok) {
          const json = await resp.json();
          setAiExplanation(json.explanation || "");
        }
      } catch {
        // Fallback
      }
    } finally {
      setIsTraining(false);
    }
  };

  const handleRunBenchmark = () => {
    if (!targetCol || selectedFeatures.length === 0) return;
    setIsBenchmarking(true);
    setTimeout(() => {
      const res = benchmarkAlgorithms(data, targetCol, selectedFeatures);
      setBenchmarkList(res);
      setIsBenchmarking(false);
    }, 200);
  };

  // Feature Importance Horizontal Bar Data
  const featureBarData: Plotly.Data[] = [];
  if (modelResult) {
    const sortedFeatures: [string, number][] = Object.entries(modelResult.featureImportance).map(
      ([k, v]) => [k, Number(v)]
    );
    sortedFeatures.sort((a, b) => a[1] - b[1]);
    featureBarData.push({
      type: "bar",
      orientation: "h",
      x: sortedFeatures.map((f) => f[1]),
      y: sortedFeatures.map((f) => f[0]),
      marker: { color: "#24211e" },
    });
  }

  // Diagnostics Charts (Actual vs Predicted and Residuals)
  const actualVsPredData: Plotly.Data[] = [];
  const residualsData: Plotly.Data[] = [];
  if (modelResult?.testActuals && modelResult?.testPredictions) {
    const minVal = Math.min(...modelResult.testActuals);
    const maxVal = Math.max(...modelResult.testActuals);

    actualVsPredData.push({
      type: "scatter",
      mode: "markers",
      name: "Holdout Samples",
      x: modelResult.testActuals,
      y: modelResult.testPredictions,
      marker: { color: "#443e37", size: 6, opacity: 0.7 },
    });

    // 45 degree ideal reference line
    actualVsPredData.push({
      type: "scatter",
      mode: "lines",
      name: "Ideal Parity (y=x)",
      x: [minVal, maxVal],
      y: [minVal, maxVal],
      line: { dash: "dash", color: "#b91c1c", width: 2 },
    });

    // Residuals distribution
    if (modelResult.residuals) {
      residualsData.push({
        type: "histogram",
        x: modelResult.residuals,
        nbinsx: 20,
        marker: { color: "#544d44" },
      } as any);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and View Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ded5c5] pb-3">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-[#24211e]" />
            Predictive Machine Learning & What-If Simulation
          </h2>
          <p className="text-xs text-[#70685c] mt-0.5">
            Supervised learning algorithms, driver importance ranking, algorithm benchmark comparison, and interactive scenario simulator.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-1 shadow-xs">
          <button
            onClick={() => setViewMode("model")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              viewMode === "model" ? "bg-[#24211e] text-[#f7f4ef] shadow-xs" : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            Model & Diagnostics
          </button>
          <button
            onClick={() => setViewMode("simulation")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              viewMode === "simulation" ? "bg-[#24211e] text-[#f7f4ef] shadow-xs" : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            What-If Simulator
          </button>
          <button
            onClick={() => {
              setViewMode("benchmark");
              if (!benchmarkList) handleRunBenchmark();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
              viewMode === "benchmark" ? "bg-[#24211e] text-[#f7f4ef] shadow-xs" : "text-[#5c554b] hover:text-[#1c1917]"
            }`}
          >
            Algorithm Benchmark
          </button>
        </div>
      </div>

      {/* Model Configuration Card */}
      <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5c554b] mb-1">Target Variable (To Predict)</label>
            <select
              value={targetCol}
              onChange={(e) => {
                const newTarget = e.target.value;
                setTargetCol(newTarget);
                setSelectedFeatures((prev) => prev.filter((f) => f !== newTarget));
              }}
              className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none cursor-pointer"
            >
              {allCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5c554b] mb-1">Algorithm Architecture</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs text-[#1c1917] focus:outline-none cursor-pointer"
            >
              <option value="Random Forest">Random Forest (Ensemble Trees)</option>
              <option value="Gradient Boosting">Gradient Boosted Regressor</option>
              <option value="Linear Model">Ridge / Ordinary Least Squares</option>
              <option value="Decision Tree">Decision Tree Regressor</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleTrain}
              disabled={isTraining || selectedFeatures.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#24211e] px-4 py-2 text-xs font-semibold text-[#f7f4ef] shadow-xs hover:bg-[#38332e] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isTraining ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#f7f4ef] border-t-transparent" />
                  <span>Training ML Model...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Train & Evaluate Model</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Selector Chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-[#5c554b]">
              Selected Predictor Features ({selectedFeatures.length} active):
            </label>
            <button
              onClick={() => setSelectedFeatures(allCols.filter((c) => c !== targetCol))}
              className="text-[11px] text-[#24211e] hover:underline cursor-pointer"
            >
              Select All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allCols
              .filter((c) => c !== targetCol)
              .map((c) => {
                const isSelected = selectedFeatures.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (selectedFeatures.length > 1) {
                          setSelectedFeatures(selectedFeatures.filter((f) => f !== c));
                        }
                      } else {
                        setSelectedFeatures([...selectedFeatures, c]);
                      }
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#24211e] border-[#24211e] text-[#f7f4ef]"
                        : "bg-[#f7f3eb] border-[#ded5c5] text-[#5c554b] hover:bg-[#ede6d8]"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {c}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* VIEW 1: MODEL & DIAGNOSTICS */}
      {viewMode === "model" && modelResult && (
        <div className="space-y-6">
          {/* Performance Metrics Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-[#1c1917]">
                  Holdout Validation Metrics &bull; {modelResult.taskType} ({modelResult.modelName})
                </h3>
              </div>
              <span className="text-xs text-[#70685c]">
                80% Train / 20% Test Split • Sample Count: {modelResult.testActuals?.length || 0} holdout
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(modelResult.metrics).map(([k, v]) => (
                <div key={k} className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
                  <div className="text-xs font-semibold text-[#70685c] uppercase tracking-wider">{k}</div>
                  <div className="text-2xl font-bold mt-1 text-[#1c1917]">{String(v)}</div>
                  <div className="text-xs text-emerald-700 mt-1 font-semibold">Test Evaluation</div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Importance Bar Chart */}
          <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#1c1917] mb-1">
              Feature Importance & Predictive Drivers: {targetCol}
            </h3>
            <p className="text-xs text-[#70685c] mb-4">
              Normalized relative contribution weight of each independent variable in determining {targetCol}
            </p>
            <PlotlyChart
              height={320}
              data={featureBarData}
              layout={{
                xaxis: { title: "Relative Importance Weight (Normalized to 1.0)" },
                yaxis: { automargin: true },
                margin: { l: 120, r: 25, t: 20, b: 40 },
              }}
            />
          </div>

          {/* Model Diagnostics: Actual vs Predicted and Error Residuals */}
          {actualVsPredData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs">
                <h3 className="text-sm font-bold text-[#1c1917] mb-1">
                  Observed vs Predicted Holdout Scatter
                </h3>
                <p className="text-xs text-[#70685c] mb-2">Points closer to red dashed diagonal indicate higher fidelity</p>
                <PlotlyChart
                  height={300}
                  data={actualVsPredData}
                  layout={{
                    xaxis: { title: `Actual ${targetCol}` },
                    yaxis: { title: `Predicted ${targetCol}` },
                  }}
                />
              </div>

              <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs">
                <h3 className="text-sm font-bold text-[#1c1917] mb-1">
                  Residual Error Distribution (ε = Actual - Pred)
                </h3>
                <p className="text-xs text-[#70685c] mb-2">Symmetric bell around zero confirms homoscedasticity</p>
                <PlotlyChart
                  height={300}
                  data={residualsData}
                  layout={{
                    xaxis: { title: "Residual Error (ε)" },
                    yaxis: { title: "Sample Count" },
                  }}
                />
              </div>
            </div>
          )}

          {/* AI Explanation of Drivers */}
          <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1c1917]">
              <Sparkles className="h-4 w-4 text-[#24211e]" />
              <span>AI Strategic Predictive Interpretation</span>
            </div>
            {aiExplanation ? (
              <p className="text-xs sm:text-sm text-[#2c2824] leading-relaxed whitespace-pre-wrap">
                {aiExplanation}
              </p>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#70685c]">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>
                  Model trained successfully. Features with higher relative weights represent the primary leverage points for optimizing {targetCol}.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: WHAT-IF SCENARIO SIMULATOR */}
      {viewMode === "simulation" && modelResult && (
        <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ded5c5] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[#24211e]" />
                Interactive "What-If" Scenario Simulator
              </h3>
              <p className="text-xs text-[#70685c]">
                Adjust input predictor values to forecast the expected outcome of <strong>{targetCol}</strong> in real-time.
              </p>
            </div>

            {simulatedOutcome !== null && (
              <div className="rounded-xl border-2 border-[#24211e] bg-[#efe6d8] px-5 py-3 text-center">
                <div className="text-[11px] font-bold text-[#5c554b] uppercase tracking-wider">
                  Predicted {targetCol}
                </div>
                <div className="text-2xl font-black text-[#1c1917] mt-0.5">
                  {typeof simulatedOutcome?.prediction === "number"
                    ? simulatedOutcome.prediction.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : String(simulatedOutcome?.prediction ?? "N/A")}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Sliders / Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {selectedFeatures.map((feat) => {
              const colProf = profile.columnProfiles[feat];
              const minVal = colProf?.min ?? 0;
              const maxVal = colProf?.max ?? 100;
              const currentVal = simulationInputs[feat] ?? colProf?.mean ?? 0;
              const step = maxVal - minVal > 100 ? 1 : (maxVal - minVal) / 100 || 0.1;

              return (
                <div key={feat} className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1c1917] truncate">{feat}</span>
                    <input
                      type="number"
                      value={currentVal}
                      onChange={(e) =>
                        setSimulationInputs({
                          ...simulationInputs,
                          [feat]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-20 rounded border border-[#ded5c5] bg-white px-2 py-0.5 text-right font-mono text-xs font-bold text-[#1c1917]"
                    />
                  </div>

                  {colProf?.type === "Numerical" && (
                    <input
                      type="range"
                      min={minVal}
                      max={maxVal}
                      step={step}
                      value={currentVal}
                      onChange={(e) =>
                        setSimulationInputs({
                          ...simulationInputs,
                          [feat]: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-[#ded5c5] rounded-lg appearance-none cursor-pointer accent-[#24211e]"
                    />
                  )}

                  <div className="flex justify-between text-[10px] text-[#70685c]">
                    <span>Min: {minVal.toLocaleString()}</span>
                    <span>Max: {maxVal.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: ALGORITHM BENCHMARKING */}
      {viewMode === "benchmark" && (
        <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#24211e]" />
                Algorithm Performance Benchmark Grid
              </h3>
              <p className="text-xs text-[#70685c]">
                Cross-evaluates multiple regression architectures simultaneously on 80/20 holdout split for {targetCol}.
              </p>
            </div>

            <button
              onClick={handleRunBenchmark}
              disabled={isBenchmarking}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs font-semibold text-[#2c2824] hover:bg-[#ede5d8] cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isBenchmarking ? "animate-spin" : ""}`} />
              <span>Re-run Benchmark</span>
            </button>
          </div>

          {benchmarkList && (
            <div className="overflow-x-auto rounded-lg border border-[#ded5c5]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#ded5c5] bg-[#f7f3eb] font-semibold text-[#2c2824]">
                    <th className="px-3.5 py-2.5">Model Architecture</th>
                    <th className="px-3.5 py-2.5">Accuracy / R² Score</th>
                    <th className="px-3.5 py-2.5">MAE Error</th>
                    <th className="px-3.5 py-2.5">RMSE Error</th>
                    <th className="px-3.5 py-2.5">Training Latency</th>
                    <th className="px-3.5 py-2.5">Top Predictive Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ede6d8]">
                  {benchmarkList.map((bm, i) => (
                    <tr key={bm.modelName} className="hover:bg-[#efe6d8]/40">
                      <td className="px-3.5 py-2.5 font-bold text-[#1c1917] flex items-center gap-2">
                        {i === 0 && (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                            Best
                          </span>
                        )}
                        <span>{bm.modelName}</span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-sm font-bold text-emerald-700">
                        {(bm.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[#5c554b]">{bm.mae.toLocaleString()}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[#5c554b]">{bm.rmse.toLocaleString()}</td>
                      <td className="px-3.5 py-2.5 text-[#70685c]">{bm.trainingTimeMs} ms</td>
                      <td className="px-3.5 py-2.5 font-semibold text-[#24211e]">{bm.topFeature}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
