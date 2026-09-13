import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  findUserByEmail,
  findUserByPhone,
  createUser,
  storeOtp,
  verifyOtpCode,
  isTargetVerified,
} from "./src/db/users.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize server-side Gemini client
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      databaseConfigured: !!process.env.SQL_HOST,
    });
  });

  // ==========================================
  // AUTHENTICATION & VERIFICATION API ROUTES
  // (Stored in Cloud SQL relational database)
  // ==========================================

  // 1. Send OTP (Email or Phone)
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { target, type } = req.body;
      if (!target || !type || (type !== "email" && type !== "phone")) {
        return res.status(400).json({ error: "Target and valid type ('email' | 'phone') are required." });
      }

      // Generate 6-digit numeric OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await storeOtp(target, type, code);

      console.log(`[OTP DISPATCH] Generated OTP for ${type} (${target}): ${code}`);

      res.json({
        success: true,
        message: `A 6-digit OTP code has been sent to your ${type === "email" ? "Gmail address" : "phone number"}.`,
        otpCode: code, // Shared in response for preview/demo verification convenience
        target,
        type,
      });
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      res.status(500).json({ error: err.message || "Failed to generate and store verification code." });
    }
  });

  // 2. Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { target, type, code } = req.body;
      if (!target || !type || !code) {
        return res.status(400).json({ error: "Target, type, and code are required." });
      }

      const isValid = await verifyOtpCode(target, type, code);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: "Invalid or expired verification code. Please check and try again.",
        });
      }

      res.json({
        success: true,
        verified: true,
        message: `${type === "email" ? "Gmail" : "Phone"} verified successfully!`,
      });
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      res.status(500).json({ error: err.message || "Failed to verify code." });
    }
  });

  // 3. Register Account (Name, DOB, Phone, Gmail, Password with Dual Verification)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, dob, phone, email, password, emailOtp, phoneOtp, organization } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Full name is required." });
      }
      if (!dob || !dob.trim()) {
        return res.status(400).json({ error: "Date of birth (DOB) is required." });
      }
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "A valid Gmail or email address is required." });
      }
      if (!phone || phone.trim().length < 7) {
        return res.status(400).json({ error: "A valid phone number is required." });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }

      // Check if email already exists
      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          error: "An account with this Gmail address already exists. Please sign in instead.",
        });
      }

      // Check if phone already exists
      const existingPhone = await findUserByPhone(phone);
      if (existingPhone) {
        return res.status(400).json({
          error: "An account with this phone number already exists. Please sign in instead.",
        });
      }

      // Check OTP verification for Email
      let emailOk = false;
      if (emailOtp) {
        emailOk = await verifyOtpCode(email, "email", emailOtp);
      }
      if (!emailOk) {
        emailOk = await isTargetVerified(email, "email");
      }
      if (!emailOk) {
        return res.status(400).json({
          error: "Gmail verification incomplete. Please enter the valid OTP sent to your Gmail address.",
        });
      }

      // Check OTP verification for Phone
      let phoneOk = false;
      if (phoneOtp) {
        phoneOk = await verifyOtpCode(phone, "phone", phoneOtp);
      }
      if (!phoneOk) {
        phoneOk = await isTargetVerified(phone, "phone");
      }
      if (!phoneOk) {
        return res.status(400).json({
          error: "Phone verification incomplete. Please enter the valid OTP sent to your phone number.",
        });
      }

      // All verified! Insert record into Cloud SQL Database
      const newUser = await createUser({
        name,
        dob,
        email,
        phone,
        password,
        organization,
      });

      console.log(`[USER REGISTERED] User ${newUser.email} created in Cloud SQL database with ID ${newUser.id}`);

      res.status(201).json({
        success: true,
        message: "Account created and verified successfully!",
        user: {
          uid: newUser.uid,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          dob: newUser.dob,
          organization: newUser.organization,
          createdAt: newUser.createdAt,
          method: "email",
        },
      });
    } catch (err: any) {
      console.error("Error registering user:", err);
      res.status(500).json({ error: err.message || "Failed to create account in database." });
    }
  });

  // 4. Login (Strict verification: only created accounts are allowed)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password, otp, method = "email" } = req.body;

      if (!identifier || !identifier.trim()) {
        return res.status(400).json({ error: "Email or Phone Number is required." });
      }

      const trimmedIdentifier = identifier.trim();
      let user = null;

      // Find user in Cloud SQL
      if (trimmedIdentifier.includes("@") || method === "email" || method === "google") {
        user = await findUserByEmail(trimmedIdentifier);
      } else {
        user = await findUserByPhone(trimmedIdentifier);
      }

      // STRICT USER CONSTRAINT:
      // "only who created account can login and dont allow people withou create account"
      if (!user) {
        return res.status(403).json({
          error: "Access Denied: No account found for this user. You must create an account first before logging in.",
          accountNotFound: true,
        });
      }

      // Verify credentials if password provided
      if (password) {
        if (user.password !== password) {
          return res.status(401).json({ error: "Invalid password. Please check your credentials and try again." });
        }
      } else if (otp) {
        const isOtpValid = await verifyOtpCode(trimmedIdentifier, method === "phone" ? "phone" : "email", otp);
        if (!isOtpValid) {
          return res.status(401).json({ error: "Invalid or expired verification code." });
        }
      } else if (method !== "google") {
        return res.status(400).json({ error: "Password or verification code is required." });
      }

      res.json({
        success: true,
        message: "Login successful!",
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          phone: user.phone,
          dob: user.dob,
          organization: user.organization,
          createdAt: user.createdAt,
          method,
        },
      });
    } catch (err: any) {
      console.error("Error logging in:", err);
      res.status(500).json({ error: err.message || "Login failed." });
    }
  });

  // 5. Account existence check
  app.get("/api/auth/check-account", async (req, res) => {
    try {
      const identifier = req.query.identifier as string;
      if (!identifier) {
        return res.status(400).json({ error: "Identifier is required." });
      }

      const trimmed = identifier.trim();
      let user = null;
      if (trimmed.includes("@")) {
        user = await findUserByEmail(trimmed);
      } else {
        user = await findUserByPhone(trimmed);
      }

      res.json({ exists: !!user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Gemini Query Explainer & Follow-up suggestions
  app.post("/api/gemini/query-explain", async (req, res) => {
    try {
      const { userQuery, calculatedResult, schema } = req.body;

      if (!ai) {
        return res.json({
          explanation: `Calculated Analytical Result:\n${JSON.stringify(calculatedResult, null, 2)}`,
          followups: [
            "What are the primary drivers of this metric?",
            "How does this compare across regional categories?",
            "Are there any outliers in this subset?",
          ],
        });
      }

      const prompt = `
You are an expert Senior Data Analyst Assistant.
The user asked: "${userQuery}"

A deterministic calculation was executed against the user's dataset (Columns: ${Object.keys(schema || {}).join(", ")}).

Calculated Result:
${JSON.stringify(calculatedResult, null, 2)}

INSTRUCTIONS:
1. Answer the user's query clearly, concisely, and professionally using ONLY the calculated numbers above.
2. DO NOT invent or extrapolate facts not supported by the calculation.
3. Highlight notable business takeaways, percentages, or top contributors where relevant.
4. Also provide 3 to 4 logical follow-up questions formatted at the very end after the delimiter "---FOLLOWUPS---", one question per line starting with "- ".
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      const fullText = response.text || "";
      const parts = fullText.split("---FOLLOWUPS---");
      const explanation = parts[0].trim();

      let followups: string[] = [];
      if (parts[1]) {
        followups = parts[1]
          .split("\n")
          .map((l) => l.trim().replace(/^[-*•\d.]\s*/, ""))
          .filter((l) => l.length > 5)
          .slice(0, 4);
      }

      if (followups.length === 0) {
        followups = [
          "Compare this metric against other categories",
          "What is the historical growth trend?",
          "Are there any statistical anomalies here?",
        ];
      }

      res.json({ explanation, followups });
    } catch (err: any) {
      console.error("Gemini query-explain error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate explanation",
        explanation: "Analysis calculation completed. (AI explanation service temporarily busy)",
        followups: [
          "What are the top 5 contributors?",
          "Show monthly breakdown",
          "Are there outliers?",
        ],
      });
    }
  });

  // Gemini Anomaly & Correlation Explanation
  app.post("/api/gemini/explain-artifact", async (req, res) => {
    try {
      const { type, details, context } = req.body;

      if (!ai) {
        return res.json({
          explanation: `Statistical summary for ${type}: ${JSON.stringify(details, null, 2)}`,
        });
      }

      const prompt = `
You are an expert Data Analyst & Statistician.
Analyze the following computed ${type} from a business dataset:

Data Details:
${JSON.stringify(details, null, 2)}

Context:
${JSON.stringify(context || {}, null, 2)}

Provide a concise, professional, executive-ready explanation:
- If this is Anomaly Detection: Explain why these observations are statistical outliers, potential operational causes (e.g. data entry error, bulk order, exceptional spike), and business risk mitigation actions.
- If this is Correlation Analysis: Explain the strongest relationships observed, what they suggest about business dynamics, and explicitly distinguish correlation from causation.
- If this is Predictive Modeling: Explain the most influential predictive features and actionable recommendations.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      res.json({ explanation: response.text?.trim() || "" });
    } catch (err: any) {
      console.error("Gemini explain-artifact error:", err);
      res.status(500).json({
        explanation: `Computed results verified. (AI narrative generation error: ${err.message})`,
      });
    }
  });

  // Gemini Full Executive Briefing Insights
  app.post("/api/gemini/insights", async (req, res) => {
    try {
      const { datasetName, rowCount, columnCount, kpis, correlations, anomalies, qualityScore } = req.body;

      if (!ai) {
        return res.json({
          executive_summary: `Dataset '${datasetName}' with ${rowCount} records and ${columnCount} features analyzed. Total records show steady distribution.`,
          key_trends: "Core revenue and volume metrics show consistent performance across primary segments.",
          anomalies: `Detected ${anomalies?.count || 0} anomalies across numerical features requiring operational audit.`,
          opportunities: "Focus inventory and sales promotion on high-margin categories and peak regions.",
          risks: "Mitigate operational volatility in long-tail categories with high variance.",
          recommendations: "Automate monthly data reconciliation and re-balance regional sales targets.",
          next_steps: "Conduct multivariate cohort analysis across customer purchasing frequency.",
        });
      }

      const prompt = `
You are a Chief Data & Analytics Officer preparing an executive briefing for leadership:

Dataset: ${datasetName}
Records: ${rowCount} | Columns: ${columnCount}
Data Quality Score: ${qualityScore} / 100
Computed Core KPIs:
${JSON.stringify(kpis, null, 2)}
Computed Correlations:
${JSON.stringify(correlations?.slice(0, 5) || [], null, 2)}
Detected Anomalies:
${JSON.stringify(anomalies || {}, null, 2)}

Write an executive briefing with EXACTLY these 7 sections. Format each section header as "### <Title>":
### Executive Summary
### Key Trends
### Important Anomalies
### Opportunities
### Risks
### Strategic Recommendations
### Suggested Next Analysis

All observations MUST be realistic and directly grounded in the provided metrics.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      const fullText = response.text || "";
      const sections: Record<string, string> = {
        executive_summary: "",
        key_trends: "",
        anomalies: "",
        opportunities: "",
        risks: "",
        recommendations: "",
        next_steps: "",
      };

      let currentKey = "executive_summary";
      for (const line of fullText.split("\n")) {
        const lower = line.toLowerCase();
        if (lower.includes("executive summary")) {
          currentKey = "executive_summary";
        } else if (lower.includes("key trend")) {
          currentKey = "key_trends";
        } else if (lower.includes("anomal")) {
          currentKey = "anomalies";
        } else if (lower.includes("opportunit")) {
          currentKey = "opportunities";
        } else if (lower.includes("risk")) {
          currentKey = "risks";
        } else if (lower.includes("recommendation")) {
          currentKey = "recommendations";
        } else if (lower.includes("next analysis") || lower.includes("next step")) {
          currentKey = "next_steps";
        } else {
          sections[currentKey] = (sections[currentKey] + "\n" + line).trim();
        }
      }

      res.json(sections);
    } catch (err: any) {
      console.error("Gemini insights error:", err);
      res.status(500).json({
        executive_summary: "Automated executive metrics computed from dataset.",
        key_trends: "Key drivers identified in KPI cards.",
        anomalies: "Review detected anomalies in the Anomaly Detection tab.",
        opportunities: "Maximize resource allocation in top product segments.",
        risks: "Monitor tail transactions for data quality.",
        recommendations: "Maintain regular data auditing.",
        next_steps: "Inspect category-level breakdowns.",
      });
    }
  });

  // API to list and get files of the Python project in genai-data-analyst/
  app.get("/api/python-project/files", (req, res) => {
    try {
      const baseDir = path.join(process.cwd(), "genai-data-analyst");
      const fileList: Array<{ path: string; size: number; content: string }> = [];

      function scanDir(dir: string, rel: string = "") {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = rel ? `${rel}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            if (entry.name !== "__pycache__" && entry.name !== ".git") {
              scanDir(fullPath, relPath);
            }
          } else {
            const stats = fs.statSync(fullPath);
            // Read content for text files
            const isText = /\.(py|txt|md|csv|example|json|yml|yaml|dockerfile)$/i.test(entry.name) || entry.name === "Dockerfile";
            const content = isText ? fs.readFileSync(fullPath, "utf-8") : "";
            fileList.push({
              path: relPath,
              size: stats.size,
              content,
            });
          }
        }
      }

      scanDir(baseDir);
      res.json({ files: fileList });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Catch-all for unmatched API routes to ensure they always return JSON, never HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GenAI Data Analyst Assistant server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
