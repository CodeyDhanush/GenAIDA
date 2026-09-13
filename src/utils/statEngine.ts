/**
 * Mathematical and Statistical Analysis Engine
 * Implements descriptive statistics, hypothesis testing (t-test, ANOVA, Chi-Square),
 * normality assessment, and confidence intervals.
 */

export interface DetailedStats {
  name: string;
  count: number;
  validCount: number;
  missingCount: number;
  missingPercentage: number;
  mean: number;
  median: number;
  mode: number | string;
  std: number;
  variance: number;
  sem: number; // Standard Error of the Mean
  cv: number; // Coefficient of Variation %
  min: number;
  max: number;
  range: number;
  q25: number;
  q75: number;
  iqr: number;
  skewness: number;
  skewnessType: "Symmetric" | "Moderate Right-Skew" | "High Right-Skew" | "Moderate Left-Skew" | "High Left-Skew";
  kurtosis: number;
  kurtosisType: "Mesokurtic (Normal)" | "Leptokurtic (Heavy-tailed)" | "Platykurtic (Light-tailed)";
  ci95Lower: number;
  ci95Upper: number;
  ci99Lower: number;
  ci99Upper: number;
  isNormalCandidate: boolean;
}

export interface TTestResult {
  variable: string;
  groupColumn: string;
  group1Name: string;
  group2Name: string;
  group1Count: number;
  group2Count: number;
  group1Mean: number;
  group2Mean: number;
  group1Std: number;
  group2Std: number;
  meanDifference: number;
  tStat: number;
  df: number;
  pValue: number;
  isSignificant: boolean;
  alpha: number;
  cohensD: number;
  interpretation: string;
}

export interface AnovaResult {
  variable: string;
  groupColumn: string;
  groups: Array<{ name: string; count: number; mean: number; std: number }>;
  ssBetween: number;
  ssWithin: number;
  dfBetween: number;
  dfWithin: number;
  msBetween: number;
  msWithin: number;
  fStat: number;
  pValue: number;
  isSignificant: boolean;
  alpha: number;
  etaSquared: number;
  interpretation: string;
}

export interface ChiSquareResult {
  col1: string;
  col2: string;
  observed: Record<string, Record<string, number>>;
  expected: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
  chi2: number;
  df: number;
  pValue: number;
  isSignificant: boolean;
  cramersV: number;
  interpretation: string;
}

// -------------------------------------------------------------
// Numerical Approximations for Statistical Distributions
// -------------------------------------------------------------

// Standard Error Function (erf) approximation
function erf(x: number): number {
  // Abramowitz and Stegun formula 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);
  return sign * y;
}

// Standard Normal CDF
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// Student's t-distribution two-tailed p-value approximation
export function studentTTwoTailedPValue(t: number, df: number): number {
  if (df <= 0) return 1.0;
  const absT = Math.abs(t);

  // For large degrees of freedom, t converges to standard normal
  if (df > 120) {
    const p = 2 * (1 - normalCdf(absT));
    return Math.max(0.00001, Math.min(1.0, p));
  }

  // Hill's algorithm approximation for Student-t
  const x = df / (df + absT * absT);
  const p = incompleteBeta(df / 2, 0.5, x);
  return Math.max(0.00001, Math.min(1.0, p));
}

// F-distribution p-value approximation
export function fDistributionPValue(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 1.0;
  const x = df2 / (df2 + df1 * f);
  const p = incompleteBeta(df2 / 2, df1 / 2, x);
  return Math.max(0.00001, Math.min(1.0, p));
}

// Chi-Square distribution p-value approximation
export function chiSquarePValue(chi2: number, df: number): number {
  if (chi2 <= 0 || df <= 0) return 1.0;
  // Chi-square is a special case of gamma distribution: P(X > chi2) = 1 - P(df/2, chi2/2)
  return Math.max(0.00001, Math.min(1.0, 1 - gammaCdf(chi2 / 2, df / 2)));
}

// Regularized incomplete beta function approximation
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Continued fraction expansion (Lentz method)
  const maxIterations = 100;
  const epsilon = 1e-10;

  const front =
    Math.exp(
      logGamma(a + b) -
        logGamma(a) -
        logGamma(b) +
        a * Math.log(x) +
        b * Math.log(1 - x)
    ) / a;

  let f = 1.0;
  let c = 1.0;
  let d = 0.0;

  for (let m = 1; m <= maxIterations; m++) {
    // Even step
    let numerator = -(a + m - 1) * (a + b + m - 1) * x / ((a + 2 * m - 2) * (a + 2 * m - 1));
    d = 1.0 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1.0 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1.0 / d;
    f = f * c * d;

    // Odd step
    numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1.0 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1.0 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1.0 / d;
    f = f * c * d;

    if (Math.abs(c * d - 1.0) < epsilon) {
      break;
    }
  }

  return Math.max(0, Math.min(1, front * (f - 1.0)));
}

