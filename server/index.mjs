// web server for the api and static frontend
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import config from '../utils/loadconfig.mjs';
import db from './sqlconnection.mjs';
import updateVendor from './updatevendor.mjs';
import dataRouter from './data.mjs';
import systemRouter from './system.mjs';

// update vendor scripts
if (process.env.NODE_ENV !== 'production') {
	await updateVendor();
}

// start a web server
const app = express();
const { port, trustProxy } = config.server;

// trust X-Forwarded-* headers from the reverse proxy
app.set('trust proxy', trustProxy);

// security headers, this also removes the X-Powered-By header
// content security policy and HSTS are disabled until they can be configured for this site
app.use(helmet({
	contentSecurityPolicy: false,
	strictTransportSecurity: false,
}));

// compress responses
app.use(compression());

app.use('/data', dataRouter);
app.use('/system', systemRouter);

// long-expiration header
const longExpire = (res) => {
	res.set('Cache-Control', 'public, max-age=2592000'); // 30 days
};

// fallback for static assets
if (process.env.NODE_ENV !== 'production') {
	app.use(express.static('html'));
} else {
	// in production set some headers for caching
	app.use(express.static('html', {	setHeaders: longExpire }));
}

const server = app.listen(port, (err) => {
	// express 5 passes startup errors such as the port being in use to this callback
	if (err) {
		console.error(`NodeBee frontend unable to listen on port ${port}`, err);
		process.exitCode = 1;
		return;
	}
	console.log(`NodeBee frontend listening on port ${port}`);
});

// stop accepting connections, let open requests finish and then close the database pool
const shutdown = (signal) => {
	console.log(`NodeBee frontend received ${signal}, shutting down`);
	server.close(() => db.end());
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
