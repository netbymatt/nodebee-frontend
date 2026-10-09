// this file is intended to be fallback default values for configuration
// edit your configuration in config.js

module.exports = {
	db: {
		username: process.env.NODEBEE_DB_USERNAME,
		password: process.env.NODEBEE_DB_PASSWORD,
		host: process.env.NODEBEE_DB_HOST ?? 'localhost',
		name: process.env.NODEBEE_DB_NAME ?? 'nodebee',
		connections: Number(process.env.NODEBEE_DB_CONNECTIONS ?? 5),
	},
	server: {
		port: Number(process.env.NODEBEE_SERVER_PORT ?? 8080),
		// reverse proxies to trust for X-Forwarded-* headers, see express's 'trust proxy' setting
		// 'loopback' trusts a proxy running on the same machine
		trustProxy: process.env.NODEBEE_TRUST_PROXY ?? 'loopback',
	},
};
