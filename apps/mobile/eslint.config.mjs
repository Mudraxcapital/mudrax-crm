import expoConfig from "eslint-config-expo/flat.js";
import prettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...expoConfig,
  prettier,
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "android/**", "ios/**"],
  },
];
