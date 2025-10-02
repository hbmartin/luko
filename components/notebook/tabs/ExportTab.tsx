"use client"

export function ExportTab() {
  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">Export Settings</h2>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Complexity Level */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Complexity Level
              </label>
              <select className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>Level 1: Executive Summary</option>
                <option selected>Level 2: Management Brief</option>
                <option>Level 3: Detailed Analysis</option>
                <option>Level 4: Complete Financial Model</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Controls the level of detail in your export
              </p>
            </div>

            {/* Format Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Format</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    className="size-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">PowerPoint (.pptx)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    defaultChecked
                    className="size-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">PDF Document</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    className="size-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Web Page (HTML)</span>
                </label>
              </div>
            </div>

            {/* White-Labeling */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">White-Labeling</label>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Company Logo</label>
                  <div className="flex items-center gap-2">
                    <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                      Upload Logo
                    </button>
                    <span className="text-xs text-gray-500">PNG or SVG, max 500KB</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Company Name</label>
                  <input
                    type="text"
                    placeholder="Your Company Name"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      defaultValue="#3b82f6"
                      className="size-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      defaultValue="#3b82f6"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Additional Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="size-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include methodology section</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="size-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include assumption citations</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include raw data tables</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Generate Export
              </button>
              <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Preview
              </button>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Export Preview</h3>
              <span className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">
                Level 2: Management Brief
              </span>
            </div>

            <div className="space-y-3">
              {/* Mock preview pages */}
              {[
                { title: "Cover Page", pages: "1" },
                { title: "Executive Summary", pages: "2" },
                { title: "NPV Analysis", pages: "3" },
                { title: "Key Assumptions", pages: "4" },
                { title: "Sensitivity Analysis", pages: "5" },
              ].map((section, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex size-12 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600">
                    {section.pages}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{section.title}</div>
                    <div className="text-xs text-gray-500">Page {section.pages}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-xs text-blue-700">
              <p className="font-medium">Export includes:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Key results and NPV summary</li>
                <li>Primary visualizations</li>
                <li>Top 5 assumptions listed</li>
                <li>Methodology overview</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
          <p>
            All exports include the footer:{" "}
            <span className="font-medium">&quot;Powered by Value Impact Calculator&quot;</span>
          </p>
        </div>
      </div>
    </div>
  )
}
