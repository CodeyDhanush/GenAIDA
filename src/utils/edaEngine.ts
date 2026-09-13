/**
 * Exploratory Data Analysis (EDA) Engine
 * Generates distribution profiles, outlier scans, sparsity indices,
 * feature cardinality spectrum, and automated analytical insights.
 */

import { DatasetProfile } from "../types";

export interface FeatureOutlierProfile {
  column: string;
  outlierCount: number;
  outlierPercentage: number;
  lowerFence: number;
  upperFence: number;
  extremeMin: number;
  extremeMax: number;
}

export interface MissingnessItem {
  column: string;
  missingCount: number;
  missingPercentage: number;
  type: string;
}

export interface EdaInsightItem {
  type: "warning" | "positive" | "info";
  category: "Distribution" | "Quality" | "Correlation" | "Cardinality" | "Outliers";
  title: string;
  message: string;
  column?: string;
}

export interface FullEdaReport {
  totalRows: number;
  totalColumns: number;
  completenessScore: number; // 0-100%
  sparsityPercentage: number;
  duplicateCount: number;
  duplicatePercentage: number;
  numericalCount: number;
  categoricalCount: number;
  datetimeCount: number;
  booleanCount: number;
  idCount: number;
  missingnessList: MissingnessItem[];
  outlierProfiles: FeatureOutlierProfile[];
  cardinalitySpectrum: Array<{
    column: string;
    uniqueCount: number;
    ratio: number;
    level: "Constant" | "Low (<10)" | "Medium (10-50)" | "High (>50)" | "Unique Identifier";
  }>;
  topCorrelations: Array<{
    col1: string;
    col2: string;
    correlation: number;
    relationship: "Strong Positive" | "Strong Negative" | "Moderate";
  }>;
  insights: EdaInsightItem[];
}

