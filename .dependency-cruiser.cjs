/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-camelcase-run-simulation-import",
      severity: "error",
      comment: "Use the kebab-case simulation module: @/lib/simulation/run-simulation.",
      from: {
        path: "^(app|components|lib)/",
      },
      to: {
        path: "(^|/)lib/simulation/runSimulation(\\.ts)?$",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules|\\.next|coverage|dist|build|drizzle",
    },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    tsConfig: {
      fileName: "tsconfig.json",
    },
    tsPreCompilationDeps: true,
  },
}
