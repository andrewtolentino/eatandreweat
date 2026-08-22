import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored: scripts/copy-maplibre-worker.mjs copies these out of
    // node_modules on every build. They are third-party bundles we do not edit,
    // and linting them buried the handful of real findings under a thousand
    // warnings about minified code.
    "public/maplibre/**",
  ]),
]);

export default eslintConfig;