export function generateEdaReport(
  data: Record<string, any>[],
  profile: DatasetProfile
): FullEdaReport {
  const totalRows = data.length;
  const totalColumns = Object.keys(profile.columnProfiles).length;

  // 1. Missingness & Completeness
  let totalCells = totalRows * totalColumns;
  let totalMissingCells = 0;
  const missingnessList: MissingnessItem[] = [];

  for (const [col, colProf] of Object.entries(profile.columnProfiles)) {
    totalMissingCells += colProf.missingCount;
    missingnessList.push({
      column: col,
      missingCount: colProf.missingCount,
      missingPercentage: colProf.missingPercentage,
      type: colProf.type,
    });
  }
  missingnessList.sort((a, b) => b.missingPercentage - a.missingPercentage);

  const sparsityPercentage = totalCells > 0 ? Number(((totalMissingCells / totalCells) * 100).toFixed(2)) : 0;
  const completenessScore = Number((100 - sparsityPercentage).toFixed(2));

  // 2. Outlier Profiles (Tukey's IQR method)
  const outlierProfiles: FeatureOutlierProfile[] = [];
  for (const col of profile.numericalColumns) {
    const prof = profile.columnProfiles[col];
    if (!prof || prof.q25 === undefined || prof.q75 === undefined) continue;

    const iqr = (prof.q75 || 0) - (prof.q25 || 0);
    const lowerFence = (prof.q25 || 0) - 1.5 * iqr;
    const upperFence = (prof.q75 || 0) + 1.5 * iqr;

    const nums = data.map((d) => Number(d[col])).filter((n) => !isNaN(n));
    const outliers = nums.filter((v) => v < lowerFence || v > upperFence);
    const outlierCount = outliers.length;
    const outlierPercentage = Number(((outlierCount / (nums.length || 1)) * 100).toFixed(2));

    outlierProfiles.push({
      column: col,
      outlierCount,
      outlierPercentage,
      lowerFence: Number(lowerFence.toFixed(2)),
      upperFence: Number(upperFence.toFixed(2)),
      extremeMin: prof.min ?? 0,
      extremeMax: prof.max ?? 0,
    });
  }
  outlierProfiles.sort((a, b) => b.outlierPercentage - a.outlierPercentage);

  // 3. Cardinality Spectrum
  const cardinalitySpectrum: FullEdaReport["cardinalitySpectrum"] = [];
  for (const [col, prof] of Object.entries(profile.columnProfiles)) {
    const u = prof.uniqueCount;
    const ratio = totalRows > 0 ? Number((u / totalRows).toFixed(4)) : 0;
    let level: FullEdaReport["cardinalitySpectrum"][0]["level"] = "Medium (10-50)";

    if (u <= 1) level = "Constant";
    else if (u < 10) level = "Low (<10)";
    else if (u <= 50) level = "Medium (10-50)";
    else if (ratio > 0.95 || u === totalRows) level = "Unique Identifier";
    else level = "High (>50)";

    cardinalitySpectrum.push({
      column: col,
      uniqueCount: u,
      ratio,
      level,
    });
  }
  cardinalitySpectrum.sort((a, b) => b.uniqueCount - a.uniqueCount);

  // 4. Top Correlations
  const topCorrelations: FullEdaReport["topCorrelations"] = [];
  const numCols = profile.numericalColumns;
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const c1 = numCols[i];
      const c2 = numCols[j];
      const pairs = data
        .map((d) => [Number(d[c1]), Number(d[c2])])
        .filter(([x, y]) => !isNaN(x) && !isNaN(y));

      if (pairs.length > 5) {
        const n = pairs.length;
        const meanX = pairs.reduce((s, p) => s + p[0], 0) / n;
        const meanY = pairs.reduce((s, p) => s + p[1], 0) / n;

        let num = 0;
        let denX = 0;
        let denY = 0;
        for (const [x, y] of pairs) {
          const dx = x - meanX;
          const dy = y - meanY;
          num += dx * dy;
          denX += dx * dx;
          denY += dy * dy;
        }

        const denom = Math.sqrt(denX * denY);
        const r = denom !== 0 ? num / denom : 0;

        if (Math.abs(r) >= 0.45) {
          let rel: FullEdaReport["topCorrelations"][0]["relationship"] = "Moderate";
          if (r >= 0.7) rel = "Strong Positive";
          else if (r <= -0.7) rel = "Strong Negative";

          topCorrelations.push({
            col1: c1,
            col2: c2,
            correlation: Number(r.toFixed(3)),
            relationship: rel,
          });
        }
      }
    }
  }
  topCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  // 5. Automated EDA Findings & Insights
  const insights: EdaInsightItem[] = [];

  // Data Completeness Insight
  if (completenessScore >= 98) {
    insights.push({
      type: "positive",
      category: "Quality",
      title: "High Data Completeness",
      message: `The dataset exhibits exceptional data hygiene with ${completenessScore}% completeness and minimal sparsity (${sparsityPercentage}%).`,
    });
  } else if (sparsityPercentage > 10) {
    insights.push({
      type: "warning",
      category: "Quality",
      title: "Elevated Missingness Detected",
      message: `${sparsityPercentage}% of cell entries are missing. Top affected columns include ${missingnessList
        .slice(0, 3)
        .map((m) => `"${m.column}" (${m.missingPercentage}%)`)
        .join(", ")}. Consider median/mode imputation or record filtering.`,
    });
  }

  // Duplicate Records Insight
  if (profile.duplicateRows > 0) {
    insights.push({
      type: "warning",
      category: "Quality",
      title: "Duplicate Observations Present",
      message: `Identified ${profile.duplicateRows.toLocaleString()} duplicate rows (${profile.duplicatePercentage}% of dataset). Deduplication is recommended before predictive modeling.`,
    });
  } else {
    insights.push({
      type: "positive",
      category: "Quality",
      title: "Zero Duplicate Records",
      message: "Every record in the loaded dataset is strictly unique across all feature vectors.",
    });
  }

  // Outlier Insights
  const highOutlierCols = outlierProfiles.filter((o) => o.outlierPercentage > 5);
  if (highOutlierCols.length > 0) {
    insights.push({
      type: "warning",
      category: "Outliers",
      title: "Prominent Outlier Concentrations",
      message: `Significant tail outliers detected in ${highOutlierCols
        .map((h) => `"${h.column}" (${h.outlierPercentage}%)`)
        .slice(0, 3)
        .join(", ")}. Review Tukey fences before linear regression or standard scaling.`,
      column: highOutlierCols[0].column,
    });
  }

  // Distribution & Skewness Insights
  for (const col of profile.numericalColumns) {
    const prof = profile.columnProfiles[col];
    if (prof && prof.skewness !== undefined) {
      if (Math.abs(prof.skewness) > 1.5) {
        insights.push({
          type: "info",
          category: "Distribution",
          title: `Heavy ${prof.skewness > 0 ? "Right" : "Left"} Skewness in "${col}"`,
          message: `"${col}" has a skewness coefficient of ${prof.skewness}. Log or Box-Cox transformation may normalize residuals for parametric estimators.`,
          column: col,
        });
        break; // Only flag the most skewed to avoid clutter
      }
    }
  }

  // Correlation Insights
  if (topCorrelations.length > 0) {
    const best = topCorrelations[0];
    insights.push({
      type: "positive",
      category: "Correlation",
      title: `Strong Association: ${best.col1} & ${best.col2}`,
      message: `Strong ${best.relationship.toLowerCase()} relationship (r = ${best.correlation}) uncovered between "${best.col1}" and "${best.col2}".`,
    });
  }

  // Cardinality Insight
  const highCardCat = cardinalitySpectrum.filter(
    (c) => c.level === "High (>50)" && profile.columnProfiles[c.column]?.type === "Categorical"
  );
  if (highCardCat.length > 0) {
    insights.push({
      type: "info",
      category: "Cardinality",
      title: "High-Cardinality Categorical Attributes",
      message: `Column "${highCardCat[0].column}" contains ${highCardCat[0].uniqueCount} distinct categories. Target or frequency encoding is preferable to one-hot encoding.`,
      column: highCardCat[0].column,
    });
  }

  return {
    totalRows,
    totalColumns,
    completenessScore,
    sparsityPercentage,
    duplicateCount: profile.duplicateRows,
    duplicatePercentage: profile.duplicatePercentage,
    numericalCount: profile.numericalColumns.length,
    categoricalCount: profile.categoricalColumns.length,
    datetimeCount: profile.datetimeColumns.length,
    booleanCount: profile.booleanColumns.length,
    idCount: profile.idColumns.length,
    missingnessList,
    outlierProfiles,
    cardinalitySpectrum,
    topCorrelations,
    insights,
  };
}

