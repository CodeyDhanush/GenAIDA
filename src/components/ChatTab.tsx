import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, DatasetProfile } from "../types";
import { executeQueryPlan } from "../utils/queryEngine";
import { PlotlyChart } from "./PlotlyChart";
import {
  Send,
  Sparkles,
  Terminal,
  ArrowRight,
  Trash2,
  Download,
  Bot,
  User,
  Table as TableIcon,
} from "lucide-react";

interface ChatTabProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
  datasetName: string;
  initialQuery?: string;
  chatHistory: ChatMessage[];
  onUpdateHistory: (history: ChatMessage[]) => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  data,
  profile,
  datasetName,
  initialQuery,
  chatHistory,
  onUpdateHistory,
}) => {
  const [inputQuery, setInputQuery] = useState(initialQuery || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isProcessing]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim() !== "") {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || isProcessing) return;

    setInputQuery("");
    setIsProcessing(true);

    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `asst_${Date.now()}`;

    // Add user message
    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      {
        id: userMsgId,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        query: text,
        nlExplanation: text,
      },
    ];
    onUpdateHistory(updatedHistory);

    try {
      // 1. Safe in-memory calculation
      const plan = executeQueryPlan(data, profile, text);

      // 2. Call Gemini for grounded natural language synthesis & followups
      let explanation = "";
      let followups: string[] = [];

      try {
        const resp = await fetch("/api/gemini/query-explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userQuery: text,
            calculatedResult: plan.calcResult,
            schema: profile.columnProfiles,
          }),
        });

        if (resp.ok) {
          const rawText = await resp.text();
          if (rawText && rawText.trim().length > 0) {
            try {
              const resultJson = JSON.parse(rawText);
              explanation = resultJson.explanation || "";
              followups = resultJson.followups || [];
            } catch {
              // fallback
            }
          }
        }
      } catch (apiErr) {
        console.warn("API explanation fallback to local format:", apiErr);
      }

      if (!explanation) {
        explanation = `Analysis calculation completed for "${text}". Results computed from ${data.length.toLocaleString()} rows.`;
      }

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        query: text,
        pandasCode: plan.pandasCode,
        rawResult: plan.calcResult,
        nlExplanation: explanation,
        visualization: plan.visualization,
        followupQuestions: followups,
      };

      onUpdateHistory([...updatedHistory, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: assistantMsgId,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        query: text,
        nlExplanation: `Sorry, an error occurred while processing this query: ${err.message}`,
      };
      onUpdateHistory([...updatedHistory, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPrompts = [
    "Top 10 products by revenue",
    "What is the average sales by region?",
    "Show monthly revenue trends",
    "Are there any anomalies in profit?",
    "Which region has the highest profit?",
    "Give me three important business insights",
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-110px)] sm:h-[calc(100dvh-130px)] min-h-[420px] w-full max-w-5xl mx-auto bg-[#fdfbf7] rounded-xl border border-[#ded5c5] shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-[#ded5c5] bg-[#f7f3eb] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#24211e] flex items-center justify-center text-[#f7f4ef] font-bold text-xs shadow-xs">
            G
          </div>
          <div>
            <h3 className="font-bold text-[#1c1917] text-sm flex items-center gap-2">
              <span>AI Business Analyst</span>
            </h3>
            <p className="text-[11px] text-[#70685c]">
              Direct mathematical computation verified before conversational synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {chatHistory.length > 0 && (
            <button
              onClick={() => onUpdateHistory([])}
              className="flex items-center gap-1 rounded-md border border-[#ded5c5] bg-[#fdfbf7] px-2.5 py-1 text-xs text-[#5c554b] hover:bg-[#ede5d8] hover:text-[#1c1917] transition-colors cursor-pointer shadow-2xs"
            >
              <Trash2 className="h-3 w-3 text-[#8c8275]" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#f5efe4]/40">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ede5d8] text-[#24211e] shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1c1917]">How can I assist with your data today?</h3>
              <p className="text-xs text-[#70685c] max-w-md mt-1">
                Ask about top revenue drivers, category profit margins, seasonal trends, or statistical anomalies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full pt-2">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="rounded-lg border border-[#ded5c5] bg-[#fdfbf7] p-3 text-left text-xs font-medium text-[#2c2824] hover:border-[#24211e] hover:bg-[#ede5d8] hover:text-[#1c1917] transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <span className="truncate pr-2">"{p}"</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#8c8275] group-hover:text-[#1c1917] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "assistant" && (
                <div className="w-6 h-6 rounded bg-[#24211e] shrink-0 text-[#ede5d8] text-[10px] flex items-center justify-center font-bold mt-1 shadow-xs">
                  G
                </div>
              )}

              <div
                className={`text-xs md:text-sm shadow-sm space-y-3 ${
                  msg.sender === "user"
                    ? "bg-[#24211e] text-[#f7f4ef] p-3.5 rounded-2xl rounded-tr-none max-w-[85%]"
                    : "bg-[#fdfbf7] border border-[#ded5c5] p-4 rounded-2xl rounded-tl-none text-[#2c2824] max-w-[85%]"
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between text-[11px] opacity-75">
                  <span className="font-semibold">{msg.sender === "user" ? "You" : "GenAI Analyst"}</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Body Content */}
                <div className="leading-relaxed whitespace-pre-wrap">{msg.nlExplanation}</div>

                {/* Pandas Code Plan Accordion */}
                {msg.pandasCode && (
                  <details className="rounded-lg border border-[#ded5c5] bg-[#efe8dc] p-2.5 text-xs">
                    <summary className="font-semibold text-[#2c2824] cursor-pointer flex items-center gap-1.5 select-none">
                      <Terminal className="h-3.5 w-3.5 text-[#24211e]" />
                      <span>View Pandas Execution Plan</span>
                    </summary>
                    <div className="mt-2 font-mono text-[11px] bg-[#1c1a18] text-[#e8e2d5] p-2.5 rounded-md overflow-x-auto">
                      <code>{msg.pandasCode}</code>
                    </div>
                  </details>
                )}

                {/* Chart Visualization */}
                {msg.visualization && msg.visualization.data && (
                  <div className="rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-3">
                    <div className="text-xs font-semibold text-[#2c2824] mb-2">
                      📊 {msg.visualization.title || "Visualization"}
                    </div>
                    {msg.visualization.type === "bar" && (
                      <PlotlyChart
                        height={260}
                        data={[
                          {
                            type: "bar",
                            x: msg.visualization.data.map((d) => d[msg.visualization!.x!]),
                            y: msg.visualization.data.map((d) => d[msg.visualization!.y!]),
                            marker: { color: "#3d3731" },
                          },
                        ]}
                        layout={{
                          xaxis: { title: msg.visualization.x },
                          yaxis: { title: msg.visualization.y },
                          margin: { l: 45, r: 20, t: 20, b: 40 },
                        }}
                      />
                    )}
                    {msg.visualization.type === "line" && (
                      <PlotlyChart
                        height={260}
                        data={[
                          {
                            type: "scatter",
                            mode: "lines+markers",
                            x: msg.visualization.data.map((d) => d[msg.visualization!.x!]),
                            y: msg.visualization.data.map((d) => d[msg.visualization!.y!]),
                            line: { color: "#3d3731", width: 2.5 },
                          },
                        ]}
                        layout={{
                          xaxis: { title: msg.visualization.x },
                          yaxis: { title: msg.visualization.y },
                          margin: { l: 45, r: 20, t: 20, b: 40 },
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Follow-up question suggestion chips */}
                {msg.followupQuestions && msg.followupQuestions.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#ded5c5]">
                    <div className="text-[11px] font-semibold text-[#70685c]">Suggested Follow-ups:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.followupQuestions.map((fq, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(fq)}
                          className="rounded-full border border-[#ded5c5] bg-[#fdfbf7] px-2.5 py-1 text-[11px] font-medium text-[#5c554b] hover:text-[#1c1917] hover:border-[#24211e] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>{fq}</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === "user" && (
                <div className="w-6 h-6 rounded bg-[#ded5c5] shrink-0 text-[#24211e] text-[10px] flex items-center justify-center font-bold mt-1 shadow-xs">
                  U
                </div>
              )}
            </div>
          ))
        )}

        {isProcessing && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded bg-[#24211e] shrink-0 text-[#ede5d8] text-[10px] flex items-center justify-center font-bold mt-1 animate-pulse">
              G
            </div>
            <div className="rounded-2xl rounded-tl-none border border-[#ded5c5] bg-[#fdfbf7] p-3.5 shadow-sm text-xs text-[#5c554b] flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#24211e] border-t-transparent" />
              <span>Executing Pandas calculation & synthesizing Gemini explanation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-[#ded5c5] bg-[#fdfbf7] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about your data..."
            className="w-full pl-3 pr-12 py-2.5 bg-[#f3ede3] border-none rounded-lg text-xs sm:text-sm text-[#1c1917] placeholder-[#8c8275] focus:ring-2 focus:ring-[#24211e] focus:bg-[#fbf9f5] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#24211e] text-[#f7f4ef] rounded-md flex items-center justify-center hover:bg-[#12100e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {quickPrompts.slice(0, 3).map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-[10px] text-[#70685c] hover:text-[#1c1917] border border-[#ded5c5] rounded-full px-2.5 py-0.5 bg-[#fdfbf7] transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
