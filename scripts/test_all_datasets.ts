import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { profileDataset, computeCorrelations, computeSpearmanCorrelation, computeDataQuality, detectAnomalies } from "../src/utils/dataEngine";
import {
  generateEdaReport,
  computeKde,
  computeQqPlot,
  computeEcdf,
  computeParetoCategorical,
  computeCrossTabulation,
  computeNullityMatrix,
} from "../src/utils/edaEngine";
import {
  computeDetailedStats,
  runTwoSampleTTest,
  runOneWayAnova,
  runChiSquareTest,
} from "../src/utils/statEngine";

const datasetsToTest = [
  { name: "Retail & Sales", file: "sample_sales_data.csv" },
  { name: "Healthcare Clinical", file: "healthcare_patient_outcomes.csv" },
  { name: "SaaS Churn", file: "saas_churn_subscription.csv" },
  { name: "Workforce HR", file: "hr_workforce_attrition.csv" },
  { name: "Financial Risk", file: "financial_portfolio_risk.csv" },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("STARTING AUTOMATED ENGINE BENCHMARK ACROSS 5 DIVERSE DATASETS");
  console.log("==================================================================");

  for (const ds of datasetsToTest) {
    console.log(`\n------------------------------------------------------------------`);
    console.log(`TESTING DATASET: [${ds.name}] (${ds.file})`);
    console.log(`------------------------------------------------------------------`);

    const filePath = path.join(process.cwd(), "public", ds.file);
    assert(fs.existsSync(filePath), `File exists at public/${ds.file}`);

    const rawText = fs.readFileSync(filePath, "utf-8");
    const parsed = Papa.parse(rawText, { header: true, skipEmptyLines: true, dynamicTyping: true });
    const data = parsed.data as Record<string, any>[];

    assert(data.length > 50, `Parsed records > 50 (got ${data.length} rows)`);

    // 1. DATASET PROFILING
    const profile = profileDataset(data);
    assert(profile.rows === data.length, `Profile row count matches parsed rows (${profile.rows})`);
    assert(profile.columns > 5, `Profile detected > 5 columns (${profile.columns} columns)`);
    assert(profile.numericalColumns.length >= 3, `Detected >= 3 numerical columns (${profile.numericalColumns.join(", ")})`);
    assert(profile.categoricalColumns.length >= 2, `Detected >= 2 categorical columns (${profile.categoricalColumns.join(", ")})`);

    // Check no NaN or invalid values in column profiles
    for (const numCol of profile.numericalColumns) {
      const colProf = profile.columnProfiles[numCol];
      assert(!isNaN(colProf.mean as number), `${numCol} mean is valid number (${colProf.mean})`);
      assert(!isNaN(colProf.std as number), `${numCol} std is valid number (${colProf.std})`);
      assert(!isNaN(colProf.median as number), `${numCol} median is valid number (${colProf.median})`);
      assert(!isNaN(colProf.skewness as number), `${numCol} skewness is valid number (${colProf.skewness})`);
    }

    // 2. EDA REPORT GENERATION
    const edaReport = generateEdaReport(data, profile);
    assert(edaReport.completenessScore >= 0 && edaReport.completenessScore <= 100, `Completeness score valid (${edaReport.completenessScore}%)`);
    assert(edaReport.cardinalitySpectrum.length === profile.columns, `Cardinality spectrum includes all columns`);
    assert(edaReport.insights.length > 0, `Generated automated EDA insights (${edaReport.insights.length} insights)`);

    // 3. UNIVARIATE VISUAL DATA GENERATION (KDE, QQ, ECDF)
    const primaryNum = profile.numericalColumns[0];
    const numValues = data.map((d) => Number(d[primaryNum])).filter((n) => !isNaN(n));
    const kde = computeKde(numValues, 50);
    assert(kde.x.length === 50 && kde.y.length === 50, `KDE density generated 50 points`);
    assert(kde.y.every((v) => !isNaN(v) && v >= 0), `KDE densities are non-negative and finite`);

    const qq = computeQqPlot(numValues);
    assert(qq.theoretical.length > 0 && qq.sample.length > 0, `Q-Q plot points computed successfully`);
    assert(qq.theoretical.every((v) => !isNaN(v)), `Q-Q theoretical quantiles are valid numbers`);

    const ecdf = computeEcdf(numValues);
    assert(ecdf.x.length > 0 && ecdf.y[ecdf.y.length - 1] === 1.0, `ECDF culminates at probability 1.0`);

    // 4. CATEGORICAL VISUAL DATA (Pareto & Cross-tabulation)
    const primaryCat = profile.categoricalColumns[0];
    const pareto = computeParetoCategorical(data, primaryCat, 10);
    assert(pareto.categories.length > 0, `Pareto categories extracted (${pareto.categories.length})`);
    assert(pareto.cumulativePct[pareto.cumulativePct.length - 1] <= 100, `Cumulative percentage <= 100%`);

    if (profile.categoricalColumns.length >= 2) {
      const cat2 = profile.categoricalColumns[1];
      const crossTab = computeCrossTabulation(data, primaryCat, cat2, 5);
      assert(crossTab.xLabels.length > 0 && crossTab.yLabels.length > 0, `Cross-tabulation matrix computed (${crossTab.xLabels.length}x${crossTab.yLabels.length})`);
      assert(crossTab.totalCount > 0, `Cross-tabulation has valid count (${crossTab.totalCount})`);
    }

    // 5. MISSINGNESS NULLITY MATRIX
    const nullity = computeNullityMatrix(data, Object.keys(profile.columnProfiles).slice(0, 10), 30);
    assert(nullity.z.length > 0 && nullity.z[0].length > 0, `Nullity matrix 2D grid created (${nullity.z.length} samples)`);

    // 6. DETAILED STATS & HYPOTHESIS TESTING
    for (const numCol of profile.numericalColumns.slice(0, 3)) {
      const stats = computeDetailedStats(numCol, data);
      assert(stats !== null && !isNaN(stats.mean), `Detailed stats for ${numCol} computed (mean=${stats?.mean}, skew=${stats?.skewness}, kurtosis=${stats?.kurtosis})`);
      assert(stats !== null && !isNaN(stats.ci95Lower) && !isNaN(stats.ci95Upper), `95% CI valid [${stats?.ci95Lower}, ${stats?.ci95Upper}]`);
    }

    if (profile.numericalColumns.length >= 1 && profile.categoricalColumns.length >= 1) {
      const numCol = profile.numericalColumns[0];
      const catCol = profile.categoricalColumns[0];
      const distinctGroups = Object.keys(profile.columnProfiles[catCol]?.topCategories || {});

      if (distinctGroups.length >= 2) {
        // Welch's t-test between group 1 and group 2
        const tTest = runTwoSampleTTest(data, numCol, catCol, distinctGroups[0], distinctGroups[1]);
        if (tTest) {
          assert(!isNaN(tTest.tStat) && !isNaN(tTest.pValue), `Welch t-test on ${numCol} (${distinctGroups[0]} vs ${distinctGroups[1]}) valid: t=${tTest.tStat}, p=${tTest.pValue}`);
        }

        // ANOVA
        const anova = runOneWayAnova(data, numCol, catCol);
        if (anova) {
          assert(!isNaN(anova.fStat) && !isNaN(anova.pValue), `One-way ANOVA on ${numCol} by ${catCol} valid: F=${anova.fStat}, p=${anova.pValue}`);
        }
      }
    }

    if (profile.categoricalColumns.length >= 2) {
      // Chi-square test
      const cat1 = profile.categoricalColumns[0];
      const cat2 = profile.categoricalColumns[1];
      const chiResult = runChiSquareTest(data, cat1, cat2);
      if (chiResult) {
        assert(!isNaN(chiResult.chi2) && !isNaN(chiResult.pValue), `Chi-Square test (${cat1} vs ${cat2}) valid: Chi2=${chiResult.chi2}, p=${chiResult.pValue}`);
      }
    }

    // 7. CORRELATION & VIF
    const numSubset = profile.numericalColumns.slice(0, 5);
    const pearson = computeCorrelations(data, numSubset);
    assert(pearson.columns.length === numSubset.length, `Pearson correlations computed for ${pearson.columns.length} features`);

    const spearman = computeSpearmanCorrelation(data, numSubset);
    assert(spearman.columns.length === numSubset.length, `Spearman correlations computed for ${spearman.columns.length} features`);

    // 8. DATA QUALITY & ANOMALIES
    const quality = computeDataQuality(data, profile);
    assert(quality.score >= 0 && quality.score <= 100, `Data quality score valid (${quality.score}/100)`);

    const anomalies = detectAnomalies(data, primaryNum, "IQR", 1.5);
    assert(anomalies.anomalyCount >= 0, `IQR Outlier detection ran cleanly (found ${anomalies.anomalyCount} anomalies in ${primaryNum})`);
  }

  console.log("\n==================================================================");
  console.log(`TEST RESULTS SUMMARY:`);
  console.log(`TOTAL CHECKS: ${totalTests}`);
  console.log(`PASSED:       ${passedTests}`);
  console.log(`FAILED:       ${failedTests}`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
