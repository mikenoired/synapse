import antfu from "@antfu/eslint-config";

export default antfu({
  typescript: true,
  react: true,
  ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"],
  rules: {
    "no-console": "warn",
    "unused-imports/no-unused-imports": "error",
  },
});
