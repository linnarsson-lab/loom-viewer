/**
 * Crude normal curve approximation by taking the average of 8 random values.
 * Returns random value between [-1, 1)
 */
export function rndNorm() {
	return ((Math.random() + Math.random() + Math.random() + Math.random() +
		Math.random() + Math.random() + Math.random() + Math.random()) - 4) * 0.25;
}


// expects two number arrays of [xmin, ymin, xmax, ymax].
export function inBounds(r1, r2) {
	return (
		r1[0] < r2[2] && // r1.xmin < r2.xmax
		r2[2] < r1[2] && // r2.xmin < r1.xmax
		r1[1] < r2[3] && // r1.ymin < r2.ymax
		r2[1] < r1[3]    // r2.ymin < r1.ymax
	);
}

/**
 * Returns array of all unique values as `{ val, count }`
 * objects. Sorted by `count`.
 */
export function countElements(array) {
	// Copy and sort the array. Note that after sorting,
	// undefined values will be at the end of the array!
	const sorted = array.slice(0).sort();

	// linearly run through the array, track the
	// unique entries and count how often they show up
	let i = 0;
	let uniques = [];
	// Note that, since JS returns undefined for
	// out of bounds values, we get a "sentinel"
	// value for free at the end of the data.
	while (sorted[i] !== undefined) {
		const val = sorted[i];

		// advance until a different value is found
		let count = 0;
		while (sorted[i + count] === val) {
			count++;
		}
		// skip empty strings and null
		// if (!(val === '' || val === null)){
		uniques.push({ val: val, count });
		// }
		i += count;
	}

	// sort by how common the values are
	// on equal count, sort by value itself
	uniques.sort((a, b) => {
		return a.count < b.count ? 1 :
			a.count > b.count ? -1 :
				a.val <= b.val ? -1 : 1;
	});

	return uniques;
}

export function nMostFrequent(array, n) {
	let uniques = countElements(array);

	// if n is undefined or zero, return the whole array
	n = n ? Math.min(n, uniques.length) : uniques.length;
	let values = [], count = [];
	for (let i = 0; i < n; i++) {
		values.push(uniques[i].val);
		count.push(uniques[i].count);
	}
	return { values, count };

	// // Sten's functional, elegant but slower original:
	// // (also not sure if it handles undefined values)
	// let frequence = {};
	// array.forEach((value) => { frequency[value] = 0; });
	// const uniques = array.filter((value) => {
	// =>	return ++frequency[value] === 1;
	// });
	// const result = uniques.sort((a, b) => {
	// =>	return frequency[b] - frequency[a];
	// });
	// return result[0] === '' ? result.slice(1, n + 1) : result.slice(0, n);
}

export function calcMinMax(data) {
	let min = 0;
	let max = 0;
	if (typeof data[0] === 'number') {
		min = Number.MAX_VALUE;
		max = Number.MIN_VALUE;
		for (let i = 0; i < data.length; i++) {
			min = min < data[i] ? min : data[i];
			max = max > data[i] ? max : data[i];
		}
	}
	return { min, max };
}

// checks if an object is an array or typed array
export function isArray(obj) {
	return obj instanceof Array ||
		obj instanceof Float64Array ||
		obj instanceof Int32Array ||
		obj instanceof Float32Array ||
		obj instanceof Int8Array ||
		obj instanceof Uint8Array ||
		obj instanceof Uint8ClampedArray ||
		obj instanceof Uint32Array ||
		obj instanceof Int16Array ||
		obj instanceof Uint16Array;
}

// === Helper functions for updating Redux state ===
//
// Assumptions: these functions are for merging states
// in Redux, which is usually overwriting part of the
// old state with a new state.
// Most of the time the new state will have overlapping
// keys, and the number of keys will be relatively small.
// In other words: for two trees with N total and M over-
// lapping keys, M will be very small most of the time.
// Note that when not overlapping, merge just shallow
// copies the old/new values and does not go through the
// whole tree. We can safely do this because values in
// the Redux store are supposed to be immutable. So while
// worst case behaviour is somewhere around O(N²), which
// is when all keys overlap, in practice this is unlikely
// to happen.
//


