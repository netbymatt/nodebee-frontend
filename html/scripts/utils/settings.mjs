// remember which series are turned off in the series dialog between visits, using local storage
// storage can be unavailable (private browsing, blocked site data) in which case nothing is remembered
// everything else starts fresh on each visit

const KEY = 'nodebee-settings';

// names of series that are turned off
export const loadHidden = () => {
	try {
		return JSON.parse(localStorage.getItem(KEY))?.hidden ?? [];
	} catch {
		return [];
	}
};

export const saveHidden = (hidden) => {
	try {
		localStorage.setItem(KEY, JSON.stringify({ hidden }));
	} catch {
		// storage unavailable, settings are not remembered
	}
};
