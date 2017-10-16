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
 * `push()`: puts an `AsyncPainter` to the front of the queue,
 *  or if already present, bumps it to the front.
 *
 * `unshift()` adds an `AsyncPainter` to the back of the queue,
 *  but only if it is not enqueued yet.
 *
 * `clear()` empties the queue
 */
let asyncPainters = [],
	startTime = 0,
	elapsed = 0,
	maxTime = 50,
	timeoutSet = false,
	timeoutID = -1;

/**
 * If there are any painters in the queue, and the queue is
 * not already running, start painting in background thread
 */
function start() {
	if (!timeoutSet && asyncPainters.length) {
		timeoutSet = true;
		timeoutID = setTimeout(startNow, 0);
	}
}

/**
 * Start painting immediately, but
 * continue in the background
 */
function startNow() {
	elapsed = startTime = performance.now();
	while (asyncPainters.length && elapsed - startTime < maxTime) {
		asyncPainters.pop().drawNow();
		elapsed = performance.now();
	}
	if (asyncPainters.length) {
		// if there are still any asyncPainters left,
		// resume drawing on next `setTimeout`
		timeoutSet = true;
		timeoutID = setTimeout(startNow, 0);
	} else {
		// cancel any pending callbacks
		if (timeoutID !== -1){
			clearTimeout(timeoutID);
		}
		timeoutSet = false;
		timeoutID = -1;
	}
}

/**
 * Put `asyncPainter` in front of queue if not already
 * in there, otherwise bump it to the front.
 * Start the queue if not running already.
*/
function push(asyncPainter) {
	let idx = asyncPainters.indexOf(asyncPainter);
	if (idx === -1) {
		asyncPainters.push(asyncPainter);
	} else {
		// bump painter to front.
		let t = asyncPainters[idx];
		while (++idx < asyncPainters.length) {
			asyncPainters[idx - 1] = asyncPainters[idx];
		}
		asyncPainters[idx - 1] = t;
	}
	start();
}

/**
 * Put `asyncPainter` in back fo queue if not already
 * in queue. Start the queue if not running already.
*/
function unshift(asyncPainter) {
	if (asyncPainters.indexOf(asyncPainter) === -1) {
		asyncPainters.unshift(asyncPainter);
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
 * Remove an `asyncPainter` from the
 * Returns index it had in the queue, or `-1` if not
 * in the queue at all.
 * @param {*} asyncPainter
 */
function remove(asyncPainter) {
	let idx = asyncPainters.indexOf(asyncPainter);
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
		clearTimeout(timeoutID);
		timeoutID = -1;
		timeoutSet = false;
	}
	let i = asyncPainters.length;
	while (i--){
		asyncPainters[i].running = false;
	}
	asyncPainters.length = 0;
}

/**
 * Set a new time the queue gets to render
 * between frames (in milliseconds)
 * @param {number} milliseconds
 */
function setMaxTime(milliseconds) {
	maxTime = milliseconds;
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
			// indicate that we are rendering a new asyncPainter
			let size = Math.min(this.context.height / 3 | 0, 20);
			let height = Math.min(size + this.context.height / 3 | 0, 40);
			textSize(this.context, size);
			textStyle(this.context, 'black', 'white', 5);
			drawText(this.context, 'Rendering...', size, height);
		}
		// render in background, first in queue
		// We also call this if already running,
		// to bump the painter to the front
		push(this);
	}
};

/**
 * Add this `AsyncPainter` instance to the painter queue
 */
AsyncPainter.prototype.enqueue = function () {
	if (!this.rendered && !this.running && this.paint && this.context) {
		this.running = true;
		// indicate that we are rendering a new asyncPainter
		let size = Math.min(this.context.height / 3 | 0, 20);
		let height = Math.min(size + this.context.height / 3 | 0, 40);
		textSize(this.context, size);
		textStyle(this.context, 'black', 'white', 5);
		drawText(this.context, 'Rendering...', size, height);
		// render in background, last in queue
		unshift(this);
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

AsyncPainter.prototype.replacePaint = function (newPainter, noBump) {
	this.rendered = false;
	this.paint = newPainter;
	// replacing the painter implies user interaction,
	// so it should get priority. Therefore we bump to
	// the front of the queue unless told not to do so.
	noBump ? this.enqueue() : this.draw();
};

AsyncPainter.prototype.replaceContext = function (newContext) {
	this.rendered = false;
	this.context = newContext;
	// replacing the context implies mounting a node,
	// so it shouldn't override user interaction
	this.enqueue();
};