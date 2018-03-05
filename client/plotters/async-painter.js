import {
	textSize,
	textStyle,
	drawText,
} from 'plotters/canvas-util';

let apQueue = (function () {
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
		// less calls to setTimeOut means less overhead;
		// a framerate of 10 FPS is acceptable.
		maxTime = 100,
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

		// copy all curently queued AsyncPainters.
		// This is to prevent animated painters that
		// are queued again to be redrawn immediately
		// (potentially overwriting themselves without
		// before the compositer renders the output
		// on the screen).
		let paintersThisFrame = asyncPainters.slice(0);
		asyncPainters.length = 0;

		// Draw while not going over time budget
		startTime = performance.now();
		elapsed = startTime;
		while (paintersThisFrame.length && elapsed - startTime < maxTime) {
			paintersThisFrame.pop().drawNow();
			elapsed = performance.now();
		}
		// if there are still any AsyncPainters left,
		// or if any animated painters enqueued themselves again,
		// resume drawing on next `setTimeout`
		if (paintersThisFrame.length || asyncPainters.length) {
			// copy any remaining painters back in the
			// front of the the asyncPainters queue.
			for (let i = 0; i < paintersThisFrame.length; i++) {
				asyncPainters.push(paintersThisFrame[i]);
			}
			timeoutSet = true;
			timeoutID = setTimeout(startNow, 0);
		} else {
			// cancel any pending callbacks
			if (timeoutID !== -1) {
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
	 * Put `asyncPainter` in back of queue if not already
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
		if (idx !== -1) {
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
		for (let i = 0; i < asyncPainters.length; i++) {
			asyncPainters[i].running = false;
			asyncPainters[i].animated = false;
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

	return {
		start,
		startNow,
		push,
		unshift,
		isEmpty,
		remove,
		clear,
		setMaxTime,
	};
})();




// AsyncPainters should handle their own enqueueing and removal,
// but components may empty the queue when unmounting.
export const asyncPainterQueue = {
	isEmpty: apQueue.isEmpty,
	clear: apQueue.clear,
	setMaxTime: apQueue.setMaxTime,
};


/**
 * Renders a passed `paint` function onto a `context`.
 * When called multiple times, it only re-renders
 * if `paint` or `context` has changed.
 *
 * Assumes passed `paint` functions are pure, that is: will
 * always produce the same output on a given `context`.
 *
 * Assumes that nothing else is touching our `context`.
 *
 * Uses `asyncPainterQueue` to avoid freezes caused by painting.

 * @param {function} paint
 * @param {*} context
 */
export function AsyncPainter(paint, context) {
	this.animated = false;
	this.running = false;
	this.rendered = false;
	this.paint = paint;
	this.context = context;
	// try to immediately start rendering if the necessary
	// paint and context were passed.
	this.enqueue();
}

/**
 * Start painting without delay
 */
AsyncPainter.prototype.drawNow = function () {
	if (this.paint && this.context && !this.rendered) {
		// this.context.clearRect(0, 0, this.context.width, this.context.height);
		this.animated = this.paint(this.context);
		this.rendered = !this.animated;
		this.running = this.animated;
		if (this.animated) {
			this.markRender();
			apQueue.unshift(this);
		}
	}
};

/**
 * Push this `AsyncPainter` instance to the front of the painter queue
 */
AsyncPainter.prototype.draw = function (force) {
	const canRender = this.paint && this.context;
	if (!canRender) {
		// remove any pending callbacks to rendering
		this.remove();
	} else if (force || !this.rendered && !this.running) {
		this.running = true;
		this.rendered = false;
		this.markRender();
		// render in background, first in queue
		// We also call this if already running,
		// to bump the painter to the front
		apQueue.push(this);
	}
};

/**
 * Add this `AsyncPainter` instance to the back of the painter queue
 */
AsyncPainter.prototype.enqueue = function (force) {
	const canRender = this.paint && this.context;
	if (!canRender) {
		// remove any pending callbacks to rendering
		this.remove();
	} else if (force || !this.rendered && !this.running) {
		this.running = true;
		this.rendered = false;
		this.markRender();
		// render in background, last in queue
		apQueue.unshift(this);
	}
};

/**
 * Make it clear to the user that the canvas has not finished rendering
 */
AsyncPainter.prototype.markRender = function () {
	if (this.context) {
		let size = Math.min(this.context.height / 3 | 0, 20);
		let height = Math.min(size + this.context.height / 3 | 0, 40);
		textSize(this.context, size);
		textStyle(this.context, 'black', 'white', 5);
		drawText(this.context, 'Rendering...', size, height);
	}
};

AsyncPainter.prototype.remove = function () {
	apQueue.remove(this);
	this.running = false;
	this.animated = false;
};

AsyncPainter.prototype.replaceBoth = function (newPainter, newContext, bump) {
	// replacing the painter usually implies user interaction,
	// so it should get priority. Therefore we bump to
	// the front of the queue unless told not to do so.
	const paintBump = bump; // this.paint !== newPainter || bump;
	const changedPainter = this.paint !== newPainter;
	const changedContext = this.context !== newContext;
	this.paint = newPainter;
	this.context = newContext;
	if (changedPainter || changedContext || bump) {
		// Only queue if something actually changed
		this.animated = false;
		this.rendered = false;
		this.running = false;
		paintBump ? this.draw() : this.enqueue();
	}
};

AsyncPainter.prototype.replacePaint = function (newPainter, noBump) {
	this.animated = false;
	this.rendered = false;
	this.running = false;
	this.paint = newPainter;
	// replacing the painter usually implies user interaction,
	// so it should get priority. Therefore we bump to
	// the front of the queue unless told not to do so.
	noBump ? this.enqueue() : this.draw();
};

AsyncPainter.prototype.replaceContext = function (newContext) {
	this.animated = false;
	this.rendered = false;
	this.running = false;
	this.context = newContext;
	// replacing the context implies mounting a node,
	// so it shouldn't override user interaction
	this.enqueue();
};