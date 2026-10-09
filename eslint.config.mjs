import path from 'node:path';

import { includeIgnoreFile } from '@eslint/config-helpers';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import globals from 'globals';

const gitignorePath = path.resolve('.', '.gitignore');

// node rules apply to everything except the browser code in html/
const nodeConfig = defineConfig([
	plugins.node,
	...configs.node.recommended,
]).map((config) => ({
	...config,
	ignores: [...(config.ignores ?? []), 'html/**'],
}));

const rules = {
	'@stylistic/indent': ['error', 'tab', { SwitchCase: 1 }],
	'@stylistic/no-tabs': 'off',
	'@stylistic/max-len': 'off',
	'import-x/extensions': [
		'error',
		'ignorePackages',
		{
			js: 'always',
			mjs: 'always',
			json: 'always',
		},
	],
	'no-console': 'off',
};

// frontend scripts run in the browser with these libraries loaded from cdns
const htmlConfig = {
	files: ['html/**/*.mjs'],
	languageOptions: {
		globals: {
			...globals.browser,
			...globals.jquery,
			luxon: 'readonly',
			Plotly: 'readonly',
		},
	},
};

export default defineConfig([
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	plugins.stylistic,
	plugins.importX,
	...configs.base.recommended,
	...nodeConfig,
	{
		// airbnb sets an older parser ecmaVersion, override it
		languageOptions: { parserOptions: { ecmaVersion: 'latest' } },
		rules,
	},
	htmlConfig,
]);
