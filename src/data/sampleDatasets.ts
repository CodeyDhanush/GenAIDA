export interface SampleDatasetMeta {
  id: string;
  name: string;
  filename: string;
  domain: string;
  records: number;
  features: number;
  description: string;
  recommendedFocus: string;
  badgeColor: string;
}

export const SAMPLE_DATASETS: SampleDatasetMeta[] = [
  {
    id: "retail_sales",
    name: "Enterprise Retail & Sales",
    filename: "sample_sales_data.csv",
    domain: "Commerce & Retail",
    records: 120,
    features: 13,
    description: "Multinational sales transactions across North, South, East, and West territories covering electronics, technology, office supplies, and furniture.",
    recommendedFocus: "Revenue vs Profit correlations, Discount sensitivity, Regional ANOVA test, Monthly trends.",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    id: "healthcare_clinical",
    name: "Clinical Trial & Patient Outcomes",
    filename: "healthcare_patient_outcomes.csv",
    domain: "Healthcare & Life Sciences",
    records: 150,
    features: 13,
    description: "Patient biometric indicators including BMI, Blood Pressure, Cholesterol, Glucose, Smoker status, Treatment Groups, and 30-day readmissions.",
    recommendedFocus: "Two-sample t-test (Treatment vs Control), Chi-square (Smoking vs Readmission), Health Score regression.",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    id: "saas_churn",
    name: "SaaS Subscription & Churn Risk",
    filename: "saas_churn_subscription.csv",
    domain: "Cloud & B2B SaaS",
    records: 140,
    features: 11,
    description: "Customer retention metrics including Monthly Recurring Charges, Tenure, Support Tickets, Storage usage, Contract types, and Attrition labels.",
    recommendedFocus: "Churn classification modeling, Support Tickets vs Churn Mann-Whitney test, VIF multicollinearity.",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    id: "hr_attrition",
    name: "Workforce Talent & HR Attrition",
    filename: "hr_workforce_attrition.csv",
    domain: "Human Resources & Talent",
    records: 130,
    features: 12,
    description: "Workforce survey and compensation records across Engineering, Sales, Product, Marketing, and Operations with satisfaction and overtime markers.",
    recommendedFocus: "Satisfaction vs Salary distributions, Departmental ANOVA, Overtime odds ratio, Attrition prediction.",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    id: "financial_risk",
    name: "Financial Assets & Portfolio Risk",
    filename: "financial_portfolio_risk.csv",
    domain: "Finance & Investment",
    records: 120,
    features: 11,
    description: "Equities portfolio metrics including Beta risk factors, P/E ratios, 1-Year Returns, 30-Day Volatilities, Debt/Equity, and ESG ratings across sectors.",
    recommendedFocus: "Beta vs Volatility scatter regression, Sector Sharpe ratio analysis, ESG score hypothesis tests.",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
  },
];
