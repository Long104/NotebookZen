// ────────────────────────────────────────────────────────────────────────────
// Backend ESLint config — Hono + Cloudflare Workers (JavaScript)
// ────────────────────────────────────────────────────────────────────────────

import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

/** Cloudflare Workers–specific globals not in the Service Worker spec */
const workerGlobals = {
  // Runtime bindings
  caches: "readonly",
  // Durable Objects
  DurableObjectNamespace: "readonly",
  DurableObjectState: "readonly",
  D1Database: "readonly",
  D1Result: "readonly",
  R2Bucket: "readonly",
  R2Object: "readonly",
  R2ListObjects: "readonly",
  KVNamespace: "readonly",
  Queue: "readonly",
  QueueMessage: "readonly",
  Fetcher: "readonly",
  AnalyticsEngine: "readonly",
  Hyperdrive: "readonly",
  Ai: "readonly",
  VectorizeIndex: "readonly",
  // Scheduled events
  ScheduledEvent: "readonly",
  ScheduledController: "readonly",
  // Execution context
  ExecutionContext: "readonly",
  // Hono's c.env etc.
  process: "readonly",
};

const backendConfig = [
  // Base: ESLint recommended rules
  js.configs.recommended,

  // Prettier compatibility — turns off style rules Prettier handles
  prettierConfig,

  // Backend-specific overrides
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.serviceworker,
        ...workerGlobals,
      },
    },
    rules: {
      // Allow console — Workers use console.log for observability
      "no-console": "off",

      // Allow empty catch blocks (common in Workers error-swallow patterns)
      "no-empty": ["warn", { allowEmptyCatch: true }],

      // Warn on unused vars (except ones prefixed with _)
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      // Prefer const over let when variable is never reassigned
      "prefer-const": "warn",

      // Require === and !== (except when comparing against null)
      eqeqeq: ["warn", "smart"],
    },
  },

  // Ignore patterns
  {
    ignores: ["node_modules/", ".wrangler/", "bun.lock"],
  },
];

export default backendConfig;
