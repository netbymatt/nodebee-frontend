module.exports = {
	env: {
		commonjs: true,
		es6: true,
		node: true,
		jquery: true,
		browser: true,
	},
	extends: 'airbnb-base',
	globals: {
		Atomics: 'readonly',
		SharedArrayBuffer: 'readonly',
	},
	parserOptions: {
		ecmaVersion: 2021,
	},
	rules: {
		'import/no-relative-packages': 0,
		'import/no-import-module-exports': 0,
		indent: [
			'error',
			'tab',
		],
		'no-tabs': 0,
		'no-use-before-define': [
			'error',
			{
				variables: false,
			},
		],
		'no-console': 0,
		'max-len': 0,
	},
	ignorePatterns: [
		'*.min.js',
	],
};
