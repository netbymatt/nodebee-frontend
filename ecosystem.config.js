module.exports = {
	apps: [{
		name: 'nodebee-frontend',
		script: 'server/index.js',
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
