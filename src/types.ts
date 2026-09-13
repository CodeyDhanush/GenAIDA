export type ColumnType = "Numerical" | "Categorical" | "DateTime" | "Boolean" | "ID";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  dtype: string;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  cardinality: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  q25?: number;
  q75?: number;
  skewness?: number;
  outlierCount?: number;
  topCategories?: Record<string, number>;
}

export interface DatasetProfile {
  rows: number;
  columns: number;
  memoryUsage: string;
  duplicateRows: number;
  duplicatePercentage: number;
  missingCells?: number;
  missingPercentage?: number;
  numericalColumns: string[];
  categoricalColumns: string[];
  datetimeColumns: string[];
  booleanColumns: string[];
  idColumns: string[];
  columnProfiles: Record<string, ColumnProfile>;
  summary: string;
}

export interface KpiCard {
  title: string;
  total: number;
  average: number;
  formattedTotal: string;
  formattedAverage: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  query: string;
  pandasCode?: string;
  rawResult?: any;
  nlExplanation: string;
  visualization?: {
    type: "bar" | "line" | "area" | "scatter" | "histogram" | "box" | "pie" | "heatmap";
    x?: string;
    y?: string;
    title?: string;
    data?: any[];
  };
  followupQuestions?: string[];
}

export interface DataQualityReport {
  score: number;
  missingCells: number;
  missingPercentage: number;
  duplicateRows: number;
  duplicatePercentage: number;
  outlierPercentage: number;
  constantColumns: string[];
  highCorrelationPairs: Array<{ col1: string; col2: string; correlation: number }>;
  recommendations: string[];
}

export interface AnomalyResult {
  column: string;
  method: "IQR" | "Z-Score" | "Isolation Forest";
  threshold: number;
  anomalyCount: number;
  anomalyPercentage: number;
  anomalyIndices: number[];
  affectedRecords: Record<string, any>[];
  lowerBound?: number;
  upperBound?: number;
  explanation?: string;
}

export interface CorrelationPair {
  featureX: string;
  featureY: string;
  correlation: number;
  strength: "Very Strong" | "Strong" | "Moderate";
}

export interface CorrelationResult {
  matrix: Record<string, Record<string, number>>;
  positivePairs: CorrelationPair[];
  negativePairs: CorrelationPair[];
  columns: string[];
}

export interface PredictiveResult {
  taskType: "Regression" | "Classification";
  modelName: string;
  targetColumn: string;
  features: string[];
  sampleSize: number;
  metrics: Record<string, number | string>;
  featureImportance: Record<string, number>;
  coefficients?: Record<string, number>;
  intercept?: number;
  residuals?: { actual: number; predicted: number; residual: number }[];
  confusionMatrix?: { labels: string[]; matrix: number[][] };
  trainTestSplit?: { trainCount: number; testCount: number };
  explanation?: string;
  testActuals?: number[];
  testPredictions?: number[];
}

export interface ModelBenchmarkItem {
  modelName: string;
  taskType: "Regression" | "Classification";
  primaryScoreName: string;
  primaryScore: number;
  metrics: Record<string, number | string>;
  trainingTimeMs: number;
  accuracy?: number;
  mae?: number;
  rmse?: number;
  topFeature?: string;
}

export interface DataCleaningOptions {
  dropDuplicates?: boolean;
  removeDuplicates?: boolean;
  imputeStrategy?: "none" | "mean" | "median" | "mode" | "constant" | string;
  constantValue?: string | number;
  dropConstantColumns?: boolean;
  clipOutliers?: boolean;
  outlierThreshold?: number;
  imputeMissingNumerical?: string | boolean;
  imputeMissingCategorical?: string | boolean;
  handleOutliers?: string | boolean;
}

export interface CleanedDatasetResult {
  cleanedData: Record<string, any>[];
  rowsRemoved: number;
  cellsImputed: number;
  columnsDropped: string[];
  outliersClipped: number;
  metrics?: {
    duplicatesRemoved?: number;
    nullsImputed?: number;
    outliersHandled?: number;
    columnsDropped?: string[];
    rowsRemaining?: number;
    missingCellsRemaining?: number;
    duplicatesRemaining?: number;
    columnsRemaining?: number;
  };
  actionsApplied?: string[];
}

export interface MulticollinearityVIF {
  feature: string;
  vif: number;
  status: "Low" | "Moderate" | "Severe Multicollinearity";
  highestCorrelatedWith: string;
  highestCorrelation: number;
}

export interface BivariateAnomalyPoint {
  x: number;
  y: number;
  isAnomaly: boolean;
  score: number;
  row: Record<string, any>;
}

export interface ExecutiveInsights {
  executive_summary: string;
  key_trends: string;
  anomalies: string;
  opportunities: string;
  risks: string;
  recommendations: string;
  next_steps: string;
}

export interface PythonProjectFile {
  path: string;
  size: number;
  content: string;
}

export type AuthProvider = "google" | "business_email" | "phone" | "email";

export interface UserProfile {
  id: string;
  name: string;
  dob?: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  organization?: string;
  jobTitle?: string;
  provider: AuthProvider;
  createdAt: string;
  isOrganizationVerified?: boolean;
}

export type DashboardChartType =
  | "bar"
  | "column"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "scatter"
  | "treemap"
  | "kpi"
  | "gauge"
  | "funnel"
  | "heatmap"
  | "table";

export type DashboardAggregation = "sum" | "mean" | "count" | "min" | "max" | "median";

export type DashboardColorTheme =
  | "power-bi-classic"
  | "tableau-10"
  | "warm-modern"
  | "emerald-fresh"
  | "cyber-indigo"
  | "sunset-amber";

export type DashboardWidgetWidth = "1/3" | "1/2" | "2/3" | "full";

export interface DashboardWidget {
  id: string;
  title: string;
  chartType: DashboardChartType;
  xCol: string;
  yCol: string;
  colorCol?: string;
  aggregation: DashboardAggregation;
  width: DashboardWidgetWidth;
  height: number;
  theme: DashboardColorTheme;
  sort?: "desc" | "asc" | "none";
  limit?: number;
  showDataLabels?: boolean;
  showLegend?: boolean;
  kpiSubtitle?: string;
  kpiTarget?: number;
}

export interface CustomDashboard {
  id: string;
  name: string;
  description?: string;
  theme: DashboardColorTheme;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
}
