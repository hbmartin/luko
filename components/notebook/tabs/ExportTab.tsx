"use client"

import { useMemo, useState } from "react"

const complexityOptions = [
  { value: "1", label: "Level 1: Executive Summary", sections: ["Cover Page", "Executive Summary", "Key Metrics"] },
  {
    value: "2",
    label: "Level 2: Management Brief",
    sections: ["Cover Page", "Executive Summary", "NPV Analysis", "Key Assumptions", "Sensitivity Analysis"],
  },
  {
    value: "3",
    label: "Level 3: Detailed Analysis",
    sections: [
      "Cover Page",
      "Executive Summary",
      "NPV Analysis",
      "Scenario Comparison",
      "Category Waterfall",
      "Methodology",
    ],
  },
  {
    value: "4",
    label: "Level 4: Complete Financial Model",
    sections: [
      "Cover Page",
      "Executive Summary",
      "NPV Analysis",
      "Scenario Comparison",
      "Category Waterfall",
      "Methodology",
      "Full Assumption Tables",
      "Raw Monte Carlo Samples",
    ],
  },
]

const formatLabels: Record<string, string> = {
  pptx: "PowerPoint (.pptx)",
  pdf: "PDF Document",
  html: "Web Page (HTML)",
}

export function ExportTab() {
  const [complexity, setComplexity] = useState("2")
  const [format, setFormat] = useState<"pptx" | "pdf" | "html">("pdf")
  const [companyName, setCompanyName] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#3b82f6")
  const [options, setOptions] = useState({ methodology: true, citations: true, rawTables: false })
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastExport, setLastExport] = useState<{ timestamp: string; format: string; pages: number } | null>(null)

  const sections = useMemo(() => {
    const selected = complexityOptions.find((option) => option.value === complexity)
    return selected ? selected.sections : []
  }, [complexity])

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setLastExport({
        timestamp: new Date().toISOString(),
        format,
        pages: sections.length + (options.rawTables ? 2 : 0) + (options.methodology ? 1 : 0),
      })
      setIsGenerating(false)
    }, 900)
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-6">
      <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold text-[var(--color-text-primary)]">Export Settings</h2>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                Complexity Level
              </label>
              <select
                value={complexity}
                onChange={(event) => {
                  setComplexity(event.target.value)
                }}
                className="w-full rounded-md border border-[var(--color-border-soft)] bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {complexityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Controls the depth of detail included in the export.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">Format</label>
              <div className="space-y-2">
                {Object.entries(formatLabels).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <input
                      type="radio"
                      name="export-format"
                      value={value}
                      checked={format === value}
                      onChange={(event) => {
                        setFormat(event.target.value as typeof format)
                      }}
                      className="size-4 text-blue-600 focus:ring-blue-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">White-Labeling</label>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(event) => {
                      setCompanyName(event.target.value)
                    }}
                    placeholder="Prospect Inc."
                    className="w-full rounded-md border border-[var(--color-border-soft)] px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(event) => {
                        setPrimaryColor(event.target.value)
                      }}
                      className="size-10 rounded border border-[var(--color-border-soft)]"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(event) => {
                        setPrimaryColor(event.target.value)
                      }}
                      className="flex-1 rounded-md border border-[var(--color-border-soft)] px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                Additional Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                  <input
                    type="checkbox"
                    checked={options.methodology}
                    onChange={(event) => {
                      setOptions((previous) => ({ ...previous, methodology: event.target.checked }))
                    }}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  Include methodology section
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                  <input
                    type="checkbox"
                    checked={options.citations}
                    onChange={(event) => {
                      setOptions((previous) => ({ ...previous, citations: event.target.checked }))
                    }}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  Include assumption citations
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                  <input
                    type="checkbox"
                    checked={options.rawTables}
                    onChange={(event) => {
                      setOptions((previous) => ({ ...previous, rawTables: event.target.checked }))
                    }}
                    className="size-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  Include raw data tables
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white transition ${
                  isGenerating ? "bg-primary cursor-wait" : "bg-primary hover:bg-primary/80"
                }`}
              >
                {isGenerating ? "Generating…" : "Generate Export"}
              </button>
              <button className="rounded-md border border-[var(--color-border-soft)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]">
                Preview Settings
              </button>
            </div>

            {lastExport && (
              <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/60 p-4 text-xs text-[var(--color-text-muted)]">
                <div className="font-semibold text-[var(--color-text-primary)]">Last export</div>
                <p className="mt-1">
                  {new Date(lastExport.timestamp).toLocaleString()} • {formatLabels[lastExport.format]} • ~
                  {lastExport.pages} pages
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border-2 border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Export Preview</h3>
              <span className="rounded bg-[var(--color-surface-elevated)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
                {complexityOptions.find((option) => option.value === complexity)?.label}
              </span>
            </div>

            <div className="space-y-3">
              {sections.map((title, index) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] bg-white p-3"
                >
                  <div
                    className="flex size-12 items-center justify-center rounded"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{title}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Section {index + 1}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-xs text-blue-700">
              <p className="font-medium">Export includes:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>{formatLabels[format]}</li>
                <li>Branded for {companyName || "your prospect"}</li>
                <li>Sections: {sections.length}</li>
                {options.rawTables && <li>Raw assumption data tables</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/60 p-4 text-xs text-[var(--color-text-muted)]">
          All exports append the footer “Powered by Value Impact Calculator”.
        </div>
      </div>
    </div>
  )
}
