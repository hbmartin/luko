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
      <main className="">{children}</main>
    </NotebookProvider>
  )
}
