// this file is intended to be fallback default values for configuration
// edit your configuration in config.js

module.exports = {
	db: {
		username: process.env.NODEBEE_DB_USERNAME,
		password: process.env.NODEBEE_DB_PASSWORD,
		host: process.env.NODEBEE_DB_HOST ?? 'localhost',
		name: process.env.NODEBEE_DB_NAME ?? 'nodebee',
		connections: 1,
	},
	server: {
		port: process.env.NODEBEE_SERVER_PORT ?? 8080,
	},
};
