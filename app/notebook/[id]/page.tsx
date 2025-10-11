import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Luko - Notebook",
}

export default async function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Redirect to results page by default
  redirect(`/notebook/${id}/results`)
}
