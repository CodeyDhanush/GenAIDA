import React, { useState, useEffect } from "react";
import { DatasetProfile, ChatMessage, ExecutiveInsights, UserProfile } from "./types";
import { parseCSV, profileDataset } from "./utils/dataEngine";
import { Navbar } from "./components/Navbar";
import { Sidebar, NavTabId } from "./components/Sidebar";
import { AuthPage } from "./components/AuthPage";

// Tabs
import { HomeTab } from "./components/HomeTab";
import { OverviewTab } from "./components/OverviewTab";
import { DashboardStudioTab } from "./components/DashboardStudioTab";
import { EDATab } from "./components/EDATab";
import { StatisticalAnalysisTab } from "./components/StatisticalAnalysisTab";
import { ChatTab } from "./components/ChatTab";
import { VisualAnalyticsTab } from "./components/VisualAnalyticsTab";
import { DataQualityTab } from "./components/DataQualityTab";
import { AnomalyTab } from "./components/AnomalyTab";
import { CorrelationTab } from "./components/CorrelationTab";
import { PredictiveTab } from "./components/PredictiveTab";
import { InsightsTab } from "./components/InsightsTab";
import { ReportsTab } from "./components/ReportsTab";
import { TabErrorBoundary } from "./components/TabErrorBoundary";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>("home");
  const [data, setData] = useState<Record<string, any>[] | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [geminiConnected, setGeminiConnected] = useState<boolean>(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [initialQuery, setInitialQuery] = useState<string>("");
  const [insights, setInsights] = useState<ExecutiveInsights | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("genai_analyst_user_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [guestMode, setGuestMode] = useState<boolean>(() => {
    return localStorage.getItem("genai_analyst_guest_mode") === "true";
  });

  // Check backend health
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((d) => setGeminiConnected(d.geminiConfigured))
      .catch(() => setGeminiConnected(false));
  }, []);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    setGuestMode(false);
    try {
      localStorage.setItem("genai_analyst_user_session", JSON.stringify(user));
      localStorage.removeItem("genai_analyst_guest_mode");
    } catch (e) {
      console.error("Failed to save auth session", e);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setGuestMode(false);
    try {
      localStorage.removeItem("genai_analyst_user_session");
      localStorage.removeItem("genai_analyst_guest_mode");
    } catch (e) {
      console.error("Failed to clear auth session", e);
    }
  };

  const handleContinueAsGuest = () => {
    setGuestMode(true);
    setShowAuthModal(false);
    try {
      localStorage.setItem("genai_analyst_guest_mode", "true");
    } catch (e) {
      console.error("Failed to save guest preference", e);
    }
  };

  const handleDatasetLoaded = (name: string, rawData: Record<string, any>[]) => {
    setData(rawData);
    setDatasetName(name);
    const prof = profileDataset(rawData);
    setProfile(prof);
    setChatHistory([]);
    setInsights(null);
    setActiveTab("overview");
  };

  const handleLoadPresetDataset = async (filename: string, name: string) => {
    try {
      const resp = await fetch(`/${filename}`);
      if (!resp.ok) throw new Error("Failed to load preset dataset");
      const csvText = await resp.text();
      const rawData = await parseCSV(csvText);
      setData(rawData);
      setDatasetName(name);
      const prof = profileDataset(rawData);
      setProfile(prof);
      setChatHistory([]);
      setInsights(null);
      if (activeTab === "home") {
        setActiveTab("overview");
      }
    } catch (err) {
      console.error("Failed to load preset dataset", err);
    }
  };

  const handleClearData = () => {
    setData(null);
    setDatasetName(null);
    setProfile(null);
    setChatHistory([]);
    setInsights(null);
    setActiveTab("home");
  };

  const handleSelectQuestion = (q: string) => {
    // If no dataset loaded, load sample data first
    if (!data) {
      fetch("/sample_sales_data.csv")
        .then((r) => r.text())
        .then((txt) => parseCSV(txt))
        .then((parsed) => {
          setData(parsed);
          setDatasetName("sample_sales_data.csv");
          setProfile(profileDataset(parsed));
          setInitialQuery(q);
          setActiveTab("chat");
        });
    } else {
      setInitialQuery(q);
      setActiveTab("chat");
    }
  };

  // If user is not logged in, require account registration or login
  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] w-full max-w-[100vw] bg-[#f7f4ef] font-sans text-[#1c1917] flex flex-col justify-center items-center p-3 sm:p-6 overflow-y-auto">
        <AuthPage
          onSuccess={handleAuthSuccess}
          initialMode="signup"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full max-w-[100vw] bg-[#f7f4ef] font-sans text-[#1c1917] overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasDataset={!!data}
        datasetName={datasetName}
        rowCount={data ? data.length : 0}
        colCount={data && data[0] ? Object.keys(data[0]).length : 0}
        user={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden w-full">
        <Navbar
          datasetName={datasetName}
          rowCount={data ? data.length : 0}
          colCount={data && data[0] ? Object.keys(data[0]).length : 0}
          geminiConnected={geminiConnected}
          onClearData={handleClearData}
          user={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onSignOut={handleSignOut}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          onLoadPreset={handleLoadPresetDataset}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f7f4ef] min-w-0 w-full">
          <TabErrorBoundary key={activeTab} tabName={activeTab}>
            {activeTab === "home" && (
              <HomeTab
                onDatasetLoaded={handleDatasetLoaded}
                onSelectQuestion={handleSelectQuestion}
              />
            )}

            {activeTab === "overview" && data && profile && (
              <OverviewTab
                data={data}
                profile={profile}
                datasetName={datasetName || "Dataset"}
              />
            )}

            {activeTab === "dashboard" && data && profile && (
              <DashboardStudioTab
                data={data}
                profile={profile}
                datasetName={datasetName || "Dataset"}
              />
            )}

            {activeTab === "eda" && data && profile && (
              <EDATab
                data={data}
                profile={profile}
                datasetName={datasetName || "Dataset"}
              />
            )}

            {activeTab === "stats" && data && profile && (
              <StatisticalAnalysisTab
                data={data}
                profile={profile}
                datasetName={datasetName || "Dataset"}
              />
            )}

            {activeTab === "chat" && data && profile && (
              <ChatTab
                data={data}
                profile={profile}
                datasetName={datasetName || "Dataset"}
                initialQuery={initialQuery}
                chatHistory={chatHistory}
                onUpdateHistory={setChatHistory}
              />
            )}

            {activeTab === "visuals" && data && profile && (
              <VisualAnalyticsTab data={data} profile={profile} />
            )}

            {activeTab === "quality" && data && profile && (
              <DataQualityTab
                data={data}
                profile={profile}
                datasetName={datasetName || "Dataset"}
                onApplyCleanedData={(cleanedData, newProfile) => {
                  setData(cleanedData);
                  setProfile(newProfile);
                }}
              />
            )}

            {activeTab === "anomaly" && data && profile && (
              <AnomalyTab data={data} profile={profile} />
            )}

            {activeTab === "correlation" && data && profile && (
              <CorrelationTab data={data} profile={profile} />
            )}

            {activeTab === "predictive" && data && profile && (
              <PredictiveTab data={data} profile={profile} />
            )}

            {activeTab === "insights" && data && profile && (
              <InsightsTab
                data={data}
                profile={profile}
                datasetName={datasetName || "Dataset"}
                insights={insights}
                onUpdateInsights={setInsights}
              />
            )}

            {activeTab === "reports" && data && profile && (
              <ReportsTab
                data={data}
                profile={profile}
                datasetName={datasetName || "Dataset"}
                insights={insights}
                chatHistory={chatHistory}
              />
            )}
          </TabErrorBoundary>
        </main>
      </div>

      {/* Auth Modal Overlay when opened from inside the app */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-[#161412]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <AuthPage
            onSuccess={handleAuthSuccess}
            onClose={() => setShowAuthModal(false)}
          />
        </div>
      )}
    </div>
  );
}
export default App;

