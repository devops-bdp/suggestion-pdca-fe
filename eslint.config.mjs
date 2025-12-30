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
  ]),
  {
    rules: {
      // Disable no-explicit-any rule
      "@typescript-eslint/no-explicit-any": "off",
      "no-explicit-any": "off",
      // Disable no-unused-vars rule
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      // Also disable base rule
      "@typescript-eslint/no-unused-vars-experimental": "off",
    },
  },
]);

export default eslintConfig;
