import { trace } from "@opentelemetry/api"
import { after, NextResponse } from "next/server"
import { z } from "zod"

import { runSimulation } from "@/lib/simulation/runSimulation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NotebookSchema } from "@/lib/types/notebook"

export const runtime = "nodejs"

const simulationRequestSchema = z.object({
  notebook: NotebookSchema,
  iterations: z.number().int().min(1).max(250_000).optional(),
})

type SimulationRouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: SimulationRouteContext) {
  const { id: notebookId } = await params
  const supabase = await createServerSupabaseClient()
  const userPromise = supabase.auth.getUser()
  const bodyPromise = request
    .json()
    .then((body: unknown) => ({ body, ok: true as const }))
    .catch(() => ({ ok: false as const }))

  const [userResult, bodyResult] = await Promise.all([userPromise, bodyPromise])
  const {
    data: { user },
  } = userResult

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  if (!bodyResult.ok) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsedBody = simulationRequestSchema.safeParse(bodyResult.body)
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid simulation payload" }, { status: 400 })
  }

  const { notebook, iterations } = parsedBody.data
  if (notebook.id !== notebookId) {
    return NextResponse.json({ error: "Notebook route does not match payload" }, { status: 400 })
  }

  try {
    const start = Date.now()
    const result = await runSimulation(notebook, iterations)
    const calculationTimeMs = Date.now() - start

    after(() => {
      const span = trace.getTracer("next-enterprise").startSpan("simulation.completed")
      span.setAttribute("simulation.calculation_time_ms", calculationTimeMs)
      span.setAttribute("simulation.iterations", result.metadata.iterations)
      span.setAttribute("notebook.id", notebook.id)
      span.end()
    })

    return NextResponse.json({
      ...result,
      metadata: {
        ...result.metadata,
        calculationTimeMs,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation failed"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
