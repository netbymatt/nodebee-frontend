// keep plotly's x axis inside the available data while panning and wheel zooming
// plotly only applies range limits once a drag or zoom finishes which causes a visible snap
// instead, the pointer position plotly reads from each event is adjusted so the plot stops at the edge of the data
// relies on undocumented plotly internals: _fullLayout.xaxis with r2l and _m (pixels per millisecond), _dragging,
// and plotly reading clientX (or changedTouches[0].clientX) from events

/* eslint-disable no-underscore-dangle -- plotly internals */

// chart is the plotly div, getBounds returns [lower, upper] in plotly's x axis milliseconds
const enableXLimits = (chart, getBounds) => {
	let drag = null;	// limits of the current pan

	const currentRange = () => {
		const { xaxis } = chart._fullLayout;
		return xaxis.range.map((value) => xaxis.r2l(value));
	};

	// replace the horizontal position plotly will read from the event
	const setClientX = (e, clientX) => {
		if (e.changedTouches) {
			const [touch] = e.changedTouches;
			Object.defineProperty(e, 'changedTouches', { value: [{ clientX, clientY: touch.clientY }] });
		} else {
			Object.defineProperty(e, 'clientX', { value: clientX });
		}
	};

	// pan start, only for drags on the plot area or the middle of the x axis
	const dragStart = (e) => {
		drag = null;
		if (!chart._fullLayout || e.touches?.length > 1) return;
		const { classList } = e.target;
		if (!classList?.contains('nsewdrag') && !classList?.contains('ewdrag')) return;

		const [min, max] = currentRange();
		const [lower, upper] = getBounds();
		const { _m: pxPerMs } = chart._fullLayout.xaxis;
		// allowed horizontal movement in pixels, dragging right moves the range earlier
		// zero is always allowed so a range that is already out of bounds does not jump
		drag = {
			startX: (e.changedTouches?.[0] ?? e).clientX,
			minDx: Math.min((max - upper) * pxPerMs, 0),
			maxDx: Math.max((min - lower) * pxPerMs, 0),
		};
	};

	const dragMove = (e) => {
		if (!drag || !chart._dragging || e.touches?.length > 1) return;
		const dx = (e.changedTouches?.[0] ?? e).clientX - drag.startX;
		const limited = Math.min(Math.max(dx, drag.minDx), drag.maxDx);
		if (limited !== dx) setClientX(e, drag.startX + limited);
	};

	const dragEnd = () => {
		drag = null;
	};

	// wheel zoom, zooming out is centered so that neither end passes the data
	// this mirrors the zoom calculation in plotly's dragbox zoomWheel
	const wheel = (e) => {
		if (!chart._fullLayout || !e.target.classList?.contains('nsewdrag')) return;
		let wheelDelta = -e.deltaY;
		if (!Number.isFinite(wheelDelta)) wheelDelta = e.wheelDelta / 10;
		if (!Number.isFinite(wheelDelta)) return;
		const zoom = Math.exp(-Math.min(Math.max(wheelDelta, -20), 20) / 200);
		// zooming in always stays inside
		if (zoom <= 1) return;

		const [min, max] = currentRange();
		const [lower, upper] = getBounds();
		const full = (upper - lower) / (max - min);
		// already showing everything, ignore the zoom out
		if (full <= 1.0001) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		// zoom out only as far as the full range
		const z = Math.min(zoom, full);
		if (z < zoom) Object.defineProperty(e, 'deltaY', { value: 200 * Math.log(z) });

		// the zoom center that keeps both ends in bounds, as close to the pointer as possible
		const rect = e.target.getBoundingClientRect();
		const pointerCenter = min + ((e.clientX - rect.left) / rect.width) * (max - min);
		const lowestCenter = (max * z - upper) / (z - 1);
		const highestCenter = (min * z - lower) / (z - 1);
		const center = Math.min(Math.max(pointerCenter, lowestCenter), highestCenter);
		if (center !== pointerCenter) setClientX(e, rect.left + ((center - min) / (max - min)) * rect.width);
	};

	// capture phase so these run before plotly's handlers
	chart.addEventListener('mousedown', dragStart, { capture: true });
	chart.addEventListener('touchstart', dragStart, { capture: true, passive: true });
	window.addEventListener('mousemove', dragMove, { capture: true });
	window.addEventListener('touchmove', dragMove, { capture: true, passive: true });
	window.addEventListener('mouseup', dragEnd, { capture: true });
	window.addEventListener('touchend', dragEnd, { capture: true });
	chart.addEventListener('wheel', wheel, { capture: true, passive: false });
};

export default enableXLimits;
