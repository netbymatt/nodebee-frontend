// the thermostat list in the date picker

// list the thermostats
export const listThermostats = (systemInfo) => {
	const $list = $('#thermostats').empty();
	Object.keys(systemInfo).forEach((key) => {
		$list.append($('<option>', { value: key, text: systemInfo[key].name }));
	});
	$list.selectmenu('refresh');
};

// set the selected thermostat
export const setThermostat = (thermostat) => {
	$('#thermostats').val(thermostat).selectmenu('refresh');
};
