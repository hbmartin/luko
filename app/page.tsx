import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Value Impact Calculator - ROI Analysis Tool",
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Value Impact Calculator</h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-12">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              ROI Analysis Made Simple
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Build credible business cases with Monte Carlo simulation. Model uncertainty,
              visualize outcomes, and share interactive scenarios with stakeholders.
            </p>
          </div>

          {/* Quick Start Card */}
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  AI ROI Analysis - DevOps Automation
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Monte Carlo NPV analysis for AI implementation
                </p>
              </div>
              <Link
                href="/notebook/1"
                className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                Open Notebook
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Categories</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">6</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Metrics</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">18</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Status</div>
                <div className="mt-1 text-sm font-medium text-gray-900">Ready to run</div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-blue-100">
                <svg
                  className="size-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-gray-900">Monte Carlo Simulation</h4>
              <p className="text-sm text-gray-600">
                100,000 iterations with Beta PERT distributions to model uncertainty and risk
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="size-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-gray-900">Rich Visualizations</h4>
              <p className="text-sm text-gray-600">
                NPV curves, waterfall charts, tornado diagrams, and payback analysis
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-purple-100">
                <svg
                  className="size-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-gray-900">Interactive Editing</h4>
              <p className="text-sm text-gray-600">
                Inline editing with real-time dirty state tracking and change management
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-500">
          Value Impact Calculator - Built with Next.js 15 & React Data Grid
        </div>
      </footer>
    </div>
  )
}
