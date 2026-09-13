import { DatasetProfile } from "../types";

export interface QueryExecutionResult {
  pandasCode: string;
  calcResult: any;
  visualization?: {
    type: "bar" | "line" | "area" | "scatter" | "histogram" | "box" | "pie";
    x?: string;
    y?: string;
    title?: string;
    data?: any[];
  };
}

export function executeQueryPlan(
  data: Record<string, any>[],
  profile: DatasetProfile,
  query: string
): QueryExecutionResult {
  const q = query.toLowerCase();
  const numCols = profile.numericalColumns;
  const catCols = profile.categoricalColumns;

  // 1. Top N query
  if (q.includes("top") || q.includes("highest") || q.includes("best") || q.includes("leading")) {
    const numMatch = q.match(/\b(\d+)\b/);
    const n = numMatch ? parseInt(numMatch[1], 10) : 10;

    const targetCat =
      catCols.find((c) => q.includes(c.toLowerCase()) || q.includes(c.toLowerCase().replace(/_/g, " "))) ||
      catCols[0] ||
      "category";
    const targetNum =
      numCols.find((c) => q.includes(c.toLowerCase()) || q.includes(c.toLowerCase().replace(/_/g, " "))) ||
      numCols[0] ||
      "revenue";

    const groups: Record<string, number> = {};
    for (const row of data) {
      const cat = String(row[targetCat] || "Unknown");
      const val = Number(row[targetNum]) || 0;
      groups[cat] = (groups[cat] || 0) + val;
    }

    const sorted = Object.entries(groups)
      .map(([k, v]) => ({ [targetCat]: k, [targetNum]: Number(v.toFixed(2)) }))
      .sort((a, b) => Number(b[targetNum]) - Number(a[targetNum]))
      .slice(0, n);

    return {
      pandasCode: `df.groupby('${targetCat}')['${targetNum}'].sum().reset_index().sort_values(by='${targetNum}', ascending=False).head(${n})`,
      calcResult: sorted,
      visualization: {
        type: "bar",
        x: targetCat,
        y: targetNum,
        title: `Top ${n} ${targetCat} by Total ${targetNum}`,
        data: sorted,
      },
    };
  }

  // 2. Average by dimension
  if (q.includes("average") || q.includes("mean") || q.includes("avg")) {
    const targetCat =
      catCols.find((c) => q.includes(c.toLowerCase()) || q.includes(c.toLowerCase().replace(/_/g, " "))) ||
      catCols[0] ||
      "region";
    const targetNum =
      numCols.find((c) => q.includes(c.toLowerCase()) || q.includes(c.toLowerCase().replace(/_/g, " "))) ||
      numCols[0] ||
      "sales";

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const row of data) {
      const cat = String(row[targetCat] || "Unknown");
      const val = Number(row[targetNum]) || 0;
      sums[cat] = (sums[cat] || 0) + val;
      counts[cat] = (counts[cat] || 0) + 1;
    }

    const averages = Object.keys(sums)
      .map((k) => ({
        [targetCat]: k,
        [`average_${targetNum}`]: Number((sums[k] / (counts[k] || 1)).toFixed(2)),
        sample_count: counts[k],
      }))
      .sort((a, b) => Number(b[`average_${targetNum}`]) - Number(a[`average_${targetNum}`]));

    return {
      pandasCode: `df.groupby('${targetCat}')['${targetNum}'].mean().reset_index().sort_values(by='${targetNum}', ascending=False)`,
      calcResult: averages,
      visualization: {
        type: "bar",
        x: targetCat,
        y: `average_${targetNum}`,
        title: `Average ${targetNum} by ${targetCat}`,
        data: averages,
      },
    };
  }

  // 3. Monthly or Date Trend
  if (
    q.includes("trend") ||
    q.includes("over time") ||
    q.includes("month") ||
    q.includes("timeline") ||
    q.includes("history")
  ) {
    const dateCol =
      profile.datetimeColumns[0] ||
      Object.keys(data[0] || {}).find((c) => c.toLowerCase().includes("date") || c.toLowerCase().includes("time")) ||
      "date";
    const targetNum =
      numCols.find((c) => q.includes(c.toLowerCase()) || q.includes(c.toLowerCase().replace(/_/g, " "))) ||
      numCols[0] ||
      "revenue";

    const periodSums: Record<string, number> = {};
    for (const row of data) {
      const dVal = String(row[dateCol] || "");
      const period = dVal.length >= 7 ? dVal.slice(0, 7) : dVal; // YYYY-MM
      const val = Number(row[targetNum]) || 0;
      periodSums[period] = (periodSums[period] || 0) + val;
    }

    const trend = Object.entries(periodSums)
      .map(([period, total]) => ({ period, [targetNum]: Number(total.toFixed(2)) }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      pandasCode: `df.groupby(pd.to_datetime(df['${dateCol}']).dt.to_period('M'))['${targetNum}'].sum().reset_index()`,
      calcResult: trend,
      visualization: {
        type: "line",
        x: "period",
        y: targetNum,
        title: `Monthly Trend of ${targetNum}`,
        data: trend,
      },
    };
  }

  // 4. Anomaly or Outlier inquiry
  if (q.includes("anomal") || q.includes("outlier") || q.includes("unusual")) {
    const targetNum =
      numCols.find((c) => q.includes(c.toLowerCase()) || q.includes(c.toLowerCase().replace(/_/g, " "))) ||
      numCols[0] ||
      "profit";

    const prof = profile.columnProfiles[targetNum];
    const q25 = prof?.q25 ?? 0;
    const q75 = prof?.q75 ?? 100;
    const iqr = q75 - q25;
    const lower = q25 - 1.5 * iqr;
    const upper = q75 + 1.5 * iqr;

    const outliers: Record<string, any>[] = [];
    for (const row of data) {
      const val = Number(row[targetNum]);
      if (!isNaN(val) && (val < lower || val > upper)) {
        outliers.push({
          ...row,
          _outlier_value: val,
          _variance_from_mean: prof?.mean ? Number((val - prof.mean).toFixed(2)) : 0,
        });
      }
    }

    return {
      pandasCode: `q25 = df['${targetNum}'].quantile(0.25)\nq75 = df['${targetNum}'].quantile(0.75)\niqr = q75 - q25\ndf[(df['${targetNum}'] < q25 - 1.5*iqr) | (df['${targetNum}'] > q75 + 1.5*iqr)]`,
      calcResult: {
        targetColumn: targetNum,
        outlierCount: outliers.length,
        outlierPercentage: Number(((outliers.length / data.length) * 100).toFixed(2)),
        lowerBound: Number(lower.toFixed(2)),
        upperBound: Number(upper.toFixed(2)),
        sampleOutliers: outliers.slice(0, 10),
      },
      visualization: {
        type: "histogram",
        x: targetNum,
        title: `Outlier Distribution in ${targetNum}`,
      },
    };
  }

  // 5. General summary breakdown
  const primaryCat = catCols[0] || "category";
  const primaryNum = numCols[0] || "total";

  const summaryMap: Record<string, number> = {};
  for (const row of data) {
    const cat = String(row[primaryCat] || "Other");
    summaryMap[cat] = (summaryMap[cat] || 0) + (Number(row[primaryNum]) || 0);
  }

  const breakdown = Object.entries(summaryMap)
    .map(([k, v]) => ({ [primaryCat]: k, [primaryNum]: Number(v.toFixed(2)) }))
    .sort((a, b) => Number(b[primaryNum]) - Number(a[primaryNum]))
    .slice(0, 8);

  return {
    pandasCode: `df.groupby('${primaryCat}')['${primaryNum}'].sum().reset_index().sort_values(by='${primaryNum}', ascending=False).head(8)`,
    calcResult: breakdown,
    visualization: {
      type: "bar",
      x: primaryCat,
      y: primaryNum,
      title: `${primaryNum} by ${primaryCat}`,
      data: breakdown,
    },
  };
}
