const mysql = require('mysql2/promise');
const config = require('../utils/loadconfig').db;

const connection = mysql.createPool({
	host: config.host,
	user: config.username,
	password: config.password,
	database: config.name,
	waitForConnections: true,
	connectionLimit: 5,
	queueLimit: 0,
	timezone: '+00:00',
});

module.exports = connection;
