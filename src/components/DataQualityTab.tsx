import React, { useState, useMemo } from "react";
import { DatasetProfile, DataQualityReport, DataCleaningOptions, CleanedDatasetResult, ColumnProfile } from "../types";
import { computeDataQuality, executeDataCleaning, profileDataset } from "../utils/dataEngine";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertOctagon,
  Sparkles,
  Download,
  Check,
  RefreshCw,
  Trash2,
  Sliders,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowRight,
  Zap,
} from "lucide-react";

interface DataQualityTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
  datasetName?: string;
  onApplyCleanedData?: (cleanedData: Record<string, any>[], newProfile: DatasetProfile) => void;
}

export const DataQualityTab: React.FC<DataQualityTabProps> = ({
  data,
  profile,
  datasetName = "Dataset",
  onApplyCleanedData,
}) => {
  const report: DataQualityReport = useMemo(() => computeDataQuality(data, profile), [data, profile]);

  // Cleaning options state
  const [cleaningOptions, setCleaningOptions] = useState<DataCleaningOptions>({
    removeDuplicates: true,
    dropConstantColumns: true,
    imputeMissingNumerical: "median",
    imputeMissingCategorical: "mode",
    handleOutliers: "clip_iqr",
  });

  const [cleaningApplied, setCleaningApplied] = useState(false);
  const [cleanedPreviewResult, setCleanedPreviewResult] = useState<CleanedDatasetResult | null>(null);
  const [showCleanerStudio, setShowCleanerStudio] = useState(false);
  const [appliedSuccessNotice, setAppliedSuccessNotice] = useState(false);

  // Compute live preview of cleaning
  const handleGenerateCleanedPreview = () => {
    const result = executeDataCleaning(data, cleaningOptions);
    setCleanedPreviewResult(result);
  };

  const handleApplyToWorkspace = () => {
    if (!cleanedPreviewResult) {
      const result = executeDataCleaning(data, cleaningOptions);
      const newProfile = profileDataset(result.cleanedData);
      if (onApplyCleanedData) {
        onApplyCleanedData(result.cleanedData, newProfile);
        setAppliedSuccessNotice(true);
        setTimeout(() => setAppliedSuccessNotice(false), 4000);
      }
    } else {
      const newProfile = profileDataset(cleanedPreviewResult.cleanedData);
      if (onApplyCleanedData) {
        onApplyCleanedData(cleanedPreviewResult.cleanedData, newProfile);
        setAppliedSuccessNotice(true);
        setTimeout(() => setAppliedSuccessNotice(false), 4000);
      }
    }
  };

  const handleExportCleanedCSV = () => {
    const targetData = cleanedPreviewResult?.cleanedData || executeDataCleaning(data, cleaningOptions).cleanedData;
    if (!targetData.length) return;
    const headers = Object.keys(targetData[0]);
    const csv = [
      headers.join(","),
      ...targetData.map((row) =>
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
    a.download = `${datasetName.replace(/\.[^/.]+$/, "")}_cleaned.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#23531e] bg-[#edf4ec] border-[#c4dcbe]";
    if (score >= 60) return "text-[#82531e] bg-[#f9f3ea] border-[#decbb3]";
    return "text-[#8a2424] bg-[#fbf0f0] border-[#e8c0c0]";
  };

  // Grade calculation for column scorecard
  const getColumnGrade = (missingPct: number, outlierCount: number, rows: number) => {
    const outlierPct = (outlierCount / rows) * 100;
    const penalty = missingPct * 1.5 + outlierPct * 1.2;
    if (penalty < 2) return { grade: "A+", color: "text-emerald-800 bg-emerald-100 border-emerald-300" };
    if (penalty < 8) return { grade: "A", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (penalty < 18) return { grade: "B", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (penalty < 35) return { grade: "C", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { grade: "D", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#24211e]" />
            Data Quality Audit & Automated Remediation Studio
          </h2>
          <p className="text-xs text-[#70685c] mt-0.5">
            Automated verification evaluating completeness, uniqueness, constant variance, collinearity, and 1-click remediation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setShowCleanerStudio(!showCleanerStudio);
              if (!cleanedPreviewResult) handleGenerateCleanedPreview();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors shadow-xs ${
              showCleanerStudio
                ? "bg-[#24211e] text-[#f7f4ef]"
                : "border border-[#ded5c5] bg-[#fdfbf7] text-[#24211e] hover:bg-[#ede5d8]"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>{showCleanerStudio ? "Hide Cleaning Studio" : "Open 1-Click Cleaning Studio"}</span>
          </button>
        </div>
      </div>

      {/* Applied Notice */}
      {appliedSuccessNotice && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-xs animate-fadeIn">
          <Check className="h-4 w-4 text-emerald-700" />
          <span>Cleaned dataset successfully synchronized to active workspace and all analytical modules!</span>
        </div>
      )}

      {/* Main Score & Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`rounded-xl border p-6 flex flex-col items-center justify-center text-center shadow-xs ${getScoreColor(report.score)}`}>
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">Overall Hygiene Score</span>
          <div className="mt-2 text-6xl font-black">{report.score}</div>
          <span className="mt-1 text-xs opacity-75">Out of 100 possible points</span>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-white/90 shadow-xs">
            {report.score >= 80 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                <span>Production Ready</span>
              </>
            ) : report.score >= 60 ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                <span>Minor Cleaning Recommended</span>
              </>
            ) : (
              <>
                <AlertOctagon className="h-3.5 w-3.5 text-rose-700" />
                <span>Critical Quality Deficiencies</span>
              </>
            )}
          </div>
        </div>

        <div className="md:col-span-2 rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#1c1917]">Audit Metrics Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-3.5">
              <div className="text-[11px] font-semibold text-[#70685c] uppercase">Missing Values</div>
              <div className="mt-1 text-lg font-bold text-[#1c1917]">{report.missingPercentage}%</div>
              <div className="text-[11px] text-[#8c8273]">{report.missingCells.toLocaleString()} empty cells</div>
            </div>

            <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-3.5">
              <div className="text-[11px] font-semibold text-[#70685c] uppercase">Duplicates</div>
              <div className="mt-1 text-lg font-bold text-[#1c1917]">{report.duplicatePercentage}%</div>
              <div className="text-[11px] text-[#8c8273]">{report.duplicateRows.toLocaleString()} duplicate rows</div>
            </div>

            <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-3.5">
              <div className="text-[11px] font-semibold text-[#70685c] uppercase">Outlier Rate</div>
              <div className="mt-1 text-lg font-bold text-[#1c1917]">{report.outlierPercentage}%</div>
              <div className="text-[11px] text-[#8c8273]">Extreme IQR variations</div>
            </div>

            <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-3.5">
              <div className="text-[11px] font-semibold text-[#70685c] uppercase">Constant Cols</div>
              <div className="mt-1 text-lg font-bold text-[#1c1917]">{report.constantColumns.length}</div>
              <div className="text-[11px] text-[#8c8273]">Zero-variance features</div>
            </div>

            <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-3.5">
              <div className="text-[11px] font-semibold text-[#70685c] uppercase">Collinear Pairs</div>
              <div className="mt-1 text-lg font-bold text-[#1c1917]">{report.highCorrelationPairs.length}</div>
              <div className="text-[11px] text-[#8c8273]">r &gt; 0.85 redundant</div>
            </div>

            <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-3.5">
              <div className="text-[11px] font-semibold text-[#70685c] uppercase">Records Validated</div>
              <div className="mt-1 text-lg font-bold text-[#1c1917]">{profile.rows.toLocaleString()}</div>
              <div className="text-[11px] text-[#8c8273]">{profile.columns} active columns</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Data Cleaning Studio (Remediation Actions) */}
      {showCleanerStudio && (
        <div className="rounded-2xl border-2 border-[#24211e]/20 bg-[#fdfbf7] p-6 shadow-md space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#ded5c5] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#24211e] uppercase tracking-wider bg-[#efe6d8] px-2.5 py-0.5 rounded-md mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Automated Remediation Engine</span>
              </div>
              <h3 className="text-base font-bold text-[#1c1917]">Interactive Data Cleaning Configuration</h3>
              <p className="text-xs text-[#70685c]">
                Configure imputation, deduplication, and outlier treatment strategies, then preview results before applying.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateCleanedPreview}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs font-semibold text-[#2c2824] hover:bg-[#ede5d8] cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Recalculate Preview</span>
              </button>
              <button
                onClick={handleExportCleanedCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-3 py-1.5 text-xs font-semibold text-[#2c2824] hover:bg-[#ede5d8] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
              {onApplyCleanedData && (
                <button
                  onClick={handleApplyToWorkspace}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#24211e] px-3.5 py-1.5 text-xs font-semibold text-[#f7f4ef] hover:bg-[#3d362e] cursor-pointer shadow-xs transition-colors"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>Apply to Workspace</span>
                </button>
              )}
            </div>
          </div>

          {/* Strategy Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Deduplication */}
            <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-4 space-y-2">
              <div className="text-xs font-bold text-[#1c1917]">Duplicate Rows</div>
              <label className="flex items-center gap-2 text-xs text-[#2c2824] cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleaningOptions.removeDuplicates}
                  onChange={(e) => setCleaningOptions({ ...cleaningOptions, removeDuplicates: e.target.checked })}
                  className="rounded border-[#ded5c5] text-[#24211e] focus:ring-0 cursor-pointer"
                />
                <span>Drop duplicate records ({profile.duplicateRows})</span>
              </label>
              <p className="text-[11px] text-[#70685c]">Preserves the first occurrence of identical rows.</p>
            </div>

            {/* Numerical Imputation */}
            <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-4 space-y-2">
              <div className="text-xs font-bold text-[#1c1917]">Numerical Imputation</div>
              <select
                value={String(cleaningOptions.imputeMissingNumerical || "median")}
                onChange={(e) =>
                  setCleaningOptions({
                    ...cleaningOptions,
                    imputeMissingNumerical: e.target.value as any,
                  })
                }
                className="w-full rounded-lg border border-[#ded5c5] bg-white px-2.5 py-1.5 text-xs text-[#2c2824] cursor-pointer"
              >
                <option value="median">Impute with Median (Robust)</option>
                <option value="mean">Impute with Mean (Parametric)</option>
                <option value="zero">Impute with Zero (0)</option>
                <option value="drop">Drop Rows with Missing</option>
                <option value="none">Do Not Impute</option>
              </select>
              <p className="text-[11px] text-[#70685c]">Median prevents skewness in non-normal features.</p>
            </div>

            {/* Categorical Imputation */}
            <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-4 space-y-2">
              <div className="text-xs font-bold text-[#1c1917]">Categorical Imputation</div>
              <select
                value={String(cleaningOptions.imputeMissingCategorical || "mode")}
                onChange={(e) =>
                  setCleaningOptions({
                    ...cleaningOptions,
                    imputeMissingCategorical: e.target.value as any,
                  })
                }
                className="w-full rounded-lg border border-[#ded5c5] bg-white px-2.5 py-1.5 text-xs text-[#2c2824] cursor-pointer"
              >
                <option value="mode">Impute with Mode (Most Frequent)</option>
                <option value="constant">Impute with "Missing" string</option>
                <option value="drop">Drop Rows with Missing</option>
                <option value="none">Do Not Impute</option>
              </select>
              <p className="text-[11px] text-[#70685c]">Fills missing text labels with dominant classes.</p>
            </div>

            {/* Outlier Handling */}
            <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-4 space-y-2">
              <div className="text-xs font-bold text-[#1c1917]">Outlier Treatment</div>
              <select
                value={String(cleaningOptions.handleOutliers || "clip_iqr")}
                onChange={(e) =>
                  setCleaningOptions({
                    ...cleaningOptions,
                    handleOutliers: e.target.value as any,
                  })
                }
                className="w-full rounded-lg border border-[#ded5c5] bg-white px-2.5 py-1.5 text-xs text-[#2c2824] cursor-pointer"
              >
                <option value="clip_iqr">Winsorize / Clip IQR Fences (1.5x)</option>
                <option value="drop">Drop Outlier Rows</option>
                <option value="none">Preserve Outliers (No change)</option>
              </select>
              <p className="text-[11px] text-[#70685c]">Clips extreme values to valid statistical bounds.</p>
            </div>
          </div>

          {/* Remediation Preview Delta */}
          {cleanedPreviewResult && (
            <div className="rounded-xl border border-[#ded5c5] bg-[#efe6d8]/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#1c1917]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Cleaning Remediation Impact Simulation
                </span>
                <span className="text-[11px] text-[#70685c]">
                  Rows: {data.length} → {cleanedPreviewResult.cleanedData.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-[#fdfbf7] p-2.5 border border-[#ded5c5]">
                  <div className="text-[#70685c] text-[10px] uppercase font-semibold">Duplicates Removed</div>
                  <div className="text-base font-bold text-[#1c1917] mt-0.5">
                    {cleanedPreviewResult.metrics.duplicatesRemoved.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-[#fdfbf7] p-2.5 border border-[#ded5c5]">
                  <div className="text-[#70685c] text-[10px] uppercase font-semibold">Nulls Imputed</div>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    {cleanedPreviewResult.metrics.nullsImputed.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-[#fdfbf7] p-2.5 border border-[#ded5c5]">
                  <div className="text-[#70685c] text-[10px] uppercase font-semibold">Outliers Treated</div>
                  <div className="text-base font-bold text-amber-700 mt-0.5">
                    {cleanedPreviewResult.metrics.outliersHandled.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-[#fdfbf7] p-2.5 border border-[#ded5c5]">
                  <div className="text-[#70685c] text-[10px] uppercase font-semibold">Zero-Var Dropped</div>
                  <div className="text-base font-bold text-[#1c1917] mt-0.5">
                    {cleanedPreviewResult.metrics.columnsDropped.length}
                  </div>
                </div>
              </div>

              {cleanedPreviewResult.actionsApplied.length > 0 && (
                <div className="text-[11px] text-[#5c554b] space-y-1 pt-1">
                  <div className="font-semibold text-[#1c1917]">Audit Trail of Changes:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cleanedPreviewResult.actionsApplied.map((act, i) => (
                      <span key={i} className="rounded-md border border-[#ded5c5] bg-white px-2 py-0.5 font-mono text-[10px]">
                        ✓ {act}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Multicollinearity Warning */}
      {report.highCorrelationPairs.length > 0 && (
        <div className="rounded-xl border border-[#ded5c5] bg-[#fbf5eb] p-4 text-xs text-[#5c4424] shadow-xs">
          <div className="font-bold flex items-center gap-1.5 mb-1 text-[#4c371d]">
            <AlertTriangle className="h-4 w-4 text-[#82531e]" />
            <span>High Feature Collinearity Detected (&gt; 0.85)</span>
          </div>
          <p className="leading-relaxed">
            The following feature pairs share high linear redundancy which can inflate regression standard errors:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.highCorrelationPairs.map((p, idx) => (
              <span key={idx} className="rounded-md border border-[#ded5c5] bg-[#fdfbf7] text-[#1c1917] px-2.5 py-1 font-mono text-[11px]">
                {p.col1} ↔ {p.col2} (r = {p.correlation})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Column Hygiene Scorecard */}
      <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#1c1917]">Feature-by-Feature Hygiene Scorecard</h3>
          <p className="text-xs text-[#70685c]">
            Individual quality grades based on data completeness, uniqueness ratio, and outlier rate.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#ded5c5]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#ded5c5] bg-[#f7f3eb] font-semibold text-[#2c2824]">
                <th className="px-3.5 py-2.5">Feature</th>
                <th className="px-3.5 py-2.5">Type</th>
                <th className="px-3.5 py-2.5">Hygiene Grade</th>
                <th className="px-3.5 py-2.5">Completeness</th>
                <th className="px-3.5 py-2.5">Uniqueness Ratio</th>
                <th className="px-3.5 py-2.5">Outliers (IQR)</th>
                <th className="px-3.5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede6d8]">
              {(Object.values(profile.columnProfiles) as ColumnProfile[]).map((col) => {
                const { grade, color } = getColumnGrade(col.missingPercentage, col.outlierCount || 0, profile.rows);
                const completeness = (100 - col.missingPercentage).toFixed(1);
                const uniqueness = ((col.uniqueCount / profile.rows) * 100).toFixed(1);
                return (
                  <tr key={col.name} className="hover:bg-[#efe6d8]/40 transition-colors">
                    <td className="px-3.5 py-2.5 font-semibold text-[#1c1917]">{col.name}</td>
                    <td className="px-3.5 py-2.5 text-[#70685c]">{col.type}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-xs border ${color}`}>
                        {grade}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[#ede5d8] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-700 h-1.5 rounded-full"
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-[#2c2824]">{completeness}%</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#5c554b]">
                      {col.uniqueCount} ({uniqueness}%)
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px]">
                      {col.outlierCount && col.outlierCount > 0 ? (
                        <span className="text-amber-700 font-semibold">{col.outlierCount} records</span>
                      ) : (
                        <span className="text-[#8c8275]">0</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {col.missingCount === 0 && (!col.outlierCount || col.outlierCount === 0) ? (
                        <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                        </span>
                      ) : col.missingPercentage > 20 ? (
                        <span className="text-rose-700 font-medium text-[11px] flex items-center gap-1">
                          <AlertOctagon className="h-3.5 w-3.5" /> High Missingness
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium text-[11px] flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Minor Issues
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

      {/* Actionable Recommendations Checklist */}
      <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
          <Info className="h-4 w-4 text-[#24211e]" />
          Remediation & Hygiene Recommendations
        </h3>
        <div className="space-y-2.5">
          {report.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-3.5 text-xs text-[#2c2824]"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
