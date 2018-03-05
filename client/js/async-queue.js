/**
 * Returns object for queueing callbacks to run asynchronously order.
 *
 * `maxTime` is the amount of time asyncQueue will run callbacks
 * before scheduling the next batch with `setTimeout(..., 0)`
 *
 * If `autoStart` is set, callbacks will be scheduled as
 * soon as they are added. (default: `true`)
 *
 * If `noDuplicate` is set, callbacks are prevented from being added if
 * already in the queue through a simple equality check. So this only works
 * if the *exact same* function is passed! (default: `false`)
 *
 * If `bumpIfDuplicate` and `noDuplicate` are set, callbacks will be
 * bumped to the front (`unshift`) or back (`push`) of the queue if
 * already present in the queue.  (default: `false`)
 *
 * @param {function[]} asyncCallbacks
 * @param {number=50} maxTime
 * @param {boolean=true} autoStart
 * @param {boolean=false} noDuplicate
 * @param {boolean=false} bumpIfDuplicate
 */
export function asyncQueue(asyncCallbacks = [], maxTime = 50, autoStart = true, noDuplicate = false, bumpIfDuplicate = false) {

	let startTime = 0,
		elapsed = 0,
		timeoutSet = false,
		timeoutID = -1,
		_noDuplicate = noDuplicate,
		_bumpIfDuplicate = bumpIfDuplicate;

	/**
	 * Starts async "loop" that runs until the queue is empty.
	 *
	 * Should remain private to ensure we do not get multiple
	 * pending `setTimeOut` calls to `asyncLoop` (which should
	 * still be harmless because it checks for queue length,
	 * but `setTimeOut` isn't without overhead of its own)
	 */
	function asyncLoop() {
		elapsed = startTime = performance.now();
		while (asyncCallbacks.length && elapsed - startTime < maxTime) {
			(asyncCallbacks.shift())();
			elapsed = performance.now();
		}
		if (asyncCallbacks.length) {
			// if there are still any asyncCallbacks left,
			// resume calling them on next `setTimeout`
			timeoutSet = true;
			timeoutID = setTimeout(asyncLoop, 0);
		} else {
			/*
			 * Unless I am misunderstanding the JavaScript event model,
			 * as long as `asyncLoop` is encapsulated and we can only
			 * call it through `startAsync()` or `startNow()`, there will
			 * never be more than one running `asyncLoop` "loop" per queue.
			 * So if we reach this branch, there cannot be any pending
			 * `setTimeOut` calls to `asyncLoop`.
			 * But if I'm wrong, uncomment the code below.
			 */
			// if (timeoutID !== -1) {
			// 	clearTimeout(timeoutID);
			// }
			timeoutSet = false;
			timeoutID = -1;
		}
	}

	function startAsync() {
		if (!timeoutSet && asyncCallbacks.length > 0) {
			timeoutSet = true;
			timeoutID = setTimeout(asyncLoop, 0);
		}
		return asyncCallbacks.length;
	}

	function startNow() {
		if (asyncCallbacks.length > 0) {
			if (timeoutSet) {
				// avoid having multiple pending `asyncLoop` calls
				clearTimeout(timeoutID);
			}
			asyncLoop();
		}
		return asyncCallbacks.length;
	}

	/**
	 * Put callback in back of queue.
	 *
	 * If `noDuplicate` is set, callbacks are prevented from being added if
	 * already in the queue through a simple equality check. So only works
	 * if the *exact same* function is passed!
	 *
	 * If `bumpIfDuplicate` and `noDuplicate` are set, duplicate callbacks will
	 * be bumped to the back of the queue instead.
	 * @param {function | function[]} callback
	 * @param {boolean=} noDuplicate
	 * @param {boolean=} bumpIfDuplicate
	*/
	function pushOne(callback, noDuplicate, bumpIfDuplicate) {
		if (noDuplicate || _noDuplicate) {
			let idx = asyncCallbacks.indexOf(callback);
			if (idx === -1) {
				asyncCallbacks.push(callback);
			} else if (bumpIfDuplicate || _bumpIfDuplicate) {
				// bump callback to end.
				let t = asyncCallbacks[idx];
				while (++idx < asyncCallbacks.length) {
					asyncCallbacks[idx - 1] = asyncCallbacks[idx];
				}
				asyncCallbacks[idx - 1] = t;
			}
		} else {
			asyncCallbacks.push(callback);
		}
	}

	/**
	 * Put callback in front of queue.
	 *
	 * If `noDuplicate` is set, callbacks are prevented from being added if
	 * already in the queue through a simple equality check. So only works
	 * if the *exact same* function is passed!
	 *
	 * If `bumpIfDuplicate` and `noDuplicate` are set, duplicate callbacks will
	 * be bumped to the front of the queue instead.
	 * @param {function | function[]} callback
	 * @param {boolean=} noDuplicate
	 * @param {boolean=} bumpIfDuplicate
	*/
	function unshiftOne(callback, noDuplicate, bumpIfDuplicate) {
		if (noDuplicate || _noDuplicate) {
			let idx = asyncCallbacks.indexOf(callback);
			if (idx === -1) {
				asyncCallbacks.unshift(callback);
			} else if (bumpIfDuplicate || _bumpIfDuplicate) {
				// bump callback to end.
				let t = asyncCallbacks[idx];
				while (++idx < asyncCallbacks.length) {
					asyncCallbacks[idx - 1] = asyncCallbacks[idx];
				}
				asyncCallbacks[idx - 1] = t;
			}
		} else {
			asyncCallbacks.unshift(callback);
		}
	}

	if (autoStart && asyncCallbacks.length > 0) {
		startAsync();
	}

	return {
		/**
		 * Unsets `noDuplicate`. Callbacks are allowed to be added if
		 * already in the queue.
		 */
		allowDuplicate: function() {
			noDuplicate = false;
		},
		/**
		 * Makes queue call `startAsync` when a callback is added
		 * with `push` or `unshift`.
		 */
		autoStart: function () {
			autoStart = true;
		},
		/**
		 * Sets `bumpIfDuplicate`. If `bumpIfDuplicate` and `noDuplicate`
		 * are set, callbacks will be bumped to the front (unshift) or
		 * back (push) of the queue if already present in the queue.
		 */
		bumpIfDuplicate: function () {
			bumpIfDuplicate = true;
		},
		/**
		 * Clears out the entire queue and cancels any pending calls.
		 *
		 * If callbacks need to  they are cancelled early,
		 * attach a `.cancel()` method to them (i.e. `draw()` and `draw.cancel()`).
		 */
		clear: function () {
			if (timeoutID !== -1) {
				clearTimeout(timeoutID);
				timeoutID = -1;
				timeoutSet = false;
			}
			for(let i = 0; i < asyncCallbacks.length; i++) {
				if (asyncCallbacks[i].cancel) {
					asyncCallbacks[i].cancel();
				}
			}
			asyncCallbacks.length = 0;
		},
		/**
		 * Returns `true` if there are no waiting callbacks
		 */
		isEmpty: function () {
			return asyncCallbacks.length === 0;
		},
		/**
		 * Stops queue from calling `startAsync` when a callback is added
		 * with `push` or `unshift`.
		 */
		noAutoStart: function () {
			autoStart = false;
		},
		/**
		 * Unsets `bumpIfDuplicate` (if `bumpIfDuplicate` and `noDuplicate`
		 * are set, callbacks will be bumped to the front (unshift) or
		 * back (push) of the queue if already present in the queue).
		 */
		noBumpIfDuplicate: function(){

		},
		/**
		 * Sets `noDuplicate`. Callbacks are prevented from being added if
		 * already in the queue through a simple equality check. So only works
		 * if the *exact same* function is passed!
		 *
		 * Does *not* remove existing duplicates in queue.
		 */
		noDuplicate: function () {
			noDuplicate = true;
		},
		/**
		 * Add callback(s) to back of queue.
		 *
		 * Takes optional `noDuplicate` and `bumpIfDuplicate` arguments
		 * to override the `asyncQueue` settings.
		 *
		 * If `autoStart` is set (default), start queue
		 * @param {function | function[]} callback
		 * @param {boolean=} noDuplicate
		 * @param {boolean=} bumpIfDuplicate
		 */
		push: function (callback, noDuplicate, bumpIfDuplicate) {

			// Only override default setting if a value was passed
			noDuplicate = _noDuplicate || noDuplicate !== undefined && noDuplicate;
			bumpIfDuplicate = _bumpIfDuplicate || bumpIfDuplicate !== undefined && bumpIfDuplicate;

			if (typeof callback === 'function') {
				pushOne(callback, noDuplicate, bumpIfDuplicate);
			} else if (callback instanceof Array) {
				for (let i = 0; i < callback.length; i++) {
					if (typeof callback[i] === 'function') {
						pushOne(callback[i], noDuplicate, bumpIfDuplicate);
					}
				}
			}
			if (autoStart) {
				startAsync();
			}
			return callback;
		},
		/**
		 * Remove a callback from the queue
		 * If callback was in queue, return it,
		 * otherwise return -1.
		 *
		 * @param {function} callback
		 */
		remove: function (callback) {
			let idx = asyncCallbacks.indexOf(callback);
			if (idx === -1) {
				asyncCallbacks.splice(idx);
				return callback;
			}
			return -1;
		},
		/**
		 * Set a new time (in milliseconds) the queue
		 * gets to render between between pending `setTimeOut` calls. Note that:
		 *
		 * - this *not* prevent a callback from going over this limit
		 * - *if* a callback goes over the limit, and there still are pending callbacks, `asyncQueue` do not compensate for the delay. That is: we *still* queue the next round of callbacks with with `setTimeOut(<async-queue>, 0)`
		 * @param {number} milliseconds
		 */
		setMaxTime: function (milliseconds) {
			maxTime = milliseconds;
		},
		/**
		 * If there are any callbacks in the queue, and if the queue
		 * is not running, start running in background.
		 *
		 * Returns number of pending callbacks
		 */
		startAsync,
		/**
		 * Starts first cycle of the asynchronous loop immediately,
		 * then continues in the background.
		 *
		 * Returns number of pending callbacks
		 */
		startNow,
		/**
		 * Add callback(s) to front of queue.
		 *
		 * Takes optional `noDuplicate` and `bumpIfDuplicate` arguments
		 * to override the `asyncQueue` settings.
		 *
		 * If `autoStart` is set (default), start queue
		 * @param {function | function[]} callback
		 * @param {boolean=} noDuplicate
		 * @param {boolean=} bumpIfDuplicate
		 */
		unshift: function (callback, noDuplicate, bumpIfDuplicate) {

			// Only override default setting if a value was passed
			noDuplicate = _noDuplicate || noDuplicate !== undefined && noDuplicate;
			bumpIfDuplicate = _bumpIfDuplicate || bumpIfDuplicate !== undefined && bumpIfDuplicate;

			if (typeof callback === 'function') {
				unshiftOne(callback, noDuplicate, bumpIfDuplicate);
			} else if (callback instanceof Array) {
				let i = callback.length;
				while (i--) {
					if (typeof callback[i] === 'function') {
						unshiftOne(callback[i], noDuplicate, bumpIfDuplicate);
					}
				}
			}
			if (autoStart) {
				startAsync();
			}
			return callback;
		},
	};
}