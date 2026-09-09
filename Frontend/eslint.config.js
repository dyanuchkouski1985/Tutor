import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import angularPlugin from "@angular-eslint/eslint-plugin";

export default [
  {
    // Настройки для TypeScript файлов
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@angular-eslint": angularPlugin,
    },
    rules: {
      // Здесь можно добавить свои правила
      "@angular-eslint/component-class-suffix": "error",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    // Настройки для HTML шаблонов Angular
    files: ["src/**/*.html"],
    plugins: {
      "@angular-eslint": angularPlugin,
    },
    rules: {
      "@angular-eslint/template/no-any": "error",
    },
  }
];
