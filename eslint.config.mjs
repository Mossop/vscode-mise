import base from "@mossop/config/vscode/eslint";

export default [
  ...base,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: ".",
        project: ["./tsconfig.json"],
      },
    },
  },
];
