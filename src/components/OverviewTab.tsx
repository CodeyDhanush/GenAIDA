import React, { useState, useMemo } from "react";
import { DatasetProfile, ColumnProfile } from "../types";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Hash,
  Type,
  Calendar,
  CheckSquare,
  KeyRound,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
  BarChart3,
  SlidersHorizontal,
  FileSpreadsheet,
} from "lucide-react";

interface OverviewTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
  datasetName: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ data, profile, datasetName }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColFilter, setSelectedColFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeInspectCol, setActiveInspectCol] = useState<ColumnProfile | null>(null);
  const [showColManager, setShowColManager] = useState(false);

  const allColumns = Object.keys(data[0] || {});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns);
  const colProfiles = Object.values(profile.columnProfiles) as ColumnProfile[];

  const handleToggleCol = (col: string) => {
    if (visibleColumns.includes(col)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter((c) => c !== col));
      }
    } else {
      setVisibleColumns([...visibleColumns, col]);
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortCol(null);
        setSortDir("asc");
      }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // Filtered and sorted rows
  const filteredAndSortedRows = useMemo(() => {
    let result = data;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) => {
        if (selectedColFilter === "all") {
          return Object.values(row).some((val) => String(val).toLowerCase().includes(term));
        } else {
          return String(row[selectedColFilter] ?? "").toLowerCase().includes(term);
        }
      });
    }

    if (sortCol) {
      result = [...result].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "asc" ? valA - valB : valB - valA;
        }
        return sortDir === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, searchTerm, selectedColFilter, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const currentRows = filteredAndSortedRows.slice(startIndex, startIndex + pageSize);

  const totalMissing = colProfiles.reduce((sum, col) => sum + col.missingCount, 0);

  const exportFilteredData = (format: "csv" | "json") => {
    if (!filteredAndSortedRows.length) return;
    if (format === "csv") {
      const headers = visibleColumns;
      const csv = [
        headers.join(","),
        ...filteredAndSortedRows.map((r) =>
          headers
            .map((h) => {
              const val = r[h];
              if (val === null || val === undefined) return "";
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${datasetName.replace(/\.[^/.]+$/, "")}_filtered.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify(filteredAndSortedRows, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${datasetName.replace(/\.[^/.]+$/, "")}_filtered.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Numerical":
        return <Hash className="h-3.5 w-3.5 text-[#24211e]" />;
      case "Categorical":
        return <Type className="h-3.5 w-3.5 text-[#443e37]" />;
      case "DateTime":
        return <Calendar className="h-3.5 w-3.5 text-[#664b1f]" />;
      case "Boolean":
        return <CheckSquare className="h-3.5 w-3.5 text-[#2f491c]" />;
      case "ID":
        return <KeyRound className="h-3.5 w-3.5 text-[#70685c]" />;
      default:
        return <Type className="h-3.5 w-3.5 text-[#70685c]" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "Numerical":
        return "bg-[#efe6d8] text-[#24211e] border-[#d8cdbc]";
      case "Categorical":
        return "bg-[#eadecc] text-[#3d362e] border-[#d5c7b2]";
      case "DateTime":
        return "bg-[#f2e7cb] text-[#5e4518] border-[#e2d5b3]";
      case "Boolean":
        return "bg-[#e5ebd9] text-[#2a4518] border-[#cfdac0]";
      case "ID":
        return "bg-[#f0ebe1] text-[#5c554b] border-[#ded7ca]";
      default:
        return "bg-[#f0ebe1] text-[#5c554b] border-[#ded7ca]";
    }
  };

  // Inspect column deep stats
  const getInspectValues = (colName: string) => {
    const rawVals = data.map((d) => d[colName]).filter((v) => v !== null && v !== undefined && v !== "");
    const counts: Record<string, number> = {};
    for (const v of rawVals) {
      const s = String(v);
      counts[s] = (counts[s] || 0) + 1;
    }
    const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      totalNonEmpty: rawVals.length,
      topValues: sortedCounts,
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
          <div className="text-xs text-[#70685c] font-medium uppercase tracking-wider">Total Records</div>
          <div className="text-2xl font-bold mt-1 text-[#1c1917]">{profile.rows.toLocaleString()}</div>
          <div className="text-xs text-emerald-700 mt-1 font-semibold">In-Memory Active</div>
        </div>

        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
          <div className="text-xs text-[#70685c] font-medium uppercase tracking-wider">Dimensions</div>
          <div className="text-2xl font-bold mt-1 text-[#1c1917]">{profile.columns}</div>
          <div className="text-xs text-[#8c8275] mt-1">
            {profile.numericalColumns.length} num • {profile.categoricalColumns.length} cat
          </div>
        </div>

        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
          <div className="text-xs text-[#70685c] font-medium uppercase tracking-wider">Memory Size</div>
          <div className="text-2xl font-bold mt-1 text-[#1c1917]">{profile.memoryUsage}</div>
          <div className="text-xs text-[#8c8275] mt-1">Footprint</div>
        </div>

        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
          <div className="text-xs text-[#70685c] font-medium uppercase tracking-wider">Duplicates</div>
          <div className="text-2xl font-bold mt-1 text-[#1c1917]">{profile.duplicateRows.toLocaleString()}</div>
          <div className={`text-xs mt-1 font-semibold ${profile.duplicateRows > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {profile.duplicatePercentage}% of dataset
          </div>
        </div>

        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5] shadow-xs">
          <div className="text-xs text-[#70685c] font-medium uppercase tracking-wider">Missing Values</div>
          <div className="text-2xl font-bold mt-1 text-[#1c1917]">{totalMissing.toLocaleString()}</div>
          <div className={`text-xs mt-1 font-semibold ${totalMissing > 0 ? "text-rose-700" : "text-emerald-700"}`}>
            {totalMissing === 0 ? "Complete 100%" : "Needs Audit"}
          </div>
        </div>
      </div>

      {/* Profiling summary banner */}
      <div className="rounded-xl border border-[#ded5c5] bg-[#efe6d8]/70 p-4 text-xs sm:text-sm text-[#24211e] leading-relaxed shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#24211e] text-[#f7f4ef] flex items-center justify-center shrink-0 mt-0.5">
          <FileSpreadsheet className="h-4 w-4" />
        </div>
        <div>
          <span className="font-bold text-[#1c1917]">Automated Profiling Summary:</span> {profile.summary}
        </div>
      </div>

      {/* Interactive Table View */}
      <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
              <span>Dataset Records Explorer</span>
              <span className="rounded-full bg-[#efe6d8] px-2.5 py-0.5 text-xs text-[#24211e] font-semibold">
                {filteredAndSortedRows.length.toLocaleString()} matching
              </span>
            </h3>
            <p className="text-xs text-[#70685c] mt-0.5">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredAndSortedRows.length)} of{" "}
              {filteredAndSortedRows.length.toLocaleString()} rows • Click any column header to sort
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Column specific search dropdown */}
            <select
              value={selectedColFilter}
              onChange={(e) => {
                setSelectedColFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-2.5 py-1.5 text-xs text-[#2c2824] focus:outline-none cursor-pointer"
            >
              <option value="all">Search in: All Columns</option>
              {allColumns.map((col) => (
                <option key={col} value={col}>
                  Search in: {col}
                </option>
              ))}
            </select>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8c8275]" />
              <input
                type="text"
                placeholder="Type to filter rows..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] pl-8 pr-3 py-1.5 text-xs text-[#1c1917] placeholder-[#8c8275] focus:border-[#24211e] focus:bg-white focus:outline-none w-48 sm:w-56"
              />
            </div>

            {/* Column Manager Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColManager(!showColManager)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  showColManager
                    ? "border-[#24211e] bg-[#24211e] text-[#f7f4ef]"
                    : "border-[#ded5c5] bg-[#f7f3eb] text-[#2c2824] hover:bg-[#ede5d8]"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Columns ({visibleColumns.length}/{allColumns.length})</span>
              </button>

              {showColManager && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[#ded5c5] bg-white p-3 shadow-lg z-30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1c1917] border-b border-[#ded5c5] pb-1.5">
                    <span>Show / Hide Columns</span>
                    <button
                      onClick={() => setVisibleColumns(allColumns)}
                      className="text-[11px] text-[#24211e] hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {allColumns.map((col) => (
                      <label
                        key={col}
                        className="flex items-center gap-2 text-xs text-[#2c2824] hover:bg-[#f7f3eb] p-1 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col)}
                          onChange={() => handleToggleCol(col)}
                          className="rounded border-[#ded5c5] text-[#24211e] focus:ring-0"
                        />
                        <span className="truncate">{col}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => exportFilteredData("csv")}
                title="Download filtered records as CSV"
                className="inline-flex items-center gap-1 rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-2.5 py-1.5 text-xs font-medium text-[#2c2824] hover:bg-[#ede5d8] transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => exportFilteredData("json")}
                title="Download filtered records as JSON"
                className="inline-flex items-center gap-1 rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-2.5 py-1.5 text-xs font-medium text-[#2c2824] hover:bg-[#ede5d8] transition-colors cursor-pointer"
              >
                <span>JSON</span>
              </button>
            </div>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] px-2 py-1.5 text-xs text-[#2c2824] focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto rounded-lg border border-[#ded5c5]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#ded5c5] bg-[#f7f3eb] font-semibold text-[#2c2824]">
                <th className="px-3.5 py-2.5 w-12 text-[#8c8275]">#</th>
                {visibleColumns.map((col) => {
                  const isSorted = sortCol === col;
                  return (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-3.5 py-2.5 whitespace-nowrap cursor-pointer hover:bg-[#ede5d8]/80 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col}</span>
                        {isSorted ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-[#24211e]" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-[#24211e]" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-[#b3a898] opacity-60" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede6d8] font-mono text-[11px]">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center text-[#8c8275] font-sans">
                    No matching records found for "{searchTerm}".
                  </td>
                </tr>
              ) : (
                currentRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#efe6d8]/60 transition-colors">
                    <td className="px-3.5 py-2 text-[#8c8275] font-sans">{startIndex + idx + 1}</td>
                    {visibleColumns.map((col) => (
                      <td key={col} className="px-3.5 py-2 text-[#2c2824] whitespace-nowrap">
                        {row[col] !== null && row[col] !== undefined ? (
                          String(row[col])
                        ) : (
                          <span className="text-[#a89e91] italic font-sans">null</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-[#70685c]">
            Showing page {currentPage} of {totalPages} ({filteredAndSortedRows.length.toLocaleString()} records)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-[#ded5c5] bg-[#fbf9f5] p-1.5 text-[#2c2824] hover:bg-[#ede5d8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-xs font-semibold px-2 text-[#2c2824]">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-[#ded5c5] bg-[#fbf9f5] p-1.5 text-[#2c2824] hover:bg-[#ede5d8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Column Properties Table with Quick Inspection Modal */}
      <div className="rounded-xl border border-[#ded5c5] bg-[#fdfbf7] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#1c1917]">Dimension & Metric Properties</h3>
            <p className="text-xs text-[#70685c]">
              Click on any row to open the in-depth distribution and statistical breakdown
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#ded5c5]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#ded5c5] bg-[#f7f3eb] font-semibold text-[#2c2824]">
                <th className="px-3.5 py-2.5">Feature Name</th>
                <th className="px-3.5 py-2.5">Classification</th>
                <th className="px-3.5 py-2.5">Missing</th>
                <th className="px-3.5 py-2.5">Distinct</th>
                <th className="px-3.5 py-2.5">Mean / Median</th>
                <th className="px-3.5 py-2.5">Min / Max</th>
                <th className="px-3.5 py-2.5">Std Dev</th>
                <th className="px-3.5 py-2.5">Skewness</th>
                <th className="px-3.5 py-2.5 text-right">Deep Dive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede6d8]">
              {colProfiles.map((col) => (
                <tr
                  key={col.name}
                  onClick={() => setActiveInspectCol(col)}
                  className="hover:bg-[#efe6d8]/60 transition-colors cursor-pointer group"
                >
                  <td className="px-3.5 py-2.5 font-semibold text-[#1c1917] group-hover:text-[#24211e]">
                    {col.name}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${getTypeBadgeClass(
                        col.type
                      )}`}
                    >
                      {getTypeIcon(col.type)}
                      {col.type}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-[#5c554b]">
                    {col.missingCount > 0 ? (
                      <span className="text-rose-700 font-medium">
                        {col.missingCount} ({col.missingPercentage}%)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">0%</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-[#2c2824]">{col.uniqueCount.toLocaleString()}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#5c554b]">
                    {col.mean !== undefined ? (
                      `${col.mean.toLocaleString()} / ${col.median?.toLocaleString()}`
                    ) : (
                      <span className="text-[#a89e91] font-sans">-</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#5c554b]">
                    {col.min !== undefined ? (
                      `${col.min.toLocaleString()} to ${col.max?.toLocaleString()}`
                    ) : (
                      <span className="text-[#a89e91] font-sans">-</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#5c554b]">
                    {col.std !== undefined ? col.std.toLocaleString() : <span className="text-[#a89e91] font-sans">-</span>}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#5c554b]">
                    {col.skewness !== undefined ? col.skewness : <span className="text-[#a89e91] font-sans">-</span>}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <button className="rounded-md bg-[#efe6d8] px-2 py-1 text-[11px] font-semibold text-[#24211e] group-hover:bg-[#24211e] group-hover:text-[#f7f4ef] transition-colors">
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Deep-Dive Modal */}
      {activeInspectCol && (
        <div className="fixed inset-0 z-50 bg-[#161412]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] rounded-2xl border border-[#ded5c5] max-w-xl w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#ded5c5] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${getTypeBadgeClass(
                    activeInspectCol.type
                  )}`}
                >
                  {getTypeIcon(activeInspectCol.type)}
                  {activeInspectCol.type}
                </span>
                <h3 className="text-base font-bold text-[#1c1917]">{activeInspectCol.name}</h3>
              </div>
              <button
                onClick={() => setActiveInspectCol(null)}
                className="p-1 rounded-lg text-[#8c8275] hover:text-[#1c1917] hover:bg-[#efe6d8] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-2.5">
                <div className="text-[10px] uppercase font-semibold text-[#70685c]">Distinct Values</div>
                <div className="text-lg font-bold text-[#1c1917] mt-0.5">
                  {activeInspectCol.uniqueCount.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-2.5">
                <div className="text-[10px] uppercase font-semibold text-[#70685c]">Missing Cells</div>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    activeInspectCol.missingCount > 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {activeInspectCol.missingCount} ({activeInspectCol.missingPercentage}%)
                </div>
              </div>
              <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-2.5">
                <div className="text-[10px] uppercase font-semibold text-[#70685c]">Uniqueness</div>
                <div className="text-lg font-bold text-[#1c1917] mt-0.5">
                  {((activeInspectCol.uniqueCount / profile.rows) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg border border-[#ded5c5] bg-[#f7f3eb] p-2.5">
                <div className="text-[10px] uppercase font-semibold text-[#70685c]">Sample Fill</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">
                  {(100 - activeInspectCol.missingPercentage).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* If numerical: show 5-number summary and IQR */}
            {activeInspectCol.type === "Numerical" && (
              <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-4 space-y-2">
                <div className="text-xs font-bold text-[#1c1917] flex items-center justify-between">
                  <span>Statistical Summary Matrix</span>
                  <span className="text-[11px] text-[#70685c] font-normal">Parametric & Non-Parametric</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[#70685c]">Mean:</span>{" "}
                    <span className="font-semibold text-[#1c1917]">{activeInspectCol.mean?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#70685c]">Median:</span>{" "}
                    <span className="font-semibold text-[#1c1917]">{activeInspectCol.median?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#70685c]">Std Dev:</span>{" "}
                    <span className="font-semibold text-[#1c1917]">{activeInspectCol.std?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#70685c]">Min:</span>{" "}
                    <span className="font-semibold text-[#1c1917]">{activeInspectCol.min?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#70685c]">Max:</span>{" "}
                    <span className="font-semibold text-[#1c1917]">{activeInspectCol.max?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#70685c]">Skewness:</span>{" "}
                    <span className="font-semibold text-[#1c1917]">{activeInspectCol.skewness}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Frequent Values */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#1c1917]">Most Frequent Values (Top 10)</div>
              {(() => {
                const { topValues } = getInspectValues(activeInspectCol.name);
                const maxValCount = topValues[0]?.[1] || 1;
                return (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {topValues.map(([val, cnt]) => {
                      const pct = ((cnt / profile.rows) * 100).toFixed(1);
                      const barWidth = (cnt / maxValCount) * 100;
                      return (
                        <div key={val} className="text-xs space-y-0.5">
                          <div className="flex items-center justify-between text-[#2c2824]">
                            <span className="font-mono truncate max-w-xs">{val || "<empty>"}</span>
                            <span className="text-[#70685c] text-[11px]">
                              {cnt.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#ede5d8] rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#24211e] h-1.5 rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveInspectCol(null)}
                className="rounded-lg bg-[#24211e] px-4 py-2 text-xs font-semibold text-[#f7f4ef] hover:bg-[#3d362e] cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

