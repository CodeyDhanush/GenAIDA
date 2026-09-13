import React, { useState, useRef, useEffect } from "react";
import { RefreshCw, User, LogOut, Building2, CheckCircle2, ChevronDown, Sparkles, Menu, Database, Check, Code2 } from "lucide-react";
import { UserProfile } from "../types";
import { SAMPLE_DATASETS, SampleDatasetMeta } from "../data/sampleDatasets";

interface NavbarProps {
  datasetName: string | null;
  rowCount: number;
  colCount: number;
  geminiConnected: boolean;
  onClearData: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onToggleMobileSidebar?: () => void;
  onLoadPreset?: (filename: string, name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  datasetName,
  rowCount,
  colCount,
  geminiConnected,
  onClearData,
  user,
  onOpenAuth,
  onSignOut,
  onToggleMobileSidebar,
  onLoadPreset,
}) => {
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [datasetsOpen, setDatasetsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const datasetsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (datasetsRef.current && !datasetsRef.current.contains(e.target as Node)) {
        setDatasetsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-[#fcfaf6] border-b border-[#ded5c5] flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-30 shrink-0 w-full">
      <div className="flex items-center gap-2 sm:gap-4 text-xs md:text-sm min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            title="Open menu"
            className="lg:hidden p-2 -ml-1 rounded-lg text-[#5c5549] hover:text-[#1c1917] hover:bg-[#ede5d8] transition-colors cursor-pointer shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <span className="text-[#8c8275] font-medium hidden sm:inline shrink-0">Project:</span>
        <span className="font-semibold text-[#1c1917] truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
          {datasetName ? datasetName.replace(/\.[^/.]+$/, "").replace(/_/g, " ") : "Enterprise Analytics Workspace"}
        </span>
        {datasetName ? (
          <span className="px-2 py-0.5 bg-[#ede5d8] text-[#24211e] border border-[#d8cdbc] rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Ready</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-[#efe6d8] text-[#70685c] rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
            Idle
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Test Datasets Switcher */}
        {onLoadPreset && (
          <div className="relative" ref={datasetsRef}>
            <button
              onClick={() => setDatasetsOpen(!datasetsOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-[#ded5c5] bg-[#f5efe4] hover:bg-[#ece3d4] px-2.5 py-1.5 text-xs font-semibold text-[#24211e] transition-colors cursor-pointer shadow-2xs"
              title="Quickly test with various domain datasets"
            >
              <Database className="h-3.5 w-3.5 text-[#5c554b]" />
              <span className="hidden md:inline">Test Datasets</span>
              <ChevronDown className="h-3 w-3 text-[#70685c]" />
            </button>

            {datasetsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-2.5 shadow-xl z-50 space-y-1.5 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1.5 border-b border-[#ded5c5]">
                  <div className="text-xs font-bold text-[#1c1917] flex items-center justify-between">
                    <span>Benchmark Test Datasets</span>
                    <span className="text-[10px] bg-[#ede5d8] px-1.5 py-0.5 rounded text-[#5c554b] font-medium">5 Domains</span>
                  </div>
                  <p className="text-[11px] text-[#70685c] mt-0.5">
                    Switch datasets instantly to test analytics, EDA, models, and charts across different domains.
                  </p>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 py-1">
                  {SAMPLE_DATASETS.map((ds) => {
                    const isSelected = datasetName === ds.filename || datasetName === ds.name;
                    return (
                      <button
                        key={ds.id}
                        onClick={() => {
                          setDatasetsOpen(false);
                          onLoadPreset(ds.filename, ds.name);
                        }}
                        className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? "border-[#24211e] bg-[#ede5d8]/70"
                            : "border-transparent hover:border-[#ded5c5] hover:bg-[#f7f3eb]"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-[#1c1917] truncate">{ds.name}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#70685c]">
                            <span>{ds.domain}</span>
                            <span>•</span>
                            <span>{ds.records} rows</span>
                            <span>•</span>
                            <span>{ds.features} cols</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {datasetName && (
          <button
            onClick={onClearData}
            title="Clear and reset dataset"
            className="text-xs font-medium text-[#70685c] hover:text-rose-700 px-2.5 py-1.5 rounded-md hover:bg-[#efe6d8] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset Data</span>
          </button>
        )}

        {/* Link to Standalone Vanilla HTML/CSS/JS Edition */}
        <a
          href="/vanilla.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#ded5c5] bg-[#f5efe4] hover:bg-[#ece3d4] px-2.5 py-1.5 text-xs font-semibold text-[#24211e] transition-colors cursor-pointer shadow-2xs"
          title="Open standalone pure HTML, CSS & JavaScript edition"
        >
          <Code2 className="h-3.5 w-3.5 text-[#5c554b]" />
          <span>HTML / JS Edition</span>
        </a>

        {/* User Account / Profile Controls */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-[#f2ece2] border border-[#ded5c5] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#24211e] flex items-center justify-center text-[#f7f4ef] font-bold text-xs select-none shadow-2xs shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="text-left hidden sm:block max-w-[120px] truncate">
                <div className="text-xs font-bold text-[#1c1917] truncate">{user.name}</div>
                {user.organization && (
                  <div className="text-[10px] text-[#70685c] truncate">{user.organization}</div>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#8c8273]" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-3 shadow-lg z-50 space-y-3">
                <div className="border-b border-[#ded5c5] pb-3 space-y-1">
                  <div className="text-xs font-bold text-[#1c1917]">{user.name}</div>
                  <div className="text-[11px] text-[#70685c] truncate">
                    {user.email || user.phoneNumber}
                  </div>
                  {user.jobTitle && (
                    <div className="text-[10px] text-[#8c8273]">{user.jobTitle}</div>
                  )}

                  <div className="pt-1.5 flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#f7f3eb] border border-[#ded5c5] px-2 py-0.5 text-[10px] font-semibold text-[#1c1917]">
                      {user.provider === "google" && "Google Gmail"}
                      {user.provider === "business_email" && (user.organization ? `${user.organization} Workspace` : "Business Email")}
                      {user.provider === "phone" && "Mobile Verified"}
                      {user.provider === "email" && "Standard Account"}
                    </span>

                    {user.isOrganizationVerified && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#edf4ec] border border-[#ded5c5] px-2 py-0.5 text-[10px] font-semibold text-[#23531e]">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified Domain
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#5c554b] hover:text-[#1c1917] hover:bg-[#f7f3eb] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Switch or Add Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 rounded-lg bg-[#24211e] px-3 py-1.5 text-xs font-semibold text-[#f7f4ef] hover:bg-[#38332e] transition-colors shadow-2xs cursor-pointer"
          >
            <User className="h-3.5 w-3.5" />
            <span>Sign In / Sign Up</span>
          </button>
        )}
      </div>
    </header>
  );
};

