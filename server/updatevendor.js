// update vendor-related files in the static area
const fs = require('fs');
const path = require('path');

module.exports = () => {
	fs.copyFileSync(path.join(__dirname, '../node_modules/luxon/build/global/luxon.min.js'), path.join(__dirname, '../html/scripts/vendor/luxon.min.js'));
};
