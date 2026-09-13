import React from "react";
import {
  Home,
  BarChart3,
  MessageSquare,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  GitMerge,
  BrainCircuit,
  Lightbulb,
  FileText,
  User,
  Building2,
  X,
  Compass,
  Sigma,
  LayoutDashboard,
} from "lucide-react";
import { UserProfile } from "../types";

export type NavTabId =
  | "home"
  | "overview"
  | "dashboard"
  | "eda"
  | "stats"
  | "chat"
  | "visuals"
  | "quality"
  | "anomaly"
  | "correlation"
  | "predictive"
  | "insights"
  | "reports";

export interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  hasDataset: boolean;
  datasetName?: string | null;
  rowCount?: number;
  colCount?: number;
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  hasDataset,
  datasetName,
  rowCount = 0,
  colCount = 0,
  user,
  onOpenAuth,
  mobileOpen = false,
  onMobileClose,
}) => {
  const menuItems = [
    { id: "home" as NavTabId, label: "Home", icon: Home, badge: null },
    { id: "overview" as NavTabId, label: "Dataset Overview", icon: BarChart3, badge: null },
    { id: "dashboard" as NavTabId, label: "Dashboard Studio", icon: LayoutDashboard, badge: "BI" },
    { id: "eda" as NavTabId, label: "EDA (Exploratory Data)", icon: Compass, badge: "Deep" },
    { id: "stats" as NavTabId, label: "Statistical Analysis", icon: Sigma, badge: "Tests" },
    { id: "chat" as NavTabId, label: "AI Analyst", icon: MessageSquare, badge: "AI" },
    { id: "visuals" as NavTabId, label: "Visual Analytics", icon: PieChart, badge: "Auto" },
    { id: "quality" as NavTabId, label: "Data Quality", icon: ShieldCheck, badge: null },
    { id: "anomaly" as NavTabId, label: "Anomaly Detection", icon: AlertTriangle, badge: "ML" },
    { id: "correlation" as NavTabId, label: "Correlation Matrix", icon: GitMerge, badge: null },
    { id: "predictive" as NavTabId, label: "Predictive Analytics", icon: BrainCircuit, badge: "ML" },
    { id: "insights" as NavTabId, label: "AI Business Insights", icon: Lightbulb, badge: "C-Level" },
    { id: "reports" as NavTabId, label: "Reports & Export", icon: FileText, badge: "PDF" },
  ];

  const handleTabClick = (tabId: NavTabId) => {
    onSelectTab(tabId);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const renderSidebarContent = (isMobile: boolean = false) => (
    <>
      <div className="p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#ede5d8] text-[#1c1a18] rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
              G
            </div>
            <div>
              <h1 className="font-bold text-[#f7f4ef] text-base tracking-tight leading-none">
                GenAI Analyst
              </h1>
              <span className="text-[10px] font-semibold text-[#c7bba8] uppercase tracking-wider">
                Enterprise Suite
              </span>
            </div>
          </div>
          {isMobile && onMobileClose && (
            <button
              onClick={onMobileClose}
              title="Close menu"
              className="p-1.5 rounded-lg text-[#a89e91] hover:text-[#f7f4ef] hover:bg-[#2b2723] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="text-[10px] uppercase font-semibold text-[#8c8275] mb-2 px-2 tracking-wider">
          Platform Navigation
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const disabled = !hasDataset && item.id !== "home";

            return (
              <button
                key={item.id}
                disabled={disabled}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer ${
                  isActive
                    ? "bg-[#ede5d8] text-[#1c1a18] font-semibold shadow-xs"
                    : disabled
                    ? "text-[#5e584f] cursor-not-allowed"
                    : "text-[#c9c1b3] hover:bg-[#2b2723] hover:text-[#f7f4ef]"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-[#1c1a18]" : disabled ? "text-[#5e584f]" : "text-[#9c9384]"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ${
                      isActive
                        ? "bg-[#1c1a18] text-[#ede5d8]"
                        : "bg-[#2b2723] text-[#a89e91] border border-[#3d3731]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-[#2e2a26] bg-[#161412] space-y-3">
        {/* User Workspace Info */}
        {user ? (
          <div className="p-2.5 bg-[#24201c] rounded-lg border border-[#38332c] flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="h-6 w-6 rounded-full bg-[#38332c] text-[#f7f4ef] flex items-center justify-center text-[10px] font-bold shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-[11px] font-semibold text-[#f7f4ef] truncate">{user.name}</div>
                <div className="text-[9px] text-[#a89e91] truncate">
                  {user.organization || (user.email ? user.email.split("@")[1] : user.phoneNumber)}
                </div>
              </div>
            </div>
            {user.isOrganizationVerified && (
              <span className="text-[9px] font-bold bg-[#edf4ec] text-[#23531e] px-1 py-0.5 rounded shrink-0">
                SSO
              </span>
            )}
          </div>
        ) : onOpenAuth ? (
          <button
            onClick={() => {
              if (onMobileClose) onMobileClose();
              onOpenAuth();
            }}
            className="w-full py-2 px-3 rounded-lg border border-[#38332c] bg-[#24201c] hover:bg-[#2e2924] text-xs font-semibold text-[#ede5d8] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <User className="h-3.5 w-3.5" />
            <span>Sign In / Register</span>
          </button>
        ) : null}

        <div>
          <div className="text-[10px] uppercase font-semibold text-[#8c8275] mb-2 tracking-wider">
            Active Dataset
          </div>
          {hasDataset && datasetName ? (
            <div className="p-3 bg-[#24201c] rounded-lg border border-[#38332c]">
              <div className="text-xs font-medium text-[#f7f4ef] truncate" title={datasetName}>
                {datasetName}
              </div>
              <div className="text-[10px] text-[#a89e91] mt-1 uppercase tracking-wider">
                {rowCount.toLocaleString()} rows • {colCount} cols
              </div>
              <div className="mt-2 h-1 w-full bg-[#38332c] rounded-full overflow-hidden">
                <div className="h-full bg-[#ede5d8] w-[94%] transition-all"></div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#24201c]/50 rounded-lg border border-[#2e2a26] text-center">
              <div className="text-xs text-[#a89e91] font-medium">No Dataset Loaded</div>
              <div className="text-[10px] text-[#70685c] mt-1">Upload CSV or XLSX file</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-[#9c9384]">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Zero-hallucination guardrails active</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Standard Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#1c1a18] text-[#d6cebf] flex-col shrink-0 border-r border-[#2e2a26] select-none h-full overflow-y-auto">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#161412]/75 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#1c1a18] text-[#d6cebf] flex flex-col h-full z-10 shadow-2xl overflow-y-auto">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
