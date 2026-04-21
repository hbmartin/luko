"use client"

import { CircleUserRound, Moon, Sun } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { memo, useCallback, useMemo } from "react"

import { LogoutButton } from "@/components/auth/LogoutButton"

import { useNotebookActions, useNotebookSelector } from "./NotebookProvider"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const numberFormatter = new Intl.NumberFormat("en-US", { notation: "compact" })

interface NotebookHeaderProperties {
  notebookId: string
}

export const NotebookHeader = memo(function NotebookHeader({ notebookId }: NotebookHeaderProperties) {
  const pathname = usePathname()
  const notebookName = useNotebookSelector((state) => state.notebook.name)
  const metricCount = useNotebookSelector((state) => state.notebook.metrics.length)
  const categoryCount = useNotebookSelector((state) => state.notebook.categories.length)
  const updatedAt = useNotebookSelector((state) => state.notebook.updatedAt)
  const dirtyMetricCount = useNotebookSelector((state) => state.notebook.dirtyMetrics.length)
  const simulationIterations = useNotebookSelector((state) => state.simulationResult?.metadata.iterations ?? 0)
  const simulationTimestamp = useNotebookSelector((state) => state.simulationResult?.metadata.timestamp ?? null)
  const theme = useNotebookSelector((state) => state.theme)
  const { setTheme } = useNotebookActions()

  const currentPage = useMemo(() => pathname.split("/").pop() || "results", [pathname])
  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light")
  }, [setTheme, theme])

  return (
    <header className="from-background absolute top-0 right-0 left-0 border-b border-[var(--color-border-soft)] bg-gradient-to-b to-(--secondary)/[10%]">
      <div className="bg-secondary text-secondary-foreground py-1 text-center text-sm">
        {notebookName}
        <div className="absolute top-0 right-0 flex items-center gap-2 px-4 py-1">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="rounded-md transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:outline-none"
          >
            {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <CircleUserRound size={18} aria-hidden="true" />
          <LogoutButton variant="icon" />
        </div>
      </div>
      <div className="mx-auto flex items-center justify-center gap-6 px-[var(--space-500)] py-2">
        <div className="flex items-center gap-16">
          <Link
            href={`/notebook/${notebookId}/worksheet`}
            className={`group text-accent-foreground flex items-center gap-3 pb-2 text-sm transition-opacity hover:opacity-100 ${
              currentPage === "worksheet" ? "border-primary border-b-2" : "opacity-80"
            }`}
          >
            <Image
              src="/worksheet.png"
              alt="worksheet"
              width={64}
              height={64}
              className={`transition-transform ${currentPage === "worksheet" ? "" : "group-hover:scale-110"}`}
            />
            <div className="gap-1/2 flex flex-col">
              <p>{metricCount} metrics</p>
              <p>{categoryCount} categories</p>
              <p>{dateFormatter.format(new Date(updatedAt))}</p>
            </div>
          </Link>
          <Link
            href={`/notebook/${notebookId}/results`}
            className={`group text-accent-foreground flex items-center gap-3 pb-2 text-sm transition-opacity hover:opacity-100 ${
              currentPage === "results" || currentPage === notebookId ? "border-primary border-b-2" : "opacity-80"
            }`}
          >
            <Image
              src="/results.png"
              alt="results"
              width={64}
              height={64}
              className={`transition-transform ${currentPage !== "results" && currentPage !== notebookId ? "group-hover:scale-110" : ""}`}
            />
            <div className="gap-1/2 flex flex-col">
              <p>
                {dirtyMetricCount} change
                {dirtyMetricCount === 1 ? "" : "s"}
              </p>
              <p>{numberFormatter.format(simulationIterations)} iterations</p>
              <p>{simulationTimestamp ? dateFormatter.format(new Date(simulationTimestamp)) : "Not yet run"}</p>
            </div>
          </Link>
          <Link
            href={`/notebook/${notebookId}/export`}
            className={`group text-accent-foreground flex items-center gap-3 pb-2 text-sm transition-opacity hover:opacity-100 ${
              currentPage === "export" ? "border-primary border-b-2" : "opacity-80"
            }`}
          >
            <Image
              src="/export.png"
              alt="download"
              width={64}
              height={64}
              className={`transition-transform ${currentPage === "export" ? "" : "group-hover:scale-110"}`}
            />
            <div className="gap-1/2 flex flex-col">
              <p>2 teams sharing</p>
              <p>10 recent changes</p>
              <p>7 past exports</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
})
