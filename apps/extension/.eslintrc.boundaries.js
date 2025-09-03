/**
 * ESLint configuration for enforcing module boundaries
 *
 * This configuration enforces the architectural boundaries defined in
 * lib/architecture/module-boundaries.ts
 */

module.exports = {
  rules: {
    // Enforce import boundaries between modules
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          // UI Layer restrictions
          {
            group: ["**/lib/openai-provider", "!**/lib/openai-provider-lazy"],
            message:
              "UI layer should only import lazy-loaded provider wrapper, not the direct provider",
          },
          {
            group: ["**/content/extraction-pipeline", "**/content/extractor"],
            message:
              "UI layer should not directly import extraction implementation, use interfaces",
          },

          // Provider Layer restrictions
          {
            group: ["**/sidepanel/**", "**/content/**", "**/lib/extraction/**"],
            message:
              "Provider layer should not import from UI or extraction layers",
          },

          // Extraction Layer restrictions
          {
            group: ["**/lib/providers/**", "**/lib/openai*", "**/sidepanel/**"],
            message: "Extraction layer should not import from providers or UI",
          },

          // Storage Layer restrictions
          {
            group: [
              "**/sidepanel/**",
              "**/content/**",
              "**/lib/providers/**",
              "**/lib/extraction/**",
            ],
            message: "Storage layer should be independent of other layers",
          },
        ],

        paths: [
          // Specific path restrictions
          {
            name: "openai",
            message:
              "Import from lib/openai-provider or lib/openai-provider-lazy instead of directly importing OpenAI SDK",
          },
        ],
      },
    ],

    // Prefer interfaces over concrete implementations
    "@typescript-eslint/no-restricted-imports": [
      "warn",
      {
        patterns: [
          {
            group: ["**/lib/extraction/*", "!**/lib/extraction/interfaces"],
            message:
              "Prefer importing from interfaces rather than concrete implementations",
          },
          {
            group: ["**/lib/providers/*", "!**/lib/providers/interfaces"],
            message:
              "Prefer importing from interfaces rather than concrete implementations",
          },
        ],
      },
    ],

    // Enforce consistent module exports
    "import/no-default-export": [
      "error",
      {
        // Allow default exports only for React components
        exceptions: ["*.tsx"],
      },
    ],

    // Ensure all exports are explicit
    "import/prefer-default-export": "off",

    // Prevent circular dependencies
    "import/no-cycle": [
      "error",
      {
        maxDepth: 3,
        ignoreExternal: true,
      },
    ],

    // Group imports by module layer
    "import/order": [
      "error",
      {
        groups: [
          "builtin", // Node.js built-in modules
          "external", // External packages
          "internal", // Internal modules
          "parent", // Parent directory imports
          "sibling", // Sibling imports
          "index", // Index file imports
          "type", // Type imports
        ],
        pathGroups: [
          // UI Layer
          {
            pattern: "**/sidepanel/**",
            group: "internal",
            position: "after",
          },
          // Provider Layer
          {
            pattern: "**/lib/providers/**",
            group: "internal",
            position: "after",
          },
          {
            pattern: "**/lib/openai*",
            group: "internal",
            position: "after",
          },
          // Extraction Layer
          {
            pattern: "**/lib/extraction/**",
            group: "internal",
            position: "after",
          },
          {
            pattern: "**/content/**",
            group: "internal",
            position: "after",
          },
          // Storage Layer
          {
            pattern: "**/lib/document-repository",
            group: "internal",
            position: "after",
          },
          {
            pattern: "**/lib/settings-service",
            group: "internal",
            position: "after",
          },
          // Communication Layer
          {
            pattern: "**/background/**",
            group: "internal",
            position: "after",
          },
        ],
        pathGroupsExcludedImportTypes: ["type"],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
  },

  overrides: [
    // Relaxed rules for test files
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
      rules: {
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": "off",
      },
    },

    // Specific rules for each layer
    {
      files: ["sidepanel/**/*.ts", "sidepanel/**/*.tsx"],
      rules: {
        // Additional UI-specific rules
      },
    },
    {
      files: ["lib/providers/**/*.ts", "lib/openai*.ts"],
      rules: {
        // Additional provider-specific rules
      },
    },
    {
      files: ["content/**/*.ts", "lib/extraction/**/*.ts"],
      rules: {
        // Additional extraction-specific rules
      },
    },
  ],
};