/**
* **IMPORTANT:** util.merge does **NOT** behave like
* lodash merge!
*
* Returns a new object that merges `oldObj` and
* `newObj` into one. Uses shallow copying.
*
* - for duplicate keys, values that are objects
* (but not (typed) arrays) are recursively merged.
* - in all other cases, the value from `newObj` is
* assigned to the resulting object.
*
* *Again: (typed) arrays are not merged but overwritten
* by the new array!*
**/
export function merge(oldObj, newObj) {
	if (!oldObj) {
		return Object.assign({}, newObj);
	} else if (!newObj) {
		return oldObj;
	}
	let untouchedKeys = Object.keys(oldObj);
	let newKeys = Object.keys(newObj);
	// Track which keys overlap, since
	// their values may need to be merged
	let overlappingKeys = [];
	for (let i = 0; i < untouchedKeys.length; i++) {
		let untouchedKey = untouchedKeys[i];
		for (let j = 0; j < newKeys.length; j++) {
			let newKey = newKeys[j];
			// if a key overlaps it obviously isn't untouched
			if (untouchedKey === newKey) {
				// So it is removed from the untouched keys,
				// by replacing it with the last key in the
				// the array (unless it is the last element,
				// in which case we just pop it).
				untouchedKey = untouchedKeys.pop();
				if (i < untouchedKeys.length) {
					untouchedKeys[i] = untouchedKey;
					i--; // So we don't skip a key
				}
				// We only need to merge the value if it is
				// an an object, otherwise we can use the value from
				// the new object (as if it is a new key/value pair).
				let val = newObj[newKey];
				if (typeof val === 'object' && !isArray(val)) {
					overlappingKeys.push(newKey);
					newKey = newKeys.pop();
					if (j < newKeys.length) {
						newKeys[j] = newKey;
					}
				}
				break;
			}
		}
	}
	let mergedObj = {};
	// merge object values by recursion
	for (let i = 0; i < overlappingKeys.length; i++) {
		let key = overlappingKeys[i];
		mergedObj[key] = merge(oldObj[key], newObj[key]);
	}
	// directly assign all values that don't need merging
	for (let i = 0; i < untouchedKeys.length; i++) {
		let key = untouchedKeys[i];
		mergedObj[key] = oldObj[key];
	}
	for (let i = 0; i < newKeys.length; i++) {
		let key = newKeys[i];
		mergedObj[key] = newObj[key];
	}
	return mergedObj;
}

/**
* Similar to `util.merge`, but for "deleting" fields from trees
* Produces a new object, with the leaves of `delTree` pruned
* out of `sourceTree` (by virtue of not copying).
* - `sourceTree` is the pre-existing state, assumed
*   to be an object structured like a tree.
* - `delTree` should be a tree where the values
*   are either subtrees (objects), or anything that's
*   not an object (actual value does not matter)
*   If subtree, we recurse. If *anything* else, we prune
*   the matching key.
*/
export function prune(sourceTree, delTree) {
	if (!sourceTree) {
		// we might be trying to recursively
		// prune on a non-existent node in
		// sourceTree
		return undefined;
	} else if (!delTree) {
		return sourceTree;
	}
	let sourceKeys = Object.keys(sourceTree);
	let delKeys = Object.keys(delTree);
	let subKeys = [];
	for (let i = 0; i < delKeys.length; i++) {
		let delKey = delKeys[i];
		for (let j = 0; j < sourceKeys.length; j++) {
			let sourceKey = sourceKeys[j];
			if (sourceKey === delKey) {
				// "delete" by not copying
				sourceKey = sourceKeys.pop();
				if (j < sourceKeys.length) {
					sourceKeys[j] = sourceKey;
				}
				// check if we need to recurse
				let val = delTree[delKey];
				if (typeof val === 'object' && !Array.isArray(val)) {
					subKeys.push(delKey);
				}
				break;
			}
		}
	}

	let prunedObj = {};
	let totalKeys = sourceKeys.length;
	// copy all values that aren't pruned
	for (let i = 0; i < sourceKeys.length; i++) {
		let key = sourceKeys[i];
		prunedObj[key] = sourceTree[key];
	}
	// recurse on all subtrees
	for (let i = 0; i < subKeys.length; i++) {
		let key = subKeys[i];
		let subTree = prune(sourceTree[key], delTree[key]);
		if (subTree) { // avoid setting keys for undefined values
			prunedObj[key] = subTree;
			totalKeys++;
		}
	}
	// don't return prunedObj if it is empty
	return totalKeys ? prunedObj : undefined;
}

/**
 * Like `util.merge`, but toggles boolean leaf values
 *
 * Boolean values in `newObj` should be set to
 * `true` for consistent results!
 *
 * The reason for this is as follows:
 *
 * - if a branch is new, `util.toggle` makes a shallow copy.
 *   Because of this, if a leaf is `false`, it will be
 *   initialised as such when it is hidden away somewhere
 *   in a new subtree.
 * - if only the boolean leaf value is new, the previously
 *   `undefined` value gets inverted, and hence initialised
 *   as `true`, regardless of its value in `newObj`.
 *
 * Don't make use of this; just pass `true` for values
 * that you want to toggle, and use `util.merge` if you want
 * to initialise an undefined value as `false` instead.
 */
