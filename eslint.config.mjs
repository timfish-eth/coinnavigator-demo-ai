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
    // Reference / requirements archive extracted for comparison only.
    "coin-navigator-ref/**",
    "coin-navigator.zip",
    // Hardhat build artifacts.
    "cache/**",
    "artifacts/**",
    "typechain/**",
    "typechain-types/**",
  ]),
]);

export default eslintConfig;
