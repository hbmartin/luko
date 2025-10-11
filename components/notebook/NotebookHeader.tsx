"use client"

import { CircleUserRound, CircleX, Moon, Sun } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"
import { useNotebook } from "./NotebookProvider"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const numberFormatter = new Intl.NumberFormat("en-US", { notation: "compact" })

interface NotebookHeaderProps {
  notebookId: string
}

export function NotebookHeader({ notebookId }: NotebookHeaderProps) {
  const pathname = usePathname()
  const { notebook, simulationResult, theme, setTheme } = useNotebook()

  const currentPage = pathname.split("/").pop() || "results"
  return (
    <header className="from-background border-b border-[var(--color-border-soft)] bg-gradient-to-b to-(--secondary)/[10%]">
      <div className="bg-secondary text-secondary-foreground py-1 text-center text-sm">
        {notebook.name}
        <div className="absolute top-0 right-0 flex items-center gap-2 px-4 py-1">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="transition-opacity hover:opacity-80"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <CircleUserRound size={18} />
          <CircleX size={18} />
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
              className={`transition-all ${currentPage !== "worksheet" ? "group-hover:scale-110" : ""}`}
            />
            <div className="gap-1/2 flex flex-col">
              <p>{notebook.metrics.length} metrics</p>
              <p>{notebook.categories.length} categories</p>
              <p>{dateFormatter.format(new Date(notebook.updatedAt))}</p>
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
              className={`transition-all ${currentPage !== "results" && currentPage !== notebookId ? "group-hover:scale-110" : ""}`}
            />
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
              className={`transition-all ${currentPage !== "export" ? "group-hover:scale-110" : ""}`}
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
}
