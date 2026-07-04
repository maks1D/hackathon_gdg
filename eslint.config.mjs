import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import angularEslint from '@angular-eslint/eslint-plugin';
import angularTemplateEslint from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import nxEslintPlugin from '@nx/eslint-plugin';

export default [
  // ─── TypeScript files ─────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@angular-eslint': angularEslint,
      '@nx': nxEslintPlugin,
    },
    rules: {
      // TypeScript best practices
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'warn',

      // Angular specific
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/use-lifecycle-interface': 'error',

      // Nx Module Boundaries
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:lib'] },
            { sourceTag: 'type:lib', onlyDependOnLibsWithTags: ['type:lib'] },
            { sourceTag: 'scope:client', onlyDependOnLibsWithTags: ['scope:client', 'scope:shared'] },
            { sourceTag: 'scope:api', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] }
          ],
        }
      ],
    },
  },

  // ─── Angular HTML templates — A11Y enforcement ────────────────────
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplateEslint,
    },
    rules: {
      // === WCAG 2.1 / 2.2 Accessibility Rules ===
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/elements-content': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/table-scope': 'error',
      '@angular-eslint/template/valid-aria': 'error',
      '@angular-eslint/template/no-autofocus': 'warn',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/mouse-events-have-key-events': 'error',
      '@angular-eslint/template/no-distracting-elements': 'error',

      // Template best practices
      '@angular-eslint/template/no-negated-async': 'warn',
      '@angular-eslint/template/use-track-by-function': 'warn',
    },
  },

  // ─── Ignored paths ────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/',
      'dist/',
      'tmp/',
      '.nx/',
      'coverage/',
      'prisma/migrations/',
    ],
  },
];
