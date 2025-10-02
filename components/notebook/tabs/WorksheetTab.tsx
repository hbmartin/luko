"use client"

import { useState, useCallback } from "react"
import { Notebook } from "@/lib/types/notebook"
import { DataGridComponent } from "../DataGridComponent"
import { SimulationSummaryPanel } from "../SimulationSummaryPanel"

interface WorksheetTabProps {
  notebook: Notebook
  onNotebookChange: (notebook: Notebook) => void
}

export function WorksheetTab({ notebook, onNotebookChange }: WorksheetTabProps) {
  const handleMetricChange = useCallback(
    (metricId: string, field: string, value: number) => {
      const updatedMetrics = notebook.metrics.map((metric) => {
        if (metric.id === metricId) {
          if (field === "value") {
            return { ...metric, value }
          } else if (metric.distribution) {
            return {
              ...metric,
              distribution: {
                ...metric.distribution,
                [field]: value,
              },
            }
          }
        }
        return metric
      })

      const dirtyMetrics = notebook.dirtyMetrics.includes(metricId)
        ? notebook.dirtyMetrics
        : [...notebook.dirtyMetrics, metricId]

      onNotebookChange({
        ...notebook,
        metrics: updatedMetrics,
        isDirty: true,
        dirtyMetrics,
        updatedAt: new Date().toISOString(),
      })
    },
    [notebook, onNotebookChange],
  )

  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      const updatedCategories = notebook.categories.map((cat) =>
        cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat,
      )

      onNotebookChange({
        ...notebook,
        categories: updatedCategories,
      })
    },
    [notebook, onNotebookChange],
  )

  return (
    <div className="mx-auto flex h-full max-w-[1600px] gap-6 p-6">
      {/* Main Grid Area */}
      <div className="flex-1">
        <DataGridComponent
          notebook={notebook}
          onMetricChange={handleMetricChange}
          onCategoryToggle={handleCategoryToggle}
        />
      </div>

      {/* Right Sidebar - Summary Panel */}
      <div className="w-80 shrink-0">
        <SimulationSummaryPanel notebook={notebook} />
      </div>
    </div>
  )
}
