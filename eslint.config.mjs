import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Async data-fetching inside useEffect is intentional throughout this project
      "react-hooks/set-state-in-effect": "off",
      // genlayer-js requires `any` casts for its client config types
      "@typescript-eslint/no-explicit-any": "off",
      // Unused vars are warnings only; keep errors off
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);

export default eslintConfig;
