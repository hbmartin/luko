"use client"

import { use } from "react"
import { NotebookHeader } from "@/components/notebook/NotebookHeader"
import { NotebookProvider } from "@/components/notebook/NotebookProvider"
import { mockNotebook } from "@/lib/mock-data"

export default function NotebookLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const unwrappedParams = use(params)

  return (
    <NotebookProvider notebook={mockNotebook}>
      <NotebookHeader notebookId={unwrappedParams.id} />
      <main className="absolute top-32 right-0 bottom-0 left-0 mx-auto flex flex-col px-[var(--space-500)] py-[var(--space-500)]">
        {children}
      </main>
    </NotebookProvider>
  )
}
