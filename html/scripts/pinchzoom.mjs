// pinch to zoom for plotly, which only supports one finger panning on touch screens
// each pinch movement is converted into wheel events at the midpoint of the fingers so plotly's own scroll zoom does the work:
// a fast preview during the gesture and a single redraw when it ends
// relies on plotly's scroll zoom being enabled (config.scrollZoom) and its wheel calculation in dragbox zoomWheel:
// each event scales the axis by exp(deltaY / 200) with deltaY limited to +/-20
// also uses the undocumented _dragging property to cancel a one finger pan when the second finger lands

/* eslint-disable no-underscore-dangle -- plotly internals */

const MAX_DELTA = 20;	// largest deltaY plotly uses from a single wheel event
const KEEPALIVE = 30;	// ms, less than plotly's 50ms wheel redraw delay

// chart is the plotly div
const enablePinchZoom = (chart) => {
	let lastDistance = null;	// horizontal distance between the fingers at the last update, null when not pinching
	let lastPoint = null;	// midpoint of the fingers at the last update
	let keepalive = null;	// interval that holds off plotly's redraw while the fingers pause

	// horizontal distance and midpoint of the first two touches, distance has a minimum to avoid extreme zooming
	const measure = (touches) => {
		const [a, b] = touches;
		return {
			distance: Math.max(Math.abs(a.clientX - b.clientX), 20),
			clientX: (a.clientX + b.clientX) / 2,
			clientY: (a.clientY + b.clientY) / 2,
		};
	};

	// scale the x axis span by factor around clientX, split into as many wheel events as plotly needs
	const zoomBy = (factor, clientX, clientY) => {
		const target = chart.querySelector('.nsewdrag');
		if (!target) return;
		const deltaY = 200 * Math.log(factor);
		const steps = Math.max(1, Math.ceil(Math.abs(deltaY) / MAX_DELTA));
		for (let i = 0; i < steps; i += 1) {
			target.dispatchEvent(new WheelEvent('wheel', {
				deltaY: deltaY / steps, clientX, clientY, bubbles: true, cancelable: true,
			}));
		}
	};

	// plotly redraws 50ms after the last wheel event, a full redraw can take most of a second with a lot of data
	// so while pinching, zero size wheel events restart that timer and the redraw happens once the pinch ends
	const startKeepalive = () => {
		keepalive = setInterval(() => zoomBy(1, lastPoint.clientX, lastPoint.clientY), KEEPALIVE);
	};

	const endPinch = () => {
		clearInterval(keepalive);
		keepalive = null;
		lastDistance = null;
	};

	const touchStart = (e) => {
		if (e.touches.length < 2 || !chart._fullLayout) return;
		// keep plotly from starting its own drag and cancel any one finger pan already in progress
		e.preventDefault();
		e.stopPropagation();
		// eslint-disable-next-line no-param-reassign -- plotly reads this to decide whether to finish its drag
		chart._dragging = false;
		const { distance, clientX, clientY } = measure(e.touches);
		lastDistance = distance;
		lastPoint = { clientX, clientY };
		if (!keepalive) startKeepalive();
	};

	const touchMove = (e) => {
		if (lastDistance === null) return;
		e.preventDefault();
		e.stopPropagation();
		if (e.touches.length < 2) return;

		const { distance, clientX, clientY } = measure(e.touches);
		// fingers moving apart shrinks the span (zoom in)
		const factor = lastDistance / distance;
		lastDistance = distance;
		lastPoint = { clientX, clientY };
		if (Math.abs(factor - 1) > 0.001) zoomBy(factor, clientX, clientY);
	};

	// end the pinch when fewer than two fingers remain, the event continues on to plotly so it can clean up
	const touchEnd = (e) => {
		if (e.touches.length < 2) endPinch();
	};

	// capture phase so these run before plotly's handlers
	chart.addEventListener('touchstart', touchStart, { capture: true, passive: false });
	chart.addEventListener('touchmove', touchMove, { capture: true, passive: false });
	chart.addEventListener('touchend', touchEnd, { capture: true });
	chart.addEventListener('touchcancel', touchEnd, { capture: true });
};

export default enablePinchZoom;
