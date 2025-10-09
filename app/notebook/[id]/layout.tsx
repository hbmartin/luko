"use client"

import { mockNotebook } from "@/lib/mock-data"
import { NotebookProvider } from "@/components/notebook/NotebookProvider"
import { NotebookHeader } from "@/components/notebook/NotebookHeader"

export default function NotebookLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  return (
    <NotebookProvider notebook={mockNotebook}>
      <div className="flex min-h-screen flex-col bg-[var(--color-surface)]">
        <NotebookHeader notebookId={params.id} />
        <div className="flex flex-1">
          <section className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 overflow-auto px-[var(--space-500)] py-[var(--space-500)]">
              {children}
            </main>
          </section>
        </div>
      </div>
    </NotebookProvider>
  )
}