/**
 * Standard normal inverse cumulative distribution (Probit function) approximation
 */
export function normalQuantile(p: number): number {
  if (p <= 0) return -4;
  if (p >= 1) return 4;
  // Rational approximation for normal quantile (Wichura / Beasley-Springer-Moro)
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.383577518672690e2,
    -3.066479806614716e1,
    2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838e0,
    -2.549732539343734e0,
    4.374664141464968e0,
    2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996e0,
    3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q = 0;
  if (p < pLow) {
    const r = Math.sqrt(-2 * Math.log(p));
    q =
      (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
      ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  } else if (p <= pHigh) {
    const r = p - 0.5;
    const r2 = r * r;
    q =
      ((((((a[0] * r2 + a[1]) * r2 + a[2]) * r2 + a[3]) * r2 + a[4]) * r2 + a[5]) * r) /
      (((((b[0] * r2 + b[1]) * r2 + b[2]) * r2 + b[3]) * r2 + b[4]) * r2 + 1);
  } else {
    const r = Math.sqrt(-2 * Math.log(1 - p));
    q =
      -(((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
      ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  }
  return q;
}

/**
 * Kernel Density Estimation (Gaussian Kernel with Silverman's Rule Bandwidth)
 */
export function computeKde(
  values: number[],
  pointsCount = 60
): { x: number[]; y: number[]; densityScaled: number[] } {
  const nums = values.filter((n) => !isNaN(n)).sort((a, b) => a - b);
  if (nums.length < 2) return { x: [], y: [], densityScaled: [] };

  const n = nums.length;
  const min = nums[0];
  const max = nums[nums.length - 1];
  if (min === max) {
    return { x: [min], y: [1], densityScaled: [n] };
  }

  // Mean & Std Dev
  const mean = nums.reduce((s, v) => s + v, 0) / n;
  const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance) || 1;

  // IQR
  const q25 = nums[Math.floor(n * 0.25)];
  const q75 = nums[Math.floor(n * 0.75)];
  const iqr = (q75 - q25) || std;

  // Silverman's rule of thumb bandwidth
  const h = 0.9 * Math.min(std, iqr / 1.34) * Math.pow(n, -0.2) || 0.1;

  // Grid of points
  const padding = (max - min) * 0.05;
  const start = min - padding;
  const end = max + padding;
  const step = (end - start) / (pointsCount - 1);

  const xPts: number[] = [];
  const yDensity: number[] = [];

  const invSqrt2Pi = 1 / Math.sqrt(2 * Math.PI);

  for (let i = 0; i < pointsCount; i++) {
    const x = start + i * step;
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const u = (x - nums[j]) / h;
      sum += invSqrt2Pi * Math.exp(-0.5 * u * u);
    }
    const density = sum / (n * h);
    xPts.push(Number(x.toFixed(3)));
    yDensity.push(Number(density.toFixed(6)));
  }

  // Also calculate scaled density that matches histogram frequency counts
  const binWidth = (max - min) / Math.min(30, Math.max(10, Math.floor(Math.sqrt(n))));
  const densityScaled = yDensity.map((d) => Number((d * n * binWidth).toFixed(2)));

  return { x: xPts, y: yDensity, densityScaled };
}

/**
 * Quantile-Quantile (Q-Q) Normal Probability Plot computation
 */
export function computeQqPlot(values: number[]): {
  theoretical: number[];
  sample: number[];
  lineX: number[];
  lineY: number[];
} {
  const nums = values.filter((n) => !isNaN(n)).sort((a, b) => a - b);
  if (nums.length < 3) return { theoretical: [], sample: [], lineX: [], lineY: [] };

  const n = nums.length;
  // Sample at most 100 points for crisp visualization
  const targetPoints = Math.min(n, 100);
  const theoretical: number[] = [];
  const sample: number[] = [];

  for (let i = 0; i < targetPoints; i++) {
    const idx = Math.floor((i / (targetPoints - 1 || 1)) * (n - 1));
    const p = (i + 0.5) / targetPoints;
    const qNorm = normalQuantile(p);
    theoretical.push(Number(qNorm.toFixed(3)));
    sample.push(nums[idx]);
  }

  // Reference line connecting Q1 and Q3
  const q25Val = nums[Math.floor(n * 0.25)];
  const q75Val = nums[Math.floor(n * 0.75)];
  const q25Norm = normalQuantile(0.25);
  const q75Norm = normalQuantile(0.75);

  const slope = (q75Val - q25Val) / (q75Norm - q25Norm || 1);
  const intercept = q25Val - slope * q25Norm;

  const minTheoretical = Math.min(...theoretical);
  const maxTheoretical = Math.max(...theoretical);

  const lineX = [minTheoretical, maxTheoretical];
  const lineY = [minTheoretical * slope + intercept, maxTheoretical * slope + intercept];

  return { theoretical, sample, lineX, lineY };
}

/**
 * Empirical Cumulative Distribution Function (ECDF)
 */
export function computeEcdf(values: number[]): {
  x: number[];
  y: number[];
  percentiles: Array<{ label: string; p: number; value: number }>;
} {
  const nums = values.filter((n) => !isNaN(n)).sort((a, b) => a - b);
  if (nums.length === 0) return { x: [], y: [], percentiles: [] };

  const n = nums.length;
  const step = Math.max(1, Math.floor(n / 100));
  const x: number[] = [];
  const y: number[] = [];

  for (let i = 0; i < n; i += step) {
    x.push(nums[i]);
    y.push(Number(((i + 1) / n).toFixed(4)));
  }
  // Ensure last point is 1.0
  if (x[x.length - 1] !== nums[n - 1]) {
    x.push(nums[n - 1]);
    y.push(1.0);
  }

  const pTargets = [
    { label: "P10", p: 0.1 },
    { label: "P25", p: 0.25 },
    { label: "P50 (Median)", p: 0.5 },
    { label: "P75", p: 0.75 },
    { label: "P90", p: 0.9 },
    { label: "P99", p: 0.99 },
  ];

  const percentiles = pTargets.map((pt) => ({
    label: pt.label,
    p: pt.p,
    value: nums[Math.min(n - 1, Math.floor(n * pt.p))],
  }));

  return { x, y, percentiles };
}

/**
 * Pareto Frequency & Cumulative Percentage for Categorical Attributes
 */
export function computeParetoCategorical(
  data: Record<string, any>[],
  col: string,
  topN = 15
): { categories: string[]; counts: number[]; cumulativePct: number[] } {
  const countsMap: Record<string, number> = {};
  let total = 0;
  for (const row of data) {
    const raw = row[col];
    const val = raw === undefined || raw === null || raw === "" ? "(Missing)" : String(raw).trim();
    countsMap[val] = (countsMap[val] || 0) + 1;
    total++;
  }

  const sorted = Object.entries(countsMap).sort((a, b) => b[1] - a[1]);
  const sliced = sorted.slice(0, topN);

  let running = 0;
  const categories: string[] = [];
  const counts: number[] = [];
  const cumulativePct: number[] = [];

  for (const [cat, cnt] of sliced) {
    categories.push(cat);
    counts.push(cnt);
    running += cnt;
    cumulativePct.push(Number(((running / (total || 1)) * 100).toFixed(1)));
  }

  return { categories, counts, cumulativePct };
}

/**
 * Nullity Matrix for Missingness Visualization (missingno style)
 */
export function computeNullityMatrix(
  data: Record<string, any>[],
  columns: string[],
  sampleRows = 50
): {
  z: number[][];
  xLabels: string[];
  yLabels: string[];
} {
  if (data.length === 0 || columns.length === 0) {
    return { z: [], xLabels: [], yLabels: [] };
  }

  const step = Math.max(1, Math.floor(data.length / sampleRows));
  const sampledIndices: number[] = [];
  for (let i = 0; i < data.length && sampledIndices.length < sampleRows; i += step) {
    sampledIndices.push(i);
  }

  const yLabels = sampledIndices.map((idx) => `Row ${idx + 1}`);
  const xLabels = columns;

  // z matrix: rows = sample rows, cols = columns. 1 for present, 0 for missing
  const z: number[][] = [];
  for (const idx of sampledIndices) {
    const row = data[idx];
    const rowValues: number[] = [];
    for (const col of columns) {
      const val = row[col];
      const isMissing =
        val === undefined ||
        val === null ||
        val === "" ||
        val === "NaN" ||
        val === "null" ||
        (typeof val === "number" && isNaN(val));
      rowValues.push(isMissing ? 0 : 1);
    }
    z.push(rowValues);
  }

  return { z, xLabels, yLabels };
}

/**
 * 2D Contingency Table / Cross-Tabulation for Categorical vs Categorical EDA
 */
export function computeCrossTabulation(
  data: Record<string, any>[],
  colX: string,
  colY: string,
  maxCats = 8
): {
  xLabels: string[];
  yLabels: string[];
  matrix: number[][];
  totalCount: number;
} {
  const xCounts: Record<string, number> = {};
  const yCounts: Record<string, number> = {};

  for (const row of data) {
    const xVal = String(row[colX] ?? "(Missing)").trim();
    const yVal = String(row[colY] ?? "(Missing)").trim();
    xCounts[xVal] = (xCounts[xVal] || 0) + 1;
    yCounts[yVal] = (yCounts[yVal] || 0) + 1;
  }

  const xLabels = Object.entries(xCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCats)
    .map((e) => e[0]);

  const yLabels = Object.entries(yCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCats)
    .map((e) => e[0]);

  const matrix: number[][] = yLabels.map(() => xLabels.map(() => 0));
  let totalCount = 0;

  for (const row of data) {
    const xVal = String(row[colX] ?? "(Missing)").trim();
    const yVal = String(row[colY] ?? "(Missing)").trim();
    const xIdx = xLabels.indexOf(xVal);
    const yIdx = yLabels.indexOf(yVal);
    if (xIdx !== -1 && yIdx !== -1) {
      matrix[yIdx][xIdx] += 1;
      totalCount++;
    }
  }

  return { xLabels, yLabels, matrix, totalCount };
}
