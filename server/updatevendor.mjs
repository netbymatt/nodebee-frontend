// update vendor-related files in the static area
import fs from 'node:fs/promises';

const updateVendor = () => fs.copyFile(new URL('../node_modules/luxon/build/global/luxon.min.js', import.meta.url), new URL('../html/scripts/vendor/luxon.min.js', import.meta.url));

export default updateVendor;
