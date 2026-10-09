// the shared dialog box, errors and the loading indicator

let loadingCount = 0;	// requests in progress

// initialize the dialog that holds the date picker, series and error panels
export const initDialog = () => {
	$('#dialog').dialog({
		autoOpen: false,
		draggable: true,
		position: {
			my: 'center',
			at: 'center',
			of: '#chart',
		},
		width: 325,
		show: 'slideDown',
		hide: 'slideUp',
		modal: true,
		resizable: false,
	});
};

// open dialog
// shows only the panel with the provided id
export const openDialog = (panelId, title) => {
	// hide everything in the dialog box
	$('.dialog-hidden').hide(0);
	$(`#${panelId}`).show(0);
	$('#dialog').dialog('open').dialog('option', 'title', title);
};

export const closeDialog = () => {
	$('#dialog').dialog('close');
};

export const showError = (message) => {
	$('#dialog-error').text(message);
	openDialog('dialog-error', 'Error');
};

// set loading
// shows the loading indicator while any request is in progress
export const setLoading = (loading) => {
	loadingCount += loading ? 1 : -1;
	$('#loading').toggleClass('active', loadingCount > 0);
};
