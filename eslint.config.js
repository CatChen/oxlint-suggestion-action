import path from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import graphqlPlugin from '@graphql-eslint/eslint-plugin';
import ts from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default ts.config(
  ...compat.config({
    env: {
      browser: true,
      es2022: true,
      node: true,
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: './tsconfig.json',
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    root: true,
    rules: {},
    ignorePatterns: [
      'node_modules/**/*',
      'dist/**/*',
      'bundle/**/*',
      'eslint.config.js',
      'codegen.ts',
      'schema.graphql',
      'src/__graphql__/**',
    ],
    overrides: [
      {
        files: ['*.ts'],
      },
    ],
  }),
  // TypeScript rules and GraphQL processor in the same block so TS lint still runs on
  // the original source (processor returns [virtual .graphql blocks, original code]).
  ...ts.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts'],
    processor: graphqlPlugin.processor,
  })),
  // Lint GraphQL operations (including those extracted from .ts) against the schema.
  // schema.graphql is ignored above so only virtual operation files match here.
  {
    files: ['**/*.graphql'],
    languageOptions: {
      parser: graphqlPlugin.parser,
      parserOptions: {
        graphQLConfig: {
          schema: './schema.graphql',
          documents: ['src/**/*.ts', '!src/__graphql__/**', '!**/*.d.ts'],
        },
      },
    },
    plugins: {
      '@graphql-eslint': graphqlPlugin,
    },
    rules: graphqlPlugin.configs['flat/operations-recommended'].rules,
  },
);
