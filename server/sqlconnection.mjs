import mysql from 'mysql2/promise';
import config from '../utils/loadconfig.mjs';

const db = mysql.createPool({
	host: config.db.host,
	user: config.db.username,
	password: config.db.password,
	database: config.db.name,
	waitForConnections: true,
	connectionLimit: 5,
	queueLimit: 0,
	timezone: '+00:00',
});

export default db;
