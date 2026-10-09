import mysql from 'mysql2/promise';
import config from '../utils/loadconfig.mjs';

const db = mysql.createPool({
	host: config.db.host,
	user: config.db.username,
	password: config.db.password,
	database: config.db.name,
	waitForConnections: true,
	connectionLimit: config.db.connections,
	queueLimit: 0,
	timezone: '+00:00',
	// return DECIMAL values (such as from ROUND, SUM and AVG) as numbers instead of strings
	decimalNumbers: true,
});

export default db;