// Log-Gamma approximation (Lanczos)
function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }

  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Lower incomplete gamma function normalized (Gamma CDF)
function gammaCdf(x: number, a: number): number {
  if (x <= 0) return 0;
  if (x > 100) return 1;

  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 100; n++) {
    term *= x / (a + n);
    sum += term;
    if (term < sum * 1e-12) break;
  }
  return Math.min(1, Math.max(0, Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum));
}

// -------------------------------------------------------------
// Core Descriptive Statistics
// -------------------------------------------------------------

export function computeDetailedStats(
  columnName: string,
  data: Record<string, any>[]
): DetailedStats | null {
  const rawValues = data.map((d) => d[columnName]);
  const numbers = rawValues
    .map((v) => Number(v))
    .filter((v) => typeof v === "number" && !isNaN(v))
    .sort((a, b) => a - b);

  if (numbers.length === 0) return null;

  const total = rawValues.length;
  const validCount = numbers.length;
  const missingCount = total - validCount;
  const missingPercentage = Number(((missingCount / total) * 100).toFixed(2));

  const sum = numbers.reduce((acc, v) => acc + v, 0);
  const mean = sum / validCount;

  // Median
  const mid = Math.floor(validCount / 2);
  const median = validCount % 2 !== 0 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;

  // Mode
  const frequencyMap: Record<number, number> = {};
  let maxFreq = 0;
  let mode: number | string = numbers[0];
  for (const n of numbers) {
    frequencyMap[n] = (frequencyMap[n] || 0) + 1;
    if (frequencyMap[n] > maxFreq) {
      maxFreq = frequencyMap[n];
      mode = n;
    }
  }
  if (maxFreq === 1 && validCount > 1) {
    mode = "No unique mode";
  }

  // Variance & Standard Deviation
  const variance = numbers.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (validCount > 1 ? validCount - 1 : 1);
  const std = Math.sqrt(variance);
  const sem = std / Math.sqrt(validCount);
  const cv = mean !== 0 ? Math.abs((std / mean) * 100) : 0;

  const min = numbers[0];
  const max = numbers[numbers.length - 1];
  const range = max - min;

  const q25 = numbers[Math.floor(validCount * 0.25)];
  const q75 = numbers[Math.floor(validCount * 0.75)];
  const iqr = q75 - q25;

  // Skewness
  let skewness = 0;
  if (std > 0 && validCount > 2) {
    const m3 = numbers.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / validCount;
    skewness = m3 / Math.pow(std, 3);
  }

  let skewnessType: DetailedStats["skewnessType"] = "Symmetric";
  if (skewness > 1.0) skewnessType = "High Right-Skew";
  else if (skewness > 0.5) skewnessType = "Moderate Right-Skew";
  else if (skewness < -1.0) skewnessType = "High Left-Skew";
  else if (skewness < -0.5) skewnessType = "Moderate Left-Skew";

  // Kurtosis (excess kurtosis: normal dist = 0)
  let kurtosis = 0;
  if (std > 0 && validCount > 3) {
    const m4 = numbers.reduce((acc, v) => acc + Math.pow(v - mean, 4), 0) / validCount;
    kurtosis = m4 / Math.pow(std, 4) - 3;
  }

  let kurtosisType: DetailedStats["kurtosisType"] = "Mesokurtic (Normal)";
  if (kurtosis > 1.0) kurtosisType = "Leptokurtic (Heavy-tailed)";
  else if (kurtosis < -1.0) kurtosisType = "Platykurtic (Light-tailed)";

  // Confidence Intervals
  // 95% CI (z = 1.96)
  const ci95Margin = 1.96 * sem;
  const ci95Lower = Number((mean - ci95Margin).toFixed(3));
  const ci95Upper = Number((mean + ci95Margin).toFixed(3));

  // 99% CI (z = 2.576)
  const ci99Margin = 2.576 * sem;
  const ci99Lower = Number((mean - ci99Margin).toFixed(3));
  const ci99Upper = Number((mean + ci99Margin).toFixed(3));

  // Normality candidate: absolute skewness < 0.5 and absolute kurtosis < 1.0
  const isNormalCandidate = Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 1.0;

  return {
    name: columnName,
    count: total,
    validCount,
    missingCount,
    missingPercentage,
    mean: Number(mean.toFixed(3)),
    median: Number(median.toFixed(3)),
    mode: typeof mode === "number" ? Number(mode.toFixed(3)) : mode,
    std: Number(std.toFixed(3)),
    variance: Number(variance.toFixed(3)),
    sem: Number(sem.toFixed(3)),
    cv: Number(cv.toFixed(2)),
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    range: Number(range.toFixed(3)),
    q25: Number(q25.toFixed(3)),
    q75: Number(q75.toFixed(3)),
    iqr: Number(iqr.toFixed(3)),
    skewness: Number(skewness.toFixed(3)),
    skewnessType,
    kurtosis: Number(kurtosis.toFixed(3)),
    kurtosisType,
    ci95Lower,
    ci95Upper,
    ci99Lower,
    ci99Upper,
    isNormalCandidate,
  };
}

