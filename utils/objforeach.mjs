// a 'forEach' method for an object
// objForEach (object, (key, value) => {})
const objForEach = (obj, callback) => {
	Object.keys(obj).forEach((key) => {
		callback(key, obj[key]);
	});
};

export default objForEach;
