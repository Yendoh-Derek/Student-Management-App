import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.ts"],
  languageOptions: {
    parserOptions: {
      project: "./tsconfig.json"
    }
  },
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
    ]
  }
});