// -------------------------------------------------------------
// Hypothesis Testing Implementations
// -------------------------------------------------------------

// Two-Sample Independent Welch's t-test
export function runTwoSampleTTest(
  data: Record<string, any>[],
  variable: string,
  groupColumn: string,
  group1: string,
  group2: string,
  alpha: number = 0.05
): TTestResult | null {
  const vals1 = data
    .filter((d) => String(d[groupColumn]) === group1)
    .map((d) => Number(d[variable]))
    .filter((n) => !isNaN(n));

  const vals2 = data
    .filter((d) => String(d[groupColumn]) === group2)
    .map((d) => Number(d[variable]))
    .filter((n) => !isNaN(n));

  const n1 = vals1.length;
  const n2 = vals2.length;
  if (n1 < 2 || n2 < 2) return null;

  const mean1 = vals1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = vals2.reduce((a, b) => a + b, 0) / n2;

  const var1 = vals1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (n1 - 1);
  const var2 = vals2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (n2 - 1);

  const std1 = Math.sqrt(var1);
  const std2 = Math.sqrt(var2);

  // Welch's t-statistic
  const seDiff = Math.sqrt(var1 / n1 + var2 / n2);
  if (seDiff === 0) return null;

  const tStat = (mean1 - mean2) / seDiff;

  // Welch-Satterthwaite degrees of freedom
  const num = Math.pow(var1 / n1 + var2 / n2, 2);
  const denom =
    Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
  const df = Math.max(1, Math.round(num / denom));

  const pValue = studentTTwoTailedPValue(tStat, df);
  const isSignificant = pValue < alpha;

  // Cohen's d (effect size)
  const pooledStd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  const cohensD = pooledStd > 0 ? (mean1 - mean2) / pooledStd : 0;

  const interpretation = isSignificant
    ? `Statistically significant difference detected between "${group1}" and "${group2}" (t(${df}) = ${tStat.toFixed(
        2
      )}, p = ${pValue < 0.001 ? "< 0.001" : pValue.toFixed(4)} < ${alpha}). We reject the null hypothesis of equal means.`
    : `No statistically significant difference found between "${group1}" and "${group2}" (t(${df}) = ${tStat.toFixed(
        2
      )}, p = ${pValue.toFixed(4)} >= ${alpha}). Fail to reject the null hypothesis.`;

  return {
    variable,
    groupColumn,
    group1Name: group1,
    group2Name: group2,
    group1Count: n1,
    group2Count: n2,
    group1Mean: Number(mean1.toFixed(3)),
    group2Mean: Number(mean2.toFixed(3)),
    group1Std: Number(std1.toFixed(3)),
    group2Std: Number(std2.toFixed(3)),
    meanDifference: Number((mean1 - mean2).toFixed(3)),
    tStat: Number(tStat.toFixed(3)),
    df,
    pValue: Number(pValue.toFixed(5)),
    isSignificant,
    alpha,
    cohensD: Number(cohensD.toFixed(3)),
    interpretation,
  };
}

