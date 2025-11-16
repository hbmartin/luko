import { Metadata } from "next"
import { cache, type ReactNode } from "react"

import { NotebookHeader } from "@/components/notebook/NotebookHeader"
import { NotebookProvider } from "@/components/notebook/NotebookProvider"
import { mockNotebook } from "@/lib/mock-data"
import { Notebook } from "@/lib/types/notebook"

type NotebookLayoutParameters = {
  params: Promise<{ id: string }>
}

type NotebookLayoutProperties = NotebookLayoutParameters & {
  children: ReactNode
}

const loadNotebook = cache(async (_notebookId: string): Promise<Notebook> => {
  // TODO: Load real notebook data once backend is wired up
  return mockNotebook
})

export async function generateMetadata({ params }: NotebookLayoutParameters): Promise<Metadata> {
  const { id } = await params
  const notebook = await loadNotebook(id)

  return {
    title: `Luko - ${notebook.name}`,
    description: notebook.description,
  }
}

export default async function NotebookLayout({ children, params }: NotebookLayoutProperties) {
  const { id } = await params
  const notebook = await loadNotebook(id)

  return (
    <NotebookProvider notebook={notebook}>
      <NotebookHeader notebookId={id} />
      <main className="absolute top-32 right-0 bottom-0 left-0 mx-auto flex flex-col px-[var(--space-500)] py-[var(--space-500)]">
        {children}
      </main>
    </NotebookProvider>
  )
}
