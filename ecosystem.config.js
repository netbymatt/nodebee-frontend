const path = require('node:path');

module.exports = {
	apps: [{
		name: 'nodebee-frontend',
		script: 'server/index.mjs',
		// read variables from .env if it exists, values in env below take precedence
		node_args: `--env-file-if-exists=${path.join(__dirname, '.env')}`,
		watch: ['server', 'html'],
		instances: 2,
		env: {
			NODE_ENV: 'development',
		},
		env_production: {
			NODE_ENV: 'production',
		},
	}],
};
