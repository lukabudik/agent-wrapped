// Flat config, as ESM. The .mjs extension is what lets this be ESM while the
// root package.json stays CommonJS-by-default for the workspace tooling.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.d.ts",
      "apps/web/**/generated/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      // The scanner narrows unknown by hand everywhere; `any` is the thing we
      // are actually trying to keep out.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": "off",
    },
  },

  // Next.js rules apply only to the web app.
  {
    files: ["apps/web/**/*.{ts,tsx,js,jsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // App Router only -- the rule looks for a pages/ directory and warns on
      // every run when it does not find one.
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // Config files at the repo root run in Node/CommonJS.
  {
    files: ["*.js", "*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly", __dirname: "readonly" },
    },
  },
);
