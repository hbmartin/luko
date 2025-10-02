"use client"

import { NotebookLayout } from "@/components/notebook/NotebookLayout"
import { mockNotebook } from "@/lib/mock-data"

export default function NotebookPage() {
  return <NotebookLayout notebook={mockNotebook} />
}
