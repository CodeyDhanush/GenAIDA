import fs from "fs";
import path from "path";

// Helper random functions
function randomNormal(mean = 0, std = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function round(val: number, decimals = 2): number {
  return Number(val.toFixed(decimals));
}

// 1. Enterprise Retail & Sales (120 rows)
function generateSalesData() {
  const regions = ["North", "South", "East", "West"];
  const categories = {
    Electronics: ["Pro Wireless Headphones", "Noise-Cancelling Earbuds", "Smart Fitness Tracker", "Bluetooth Portable Speaker", "Noise-Shield Headset"],
    Technology: ["4K Ultra HD Monitor", "Mechanical Keyboard", "USB-C Docking Station", "External SSD 1TB", "Curved Gaming Monitor", "Ergonomic Vertical Mouse"],
    Furniture: ["Ergonomic Office Chair", "Standing Desk Converter", "Leather Conference Chair", "Solid Wood Bookcase", "Adjustable Drafting Stool"],
    "Office Supplies": ["Heavy Duty Paper Shredder", "Executive Desk Organizer", "Laser Precision Pointer", "Gel Ink Roller Pens 24pk"],
  };
  const customers = [
    "Emma Watson", "Liam Neeson", "Sophia Martinez", "Noah Johnson", "Olivia Davis",
    "Ethan Clark", "Ava Brown", "Lucas Miller", "Mia Wilson", "Mason Taylor",
    "Isabella Anderson", "James Thomas", "Charlotte Jackson", "Benjamin White", "Amelia Harris",
    "Alexander Martin", "Harper Thompson", "Daniel Garcia", "Evelyn Robinson", "Matthew Lewis"
  ];

  const rows: string[] = [
    "Order_ID,Order_Date,Customer_ID,Customer_Name,Region,Category,Product,Quantity,Unit_Price,Revenue,Cost,Profit,Discount"
  ];

  let orderNum = 1001;
  const startEpoch = new Date("2024-01-01").getTime();

  for (let i = 0; i < 120; i++) {
    const orderId = `ORD-${orderNum++}`;
    const dateOffset = Math.floor(Math.random() * 180) * 86400000;
    const dateStr = new Date(startEpoch + dateOffset).toISOString().split("T")[0];
    const custIdx = Math.floor(Math.random() * customers.length);
    const custId = `CUST-${200 + custIdx}`;
    const custName = customers[custIdx];
    const region = choice(regions);
    const catKeys = Object.keys(categories) as (keyof typeof categories)[];
    const cat = choice(catKeys);
    const prod = choice(categories[cat]);
    const quantity = Math.max(1, Math.floor(Math.random() * 7) + 1);

    let unitPrice = 0;
    let costRatio = 0.58;
    if (cat === "Technology") {
      unitPrice = round(randomNormal(250, 80));
    } else if (cat === "Furniture") {
      unitPrice = round(randomNormal(220, 60));
    } else if (cat === "Electronics") {
      unitPrice = round(randomNormal(130, 40));
    } else {
      unitPrice = round(randomNormal(45, 15));
    }
    unitPrice = Math.max(15, unitPrice);

    const discount = choice([0, 0, 0, 0.05, 0.1, 0.15, 0.2]);
    const grossRev = unitPrice * quantity;
    const rev = round(grossRev * (1 - discount));
    const cost = round(grossRev * costRatio);
    const profit = round(rev - cost);

    rows.push(`${orderId},${dateStr},${custId},"${custName}",${region},${cat},"${prod}",${quantity},${unitPrice},${rev},${cost},${profit},${discount}`);
  }

  return rows.join("\n");
}

// 2. Healthcare Clinical Outcomes (150 rows)
function generateHealthcareData() {
  const genders = ["Male", "Female"];
  const treatments = ["Active Drug A", "Active Drug B", "Placebo Standard"];
  const smokers = ["Non-Smoker", "Former Smoker", "Active Smoker"];
  const rows = [
    "Patient_ID,Age,Gender,BMI,Systolic_BP,Diastolic_BP,Cholesterol_mg_dL,Fasting_Glucose_mg_dL,Treatment_Group,Smoker_Status,Hospital_Days,Readmitted_30D,Health_Recovery_Score"
  ];

  for (let i = 1; i <= 150; i++) {
    const id = `PAT-${String(i).padStart(4, "0")}`;
    const age = Math.floor(randomNormal(54, 12));
    const cleanAge = Math.min(85, Math.max(22, age));
    const gender = choice(genders);
    const bmi = round(Math.min(45, Math.max(18.5, randomNormal(27.4, 4.8))), 1);
    const sysBp = Math.floor(Math.min(180, Math.max(95, randomNormal(128, 16))));
    const diaBp = Math.floor(Math.min(110, Math.max(60, randomNormal(82, 10))));
    const chol = Math.floor(Math.min(320, Math.max(130, randomNormal(210, 35))));
    const glucose = Math.floor(Math.min(220, Math.max(70, randomNormal(108, 24))));
    const treatment = choice(treatments);
    const smoker = choice(smokers);

    // Days in hospital correlated with age and BP
    let days = Math.floor(randomNormal(5 + (cleanAge > 65 ? 2 : 0) + (treatment === "Placebo Standard" ? 1.5 : 0), 2.5));
    days = Math.max(1, days);

    // Readmission probability
    let readmitProb = 0.12;
    if (treatment === "Placebo Standard") readmitProb += 0.15;
    if (smoker === "Active Smoker") readmitProb += 0.10;
    if (cleanAge > 70) readmitProb += 0.12;
    const readmitted = Math.random() < readmitProb ? "Yes" : "No";

    // Recovery score [0 - 100]
    let score = 75 - (bmi > 30 ? 6 : 0) - (smoker === "Active Smoker" ? 8 : 0) + (treatment.includes("Drug") ? 12 : -5) + randomNormal(0, 7);
    score = round(Math.min(99, Math.max(35, score)), 1);

    rows.push(`${id},${cleanAge},${gender},${bmi},${sysBp},${diaBp},${chol},${glucose},${treatment},${smoker},${days},${readmitted},${score}`);
  }

  return rows.join("\n");
}

// 3. SaaS Subscription & Churn (140 rows)
function generateSaasData() {
  const segments = ["Enterprise", "Mid-Market", "SMB", "Startup"];
  const plans = ["Starter", "Professional", "Enterprise", "Custom Elite"];
  const contracts = ["Month-to-Month", "One-Year", "Two-Year"];

  const rows = [
    "Account_ID,Customer_Segment,Plan_Tier,Monthly_Charges_USD,Tenure_Months,Total_Charges_USD,Support_Tickets,Login_Frequency_Weekly,Storage_Used_GB,Contract_Type,Churned"
  ];

  for (let i = 1; i <= 140; i++) {
    const id = `ACC-${String(i).padStart(4, "0")}`;
    const segment = choice(segments);
    let plan = choice(plans);
    if (segment === "Enterprise") plan = choice(["Enterprise", "Custom Elite"]);
    if (segment === "Startup") plan = choice(["Starter", "Professional"]);

    let baseMonthly = 49;
    if (plan === "Professional") baseMonthly = 129;
    if (plan === "Enterprise") baseMonthly = 399;
    if (plan === "Custom Elite") baseMonthly = 799;
    const monthlyCharges = round(Math.max(29, randomNormal(baseMonthly, baseMonthly * 0.15)));

    const contract = choice(contracts);
    const tenure = Math.max(1, Math.floor(Math.random() * 48) + 1);
    const totalCharges = round(monthlyCharges * tenure * (1 - (contract === "Two-Year" ? 0.15 : contract === "One-Year" ? 0.08 : 0)));

    const supportTickets = Math.max(0, Math.floor(randomNormal(3.2, 2.8)));
    const loginFreq = Math.max(1, Math.floor(randomNormal(14, 6)));
    const storageGb = round(Math.max(5, randomNormal(120, 80)), 1);

    // Churn probability
    let churnProb = 0.18;
    if (contract === "Month-to-Month") churnProb += 0.22;
    if (supportTickets >= 6) churnProb += 0.30;
    if (loginFreq < 5) churnProb += 0.25;
    if (tenure > 24) churnProb -= 0.15;
    const churned = Math.random() < Math.max(0.04, Math.min(0.85, churnProb)) ? "Yes" : "No";

    rows.push(`${id},${segment},${plan},${monthlyCharges},${tenure},${totalCharges},${supportTickets},${loginFreq},${storageGb},${contract},${churned}`);
  }

  return rows.join("\n");
}

// 4. Workforce HR Attrition (130 rows)
function generateHrData() {
  const departments = ["Engineering", "Sales", "Marketing", "Product", "Operations", "Finance"];
  const roles: Record<string, string[]> = {
    Engineering: ["Frontend Engineer", "Backend Engineer", "DevOps Specialist", "Engineering Manager", "Data Engineer"],
    Sales: ["Account Executive", "Sales Representative", "Sales Director", "BDR"],
    Marketing: ["Growth Marketer", "Content Strategist", "Brand Manager"],
    Product: ["Product Manager", "UI/UX Designer", "Product Analyst"],
    Operations: ["Operations Lead", "Logistics Coordinator", "Support Manager"],
    Finance: ["Financial Analyst", "Accountant", "Finance Director"],
  };

  const rows = [
    "Employee_ID,Department,Job_Role,Salary_USD,Age,Experience_Years,Performance_Score,Overtime,Work_Life_Balance,Commute_Distance_KM,Job_Satisfaction_Score,Left_Company"
  ];

  for (let i = 1; i <= 130; i++) {
    const id = `EMP-${String(i).padStart(4, "0")}`;
    const dept = choice(departments);
    const role = choice(roles[dept]);
    const exp = Math.max(1, Math.floor(randomNormal(6, 4)));
    const age = Math.min(65, Math.max(22, 22 + exp + Math.floor(Math.random() * 8)));

    let baseSalary = 65000;
    if (dept === "Engineering") baseSalary = 105000;
    if (dept === "Product") baseSalary = 98000;
    if (dept === "Sales") baseSalary = 80000;
    if (dept === "Finance") baseSalary = 88000;
    if (role.includes("Director") || role.includes("Manager") || role.includes("Lead")) baseSalary += 35000;

    const salary = Math.floor(baseSalary + exp * 4500 + randomNormal(0, 7000));
    const perf = Math.min(5, Math.max(1, Math.floor(randomNormal(3.4, 0.8))));
    const overtime = choice(["Yes", "No", "No", "No"]);
    const wlb = choice(["Poor", "Fair", "Good", "Excellent"]);
    const commute = Math.max(1, Math.floor(randomNormal(16, 11)));

    // Satisfaction score 1 to 10
    let sat = 7;
    if (overtime === "Yes") sat -= 1.8;
    if (wlb === "Poor") sat -= 2.2;
    if (commute > 30) sat -= 1.2;
    sat = Math.min(10, Math.max(1, Math.round(sat + randomNormal(0, 1.2))));

    // Left company probability
    let leaveProb = 0.14;
    if (sat <= 4) leaveProb += 0.35;
    if (overtime === "Yes") leaveProb += 0.18;
    if (wlb === "Poor") leaveProb += 0.22;
    const left = Math.random() < Math.min(0.85, leaveProb) ? "Yes" : "No";

    rows.push(`${id},${dept},"${role}",${salary},${age},${exp},${perf},${overtime},${wlb},${commute},${sat},${left}`);
  }

  return rows.join("\n");
}

// 5. Financial Market & Portfolio Risk (120 rows)
function generateFinancialData() {
  const sectors = ["Technology", "Healthcare", "Financial Services", "Energy", "Consumer Cyclical", "Industrials", "Communication"];
  const tickers = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "JNJ", "PFE", "UNH", "JPM", "BAC",
    "XOM", "CVX", "TSLA", "HD", "CAT", "DIS", "NFLX", "AMD", "ABBV", "COST",
    "CRM", "ORCL", "CSCO", "PEP", "KO", "WMT", "MCD", "NKE", "IBM", "TXN",
    "QCOM", "INTC", "BMY", "LLY", "MRK", "WFC", "C", "GS", "MS", "COP",
    "SLB", "EOG", "F", "GM", "GE", "BA", "HON", "UPS", "CMCSA", "VZ"
  ];

  const rows = [
    "Ticker,Company_Name,Sector,Market_Cap_B_USD,PE_Ratio,Beta_Risk,Dividend_Yield_Pct,Return_1Y_Pct,Volatility_30D_Pct,Debt_To_Equity_Ratio,ESG_Risk_Score"
  ];

  for (let i = 0; i < 120; i++) {
    const ticker = i < tickers.length ? tickers[i] : `ASSET_${i + 1}`;
    const name = `${ticker} Holdings Inc.`;
    const sector = choice(sectors);

    const marketCap = round(Math.max(5, randomNormal(120, 180)), 1);
    const peRatio = round(Math.max(6, randomNormal(26, 14)), 1);
    const beta = round(Math.max(0.3, randomNormal(1.05, 0.38)), 2);
    const divYield = round(Math.max(0, randomNormal(1.8, 1.4)), 2);
    const return1Y = round(randomNormal(14.5, 22.0), 1);
    const vol30 = round(Math.max(8, randomNormal(22.5, 8.5)), 1);
    const debtToEquity = round(Math.max(0.1, randomNormal(1.25, 0.7)), 2);
    const esg = round(Math.min(50, Math.max(8, randomNormal(21.5, 6.5))), 1);

    rows.push(`${ticker},"${name}",${sector},${marketCap},${peRatio},${beta},${divYield},${return1Y},${vol30},${debtToEquity},${esg}`);
  }

  return rows.join("\n");
}

// Generate all files into public folder
const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, "sample_sales_data.csv"), generateSalesData());
console.log("✓ Generated public/sample_sales_data.csv (Retail & Sales)");

fs.writeFileSync(path.join(publicDir, "healthcare_patient_outcomes.csv"), generateHealthcareData());
console.log("✓ Generated public/healthcare_patient_outcomes.csv (Healthcare Clinical)");

fs.writeFileSync(path.join(publicDir, "saas_churn_subscription.csv"), generateSaasData());
console.log("✓ Generated public/saas_churn_subscription.csv (SaaS Churn & Revenue)");

fs.writeFileSync(path.join(publicDir, "hr_workforce_attrition.csv"), generateHrData());
console.log("✓ Generated public/hr_workforce_attrition.csv (Workforce HR)");

fs.writeFileSync(path.join(publicDir, "financial_portfolio_risk.csv"), generateFinancialData());
console.log("✓ Generated public/financial_portfolio_risk.csv (Financial Portfolio)");
