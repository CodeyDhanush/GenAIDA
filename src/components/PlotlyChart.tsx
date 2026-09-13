import React, { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";

interface PlotlyChartProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
  height?: number;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout = {},
  config = {},
  className = "w-full",
  height = 360,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const defaultLayout: Partial<Plotly.Layout> = {
        autosize: true,
        height,
        margin: { l: 45, r: 25, t: 40, b: 40 },
        font: { family: "Inter, -apple-system, sans-serif", size: 12, color: "#2c2824" },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        hoverlabel: { bgcolor: "#fdfbf7", font: { color: "#1c1917" }, bordercolor: "#ded5c5" },
        ...layout,
      };

      const defaultConfig: Partial<Plotly.Config> = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["lasso2d", "select2d"],
        ...config,
      };

      Plotly.react(containerRef.current, data || [], defaultLayout, defaultConfig);
      setRenderError(null);

      const handleResize = () => {
        if (containerRef.current) {
          try {
            Plotly.Plots.resize(containerRef.current);
          } catch (e) {
            // ignore resize issues
          }
        }
      };

      window.addEventListener("resize", handleResize);

      let observer: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        observer = new ResizeObserver(() => {
          handleResize();
        });
        observer.observe(containerRef.current);
      }

      return () => {
        window.removeEventListener("resize", handleResize);
        if (observer) {
          observer.disconnect();
        }
      };
    } catch (err: any) {
      console.error("Plotly chart rendering error:", err);
      setRenderError(err?.message || "Failed to render chart");
    }
  }, [data, layout, config, height]);

  if (renderError) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border border-[#ded5c5] bg-[#f7f3eb] p-4 text-xs text-[#70685c]"
      >
        <span>Chart visual currently preparing ({renderError})</span>
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={{ minHeight: height }} />;
};
