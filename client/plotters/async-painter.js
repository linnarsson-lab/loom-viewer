import {
	textSize,
	textStyle,
	drawText,
} from './canvas';

/**
 * A queue that automatically schedules to start drawing
 * AsyncPainters using `setTimeOut`.
 *
 * `clear()`: removes all asyncPainters at once, for when
 *   we unmount a view.
 *
 * `push()`: appends an `AsyncPainter` to the queue, but only
 *  if it is not enqueued yet.
 *
 * `unshift()` puts an `AsyncPainter` to the front of the queue,
 *  or if already present, bumps it to the front.
 *
 * `setMaxTime(number)` sets the number of millis we get to render
 *  enqueued painters before returning (default: 200)
 *
 * `clear()` empties the queue
 */
let maxTime = 200,
	running = false,
	asyncPainters = [],
	startTime = 0,
	elapsed = 0,
	timeoutSet = false,
	timeoutID = -1;

/**
 * If there are any painters in the queue, and the queue is
 * not already running, start painting in background thread
 */
function start() {
	if (!running && !timeoutSet && asyncPainters.length) {
		timeoutSet = true;
		timeoutID = setTimeout(startNow, 0);
	}
}

/**
 * Start painting immediately, but
 * continue in the background
 */
function startNow() {
	if (!running) {
		elapsed = startTime = performance.now();
		let i = 0;
		// while we still have time left, draw asyncPainters
		while (i < asyncPainters.length && elapsed - startTime < maxTime) {
			asyncPainters[i++].drawNow();
			elapsed = performance.now();
		}
		running = false;
		// remove all asyncPainters that have run
		asyncPainters.splice(0, i);
		// if there are still any asyncPainters left,
		// resume painting on next frame.
		if (asyncPainters.length) {
			timeoutSet = true;
			timeoutID = setTimeout(startNow, 0);
		} else {
			timeoutSet = false;
			timeoutID = -1;
		}
	}
}

/**
 * Append `idlePainter` if not already in the
 * Start the queue if not running already.
*/
function push(idlePainter) {
	if (asyncPainters.indexOf(idlePainter) === -1) {
		asyncPainters.push(idlePainter);
	}
	start();
}

/**
 * Unshift `idlePainter` if not already in the queue,
 * otherwise bump it to the front of the
 * Start the queue if not running already.
*/
function unshift(idlePainter) {
	let idx = asyncPainters.indexOf(idlePainter);
	if (idx === -1) {
		asyncPainters.unshift(idlePainter);
	} else {
		// bump painter to front.
		let t = asyncPainters[idx];
		while (idx--) {
			asyncPainters[idx + 1] = asyncPainters[idx];
		}
		asyncPainters[0] = t;
	}
	start();
}

/**
 * Returns `true` if there are no waiting painters
 */
function isEmpty() {
	return asyncPainters.length === 0;
}

/**
 * Remove an `idlePainter` from the
 * Returns index it had in the queue, or `-1` if not
 * in the queue at all.
 * @param {*} idlePainter
 */
function remove(idlePainter) {
	let idx = asyncPainters.indexOf(idlePainter);
	if (idx === -1) {
		asyncPainters.splice(idx);
	}
	return idx;
}

/**
 * Clears out the entire queue and cancels
 * any pending draw calls.
 */
function clear() {
	if (timeoutID !== -1) {
		cancelAnimationFrame(timeoutID);
		timeoutID = -1;
		timeoutSet = false;
	}
	asyncPainters.length = 0;
	running = false;
}

/**
 * Set a new time the queue gets to render
 * between frames (in millis)
 * @param {number} newMaxTime
 */
function setMaxTime(newMaxTime) {
	maxTime = newMaxTime;
}



// AsyncPainters should handle their own enqueueing and removal,
// but components may empty the queue when unmounting.
export const asyncPainterQueue = {
	isEmpty,
	clear,
	setMaxTime,
};


/**
 * Automatically renders a passed `paint` function onto a `context` once.
 *
 * Automatically re-renders if `paint` or `context` changes.
 *
 * Assume passed `paint` functions are pure, that is: will
 * always produce the same output on a given `context`.
 *
 * Assumes that nothing else is touching our `context`.
 *
 * Uses `asyncPainterQueue` to avoid freezes caused by painting.

 * @param {function} paint
 * @param {*} context
 */
export function AsyncPainter(paint, context) {
	this.running = false;
	this.rendered = false;
	this.paint = paint;
	this.context = context;
	// try to immediately start rendering if the necessary
	// paint and context were passed.
	this.enqueue();
}

// draw pushes to the front of the queue
AsyncPainter.prototype.draw = function () {
	if (!this.rendered && this.paint && this.context) {
		if (!this.running) {
			this.running = true;
			// indicate that we are rendering a new idlePainter
			let size = Math.min(this.context.height / 3 | 0, 20);
			let height = Math.min(size + this.context.height / 3 | 0, 40);
			textSize(this.context, size);
			textStyle(this.context, 'black', 'white', 5);
			drawText(this.context, 'Rendering...', size, height);
		}
		// render in background, first in queue
		// We also call this if already running,
		// to bump the painter to the front
		unshift(this);
	}
};

/**
 * Add this `AsyncPainter` instance to the painter queue
 */
AsyncPainter.prototype.enqueue = function () {
	if (!this.rendered && !this.running && this.paint && this.context) {
		this.running = true;
		// indicate that we are rendering a new idlePainter
		let size = Math.min(this.context.height / 3 | 0, 20);
		let height = Math.min(size + this.context.height / 3 | 0, 40);
		textSize(this.context, size);
		textStyle(this.context, 'black', 'white', 5);
		drawText(this.context, 'Rendering...', size, height);
		// render in background, last in queue
		push(this);
	}
};

/**
 * Start painting without delay
 */
AsyncPainter.prototype.drawNow = function () {
	this.context.clearRect(0, 0, this.context.width, this.context.height);
	this.paint(this.context);
	this.running = false;
	this.rendered = true;
};

AsyncPainter.prototype.remove = function () {
	remove(this);
	this.running = false;
};

AsyncPainter.prototype.replacePaint = function (newPainter) {
	this.rendered = false;
	this.paint = newPainter;
	// replacing the painter implies user interaction,
	// so it should get priority. Therefore we
	// bump to the front of the queue
	this.draw();
};

AsyncPainter.prototype.replaceContext = function (newContext) {
	this.rendered = false;
	this.context = newContext;
	// replacing the context implies mounting a node,
	// so it shouldn't override user interaction
	this.enqueue();
};