export function toggle(oldObj, newObj) {
	if (!oldObj) {
		return newObj;
	} else if (!newObj) {
		return oldObj;
	}
	let untouchedKeys = Object.keys(oldObj);
	let newKeys = Object.keys(newObj);
	let overlappingKeys = [];
	for (let i = 0; i < untouchedKeys.length; i++) {
		let untouchedKey = untouchedKeys[i];
		for (let j = 0; j < newKeys.length; j++) {
			let newKey = newKeys[j];
			if (untouchedKey === newKey) {
				untouchedKey = untouchedKeys.pop();
				if (i < untouchedKeys.length) {
					untouchedKeys[i] = untouchedKey;
					i--;
				}
				let val = newObj[newKey];
				if (typeof val === 'object' && !isArray(val)) {
					overlappingKeys.push(newKey);
					newKey = newKeys.pop();
					if (j < newKeys.length) {
						newKeys[j] = newKey;
					}
				}
				break;
			}
		}
	}
	let mergedObj = {};
	for (let i = 0; i < overlappingKeys.length; i++) {
		let key = overlappingKeys[i];
		mergedObj[key] = toggle(oldObj[key], newObj[key]);
	}
	for (let i = 0; i < untouchedKeys.length; i++) {
		let key = untouchedKeys[i];
		mergedObj[key] = oldObj[key];
	}
	for (let i = 0; i < newKeys.length; i++) {
		let key = newKeys[i];
		mergedObj[key] = typeof newObj[key] === 'boolean' ? !oldObj[key] : newObj[key];
	}
	return mergedObj;
}

// Examples:
// let a =	{
// 	a: {
// 		a: {
// 			a: 0,
// 			b: 1
// 		},
// 		b: {
// 			a: 2,
// 			b: 3
// 		}
// 	},
// 	b: {
// 		foo: 'bar'
// 	}
// }
//
// let b = {
// 	a: {
// 		a: {
// 			a: true
// 		}
// 	},
// 	b: {
// 		fizz: 'buzz'
// 	}
// }
//
// Object.assign({}, a, b)
// =>	{
// =>		a: {
// =>			a: {
// =>				a: true
// =>			}
// =>		},
// =>		b: {
// =>			fizz: 'buzz'
// =>		}
// =>	}
//
// merge(a,b)
// =>	{
// =>		a: {
// =>			a: {
// =>				a: true,
// =>				b: 1
// =>			},
// =>			b: {
// =>				a: 2,
// =>				b: 3
// =>			}
// =>		},
// =>		b: {
// =>			foo: 'bar',
// =>			fizz: 'buzz'
// =>		}
// =>	}
//
// prune(a,b)
// =>	{
// =>		a: {
// =>			a: {
// =>				b: 1
// =>			},
// =>			b: {
// =>				a: 2,
// =>				b: 3
// =>			}
// =>		},
// =>		b: {
// =>			foo: 'bar'
// =>		}
// =>	}
//
// toggle(a,b)
// =>	{
// =>		a: {
// =>			a: {
// =>				a: true,
// =>				b: 1
// =>			},
// =>			b: {
// =>				a: 2,
// =>				b: 3
// =>			}
// =>		},
// =>		b: {
// =>			foo: 'bar',
// =>			fizz: 'buzz'
// =>		}
// =>	}
//
// toggle((toggle(a,b), b)
// =>	{
// =>		a: {
// =>			a: {
// =>				a: false,
// =>				b: 1
// =>			},
// =>			b: {
// =>				a: 2,
// =>				b: 3
// =>			}
// =>		},
// =>		b: {
// =>			foo: 'bar',
// =>			fizz: 'buzz'
// =>		}
// =>	}


/*
// cycle detector
function isCyclic(obj) {
	var keys = [];
	var stack = [];
	var stackSet = new Set();
	var detected = false;

	function detect(obj, key) {
		if (typeof obj != 'object') { return; }

		if (stackSet.has(obj)) { // it's cyclic! Print the object and its locations.
			var oldindex = stack.indexOf(obj);
			var l1 = keys.join('.') + '.' + key;
			var l2 = keys.slice(0, oldindex + 1).join('.');
			console.log('CIRCULAR: ' + l1 + ' = ' + l2 + ' = ' + obj);
			console.log({obj});
			detected = true;
			return;
		}

		keys.push(key);
		stack.push(obj);
		stackSet.add(obj);
		for (var k in obj) { //dive on the object's children
			if (obj.hasOwnProperty(k)) { detect(obj[k], k); }
		}

		keys.pop();
		stack.pop();
		stackSet.delete(obj);
		return;
	}

	detect(obj, 'obj');
	return detected;
}
*/