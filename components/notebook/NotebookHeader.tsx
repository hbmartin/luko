"use client"

import { CircleUserRound, CircleX, Settings, X } from "lucide-react"
import Image from "next/image"
import { Notebook, SimulationResult } from "@/lib/types/notebook"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const numberFormatter = new Intl.NumberFormat("en-US", { notation: "compact" })

interface NotebookHeaderProps {
  notebook: Notebook
  simulationResult: SimulationResult | null
  onRunSimulation: () => void
  isSimulating: boolean
  onToggleTheme: () => void
  onToggleDensity: () => void
  theme: "light" | "dark"
  density: "comfortable" | "compact"
}

export function NotebookHeader({
  notebook,
  simulationResult,
  onRunSimulation,
  isSimulating,
  onToggleTheme,
  onToggleDensity,
  theme,
  density,
}: NotebookHeaderProps) {
  return (
    <header className="from-background border-b border-[var(--color-border-soft)] bg-gradient-to-b to-(--secondary)/[10%]">
      <div className="bg-secondary text-secondary-foreground py-1 text-center text-sm">
        {notebook.name}
        <div className="absolute top-0 right-0 flex items-center gap-2 px-4 py-1">
          <Settings size={18} />
          <CircleUserRound size={18} />
          <CircleX size={18} />
        </div>
      </div>
      <div className="mx-auto flex items-center justify-center gap-6 px-[var(--space-500)] py-2">
        <div className="flex items-center gap-16">
          <div className="text-accent-foreground flex items-center gap-3 text-sm">
            <Image src="/worksheet.png" alt="worksheet" width={64} height={64} />
            <div className="gap-1/2 flex flex-col">
              <p>{notebook.metrics.length} metrics</p>
              <p>{notebook.categories.length} categories</p>
              <p>{dateFormatter.format(new Date(notebook.updatedAt))}</p>
            </div>
          </div>
          <div className="text-accent-foreground flex items-center gap-3 text-sm">
            <Image src="/results.png" alt="results" width={64} height={64} />
            <div className="gap-1/2 flex flex-col">
              <p>
                {notebook.dirtyMetrics.length} change
                {notebook.dirtyMetrics.length !== 1 ? "s" : ""}
              </p>
              <p>{numberFormatter.format(simulationResult?.metadata.iterations ?? 0)} iterations</p>
              <p>
                {simulationResult ? dateFormatter.format(new Date(simulationResult.metadata.timestamp)) : "Not yet run"}
              </p>
            </div>
          </div>
          <div className="text-accent-foreground flex items-center gap-3 text-sm">
            <Image src="/export.png" alt="download" width={64} height={64} />
            <div className="gap-1/2 flex flex-col">
              <p>2 teams sharing</p>
              <p>10 recent changes</p>
              <p>7 past exports</p>
            </div>
          </div>
        </div>
        {/* 
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-[var(--space-200)]">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={onToggleTheme}
              className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition"
            >
              <span
                className={`inline-flex size-5 items-center justify-center rounded-full ${
                  theme === "dark" ? "bg-blue-500 text-white" : "bg-white text-blue-600"
                }`}
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </span>
              {theme === "dark" ? "Dark" : "Light"}
            </button>
            <div className="h-6 w-px bg-[var(--color-border-soft)]" />
            <button
              type="button"
              aria-label="Toggle density"
              onClick={onToggleDensity}
              className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition"
            >
              <span
                className={`inline-flex size-5 items-center justify-center rounded-full ${
                  density === "compact" ? "bg-blue-500 text-white" : "bg-white text-blue-600"
                }`}
              >
                {density === "compact" ? "≡" : "☰"}
              </span>
              {density === "compact" ? "Compact" : "Comfort"}
            </button>
          </div>

          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className={`
              flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors
              ${isSimulating ? "cursor-not-allowed opacity-75" : "hover:bg-blue-700"}
            `}
          >
            {isSimulating ? (
              <>
                <svg
                  className="size-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Running…
              </>
            ) : (
              <>
                <span>Run Simulation</span>
              </>
            )}
          </button>
        </div> */}
      </div>
    </header>
  )
}
