// https://github.com/francoismassart/eslint-plugin-tailwindcss/pull/381
// import eslintPluginTailwindcss from "eslint-plugin-tailwindcss"
import js from "@eslint/js"
import eslintPluginNext from "@next/eslint-plugin-next"
import codeComplete from "eslint-plugin-code-complete"
import eslintPluginImport from "eslint-plugin-import"
import pluginPromise from "eslint-plugin-promise"
import reactPerfPlugin from "eslint-plugin-react-perf"
import reactRefresh from "eslint-plugin-react-refresh"
import eslintPluginSecurity from "eslint-plugin-security"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import unusedImports from "eslint-plugin-unused-imports"

import typescriptEslint from "typescript-eslint"

import * as fs from "fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const eslintIgnore = [
  ".git/",
  ".next/",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  "*.min.js",
  "*.config.js",
  "*.d.ts",
]

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url))
const tsFiles = ["**/*.{ts,tsx}", "**/*.cts", "**/*.mts"]

function scopeTypeScriptConfigs(configs) {
  return configs.map((singleConfig) => {
    const scopedConfig = {
      ...singleConfig,
      files: singleConfig.files ?? tsFiles,
    }

    if (singleConfig.languageOptions?.parser === typescriptEslint.parser) {
      scopedConfig.languageOptions = {
        ...singleConfig.languageOptions,
        parserOptions: {
          ...(singleConfig.languageOptions.parserOptions ?? {}),
          project: ["./tsconfig.json"],
          tsconfigRootDir,
        },
      }
    }

    return scopedConfig
  })
}

const config = typescriptEslint.config(
  {
    ignores: eslintIgnore,
  },
  //  https://github.com/francoismassart/eslint-plugin-tailwindcss/pull/381
  // ...eslintPluginTailwindcss.configs["flat/recommended"],
  scopeTypeScriptConfigs(typescriptEslint.configs.recommended),
  scopeTypeScriptConfigs(typescriptEslint.configs.recommendedTypeChecked),
  scopeTypeScriptConfigs(typescriptEslint.configs.strictTypeChecked),
  eslintPluginImport.flatConfigs.recommended,
  eslintPluginImport.flatConfigs.typescript,
  reactPerfPlugin.configs.flat.all,
  js.configs.recommended,
  eslintPluginUnicorn.configs.all,
  pluginPromise.configs["flat/recommended"],
  eslintPluginSecurity.configs.recommended,
  reactRefresh.configs.recommended,
  {
    plugins: {
      "@next/next": eslintPluginNext,
      "react-perf": reactPerfPlugin,
      "code-complete": codeComplete,
      "unused-imports": unusedImports,
    },
    rules: {
      ...eslintPluginNext.configs.recommended.rules,
      ...eslintPluginNext.configs["core-web-vitals"].rules,
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": "error",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "unicorn/no-array-callback-reference": "off",
    },
  },
  {
    files: tsFiles,
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
  {
    settings: {
      tailwindcss: {
        callees: ["classnames", "clsx", "ctl", "cn", "cva"],
      },

      "import/resolver": {
        typescript: true,
        node: true,
      },
      next: {
        rootDir: "./",
      },
    },
    rules: {
      "unicorn/no-array-reduce": "off",
      "unicorn/prefer-string-raw": "off",
      "react-refresh/only-export-components": [
        "error",
        { allowExportNames: ["generateMetadata", "generateStaticParams"] },
      ],
      "sort-imports": [
        "error",
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
      "import/order": [
        "warn",
        {
          groups: ["external", "builtin", "internal", "sibling", "parent", "index"],
          pathGroups: [
            ...getDirectoriesToSort().map((singleDir) => ({
              pattern: `${singleDir}/**`,
              group: "internal",
            })),
            {
              pattern: "env",
              group: "internal",
            },
            {
              pattern: "theme",
              group: "internal",
            },
            {
              pattern: "public/**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["internal"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  }
)

function getDirectoriesToSort() {
  const ignoredSortingDirectories = [".git", ".next", ".vscode", "node_modules"]
  return fs
    .readdirSync(process.cwd())
    .filter((file) => fs.statSync(process.cwd() + "/" + file).isDirectory())
    .filter((f) => !ignoredSortingDirectories.includes(f))
}

export default config
