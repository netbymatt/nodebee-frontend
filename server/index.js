// get configuration
const express = require('express');
const config = require('../utils/loadconfig');
const updateVendor = require('./updatevendor');

// update vendor scripts
if (process.env.NODE_ENV !== 'production') {
	updateVendor();
}

// start a web server

const app = express();
const { port } = config.server;

app.use('/data', require('./data'));
app.use('/system', require('./system'));

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

app.listen(port, () => {
	console.log(`NodeBee frontend listening on port ${port}`);
});
