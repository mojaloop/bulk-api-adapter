import js from "@eslint/js"
import globals from "globals"

export default [

  // Base JS recommended rules
  js.configs.recommended,

  // Application code
  {
    files: ["**/*.js"],
    ignores: [
      "node_modules/**",
      "coverage/**",
      "dist/**"
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    },
    rules: {
      // Common good defaults
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-undef": "error",
      "no-var": "error",
      "prefer-const": "warn"
    }
  },

  // Jest test files
  {
    files: ["**/*.test.js", "**/test/**/*.js"],
    plugins: {
      // jest: jestPlugin
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      // ...jestPlugin.configs.recommended.rules
    }
  }
]