// One-Way ANOVA
export function runOneWayAnova(
  data: Record<string, any>[],
  variable: string,
  groupColumn: string,
  alpha: number = 0.05
): AnovaResult | null {
  // Collect group values
  const groupMap: Record<string, number[]> = {};
  for (const row of data) {
    const groupKey = String(row[groupColumn] || "").trim();
    if (!groupKey) continue;
    const val = Number(row[variable]);
    if (!isNaN(val)) {
      if (!groupMap[groupKey]) groupMap[groupKey] = [];
      groupMap[groupKey].push(val);
    }
  }

  const groupKeys = Object.keys(groupMap).filter((k) => groupMap[k].length >= 2);
  if (groupKeys.length < 2) return null;

  const groups: AnovaResult["groups"] = [];
  let totalN = 0;
  let grandSum = 0;

  for (const k of groupKeys) {
    const vals = groupMap[k];
    const n = vals.length;
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    groups.push({
      name: k,
      count: n,
      mean: Number(mean.toFixed(3)),
      std: Number(Math.sqrt(variance).toFixed(3)),
    });
    totalN += n;
    grandSum += sum;
  }

  const grandMean = grandSum / totalN;

  // Sum of squares between
  let ssBetween = 0;
  for (const g of groups) {
    ssBetween += g.count * Math.pow(g.mean - grandMean, 2);
  }

  // Sum of squares within
  let ssWithin = 0;
  for (const k of groupKeys) {
    const vals = groupMap[k];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    for (const v of vals) {
      ssWithin += Math.pow(v - mean, 2);
    }
  }

  const dfBetween = groups.length - 1;
  const dfWithin = totalN - groups.length;

  if (dfBetween <= 0 || dfWithin <= 0) return null;

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;

  const fStat = msWithin > 0 ? msBetween / msWithin : 0;
  const pValue = fDistributionPValue(fStat, dfBetween, dfWithin);
  const isSignificant = pValue < alpha;

  const etaSquared = ssBetween + ssWithin > 0 ? ssBetween / (ssBetween + ssWithin) : 0;

  const interpretation = isSignificant
    ? `Significant variation across categories detected (F(${dfBetween}, ${dfWithin}) = ${fStat.toFixed(
        2
      )}, p = ${pValue < 0.001 ? "< 0.001" : pValue.toFixed(4)} < ${alpha}). Group means are not all equal; effect size η² = ${etaSquared.toFixed(3)}.`
    : `No statistically significant differences between group means (F(${dfBetween}, ${dfWithin}) = ${fStat.toFixed(
        2
      )}, p = ${pValue.toFixed(4)} >= ${alpha}). Group differences can be attributed to random variation.`;

  return {
    variable,
    groupColumn,
    groups,
    ssBetween: Number(ssBetween.toFixed(2)),
    ssWithin: Number(ssWithin.toFixed(2)),
    dfBetween,
    dfWithin,
    msBetween: Number(msBetween.toFixed(2)),
    msWithin: Number(msWithin.toFixed(2)),
    fStat: Number(fStat.toFixed(3)),
    pValue: Number(pValue.toFixed(5)),
    isSignificant,
    alpha,
    etaSquared: Number(etaSquared.toFixed(3)),
    interpretation,
  };
}

// Chi-Square Test of Independence
export function runChiSquareTest(
  data: Record<string, any>[],
  col1: string,
  col2: string,
  alpha: number = 0.05
): ChiSquareResult | null {
  const observed: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const row of data) {
    const val1 = String(row[col1] ?? "").trim();
    const val2 = String(row[col2] ?? "").trim();
    if (!val1 || !val2) continue;

    if (!observed[val1]) observed[val1] = {};
    observed[val1][val2] = (observed[val1][val2] || 0) + 1;

    rowTotals[val1] = (rowTotals[val1] || 0) + 1;
    colTotals[val2] = (colTotals[val2] || 0) + 1;
    grandTotal++;
  }

  const rows = Object.keys(rowTotals);
  const cols = Object.keys(colTotals);

  if (rows.length < 2 || cols.length < 2 || grandTotal < 10) return null;

  // Expected frequencies & Chi2
  const expected: Record<string, Record<string, number>> = {};
  let chi2 = 0;

  for (const r of rows) {
    expected[r] = {};
    for (const c of cols) {
      const exp = (rowTotals[r] * colTotals[c]) / grandTotal;
      expected[r][c] = Number(exp.toFixed(2));
      const obs = observed[r]?.[c] || 0;
      chi2 += Math.pow(obs - exp, 2) / (exp || 1);
    }
  }

  const df = (rows.length - 1) * (cols.length - 1);
  const pValue = chiSquarePValue(chi2, df);
  const isSignificant = pValue < alpha;

  // Cramer's V
  const minDim = Math.min(rows.length - 1, cols.length - 1);
  const cramersV = minDim > 0 ? Math.sqrt(chi2 / (grandTotal * minDim)) : 0;

  const interpretation = isSignificant
    ? `Significant association between "${col1}" and "${col2}" (χ²(${df}) = ${chi2.toFixed(
        2
      )}, p = ${pValue < 0.001 ? "< 0.001" : pValue.toFixed(4)} < ${alpha}). Cramer's V = ${cramersV.toFixed(
        3
      )}. We reject the null hypothesis of independence.`
    : `Variables "${col1}" and "${col2}" appear independent (χ²(${df}) = ${chi2.toFixed(
        2
      )}, p = ${pValue.toFixed(4)} >= ${alpha}). Fail to reject independence.`;

  return {
    col1,
    col2,
    observed,
    expected,
    rowTotals,
    colTotals,
    grandTotal,
    chi2: Number(chi2.toFixed(2)),
    df,
    pValue: Number(pValue.toFixed(5)),
    isSignificant,
    cramersV: Number(cramersV.toFixed(3)),
    interpretation,
  };
}
