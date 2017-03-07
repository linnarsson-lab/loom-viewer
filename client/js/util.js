/**
 * Crude normal curve approximation by taking the average of 8 random values.
 * Returns random value between [-0.5, 0.5)
 */
const { random } = Math;
export function rndNorm() {
	return (random() + random() - random() - random()) * 0.25;
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
	let i = 0, j = 0, sorted = array.slice(0).sort(),
		val = sorted[i], uniques = [];
	while (val !== undefined) {
		// keep going until a different value is found
		while (sorted[++j] === val) { }
		uniques.push({ val, count: j - i });
		i = j;
		val = sorted[j];
	}
	return uniques;
}

export function findMostCommon(array) {
	let i = 0, j = 0, sorted = array.slice(0).sort(),
		val = sorted[i], values = [], count = [];
	// linearly run through the array, count unique values
	while (val !== undefined) {
		// keep going until a different value is found
		while (sorted[++j] === val) { }
		values.push(val);
		count.push(j - i);
		i = j;
		val = sorted[j];
	}

	i = count.length;
	let mc = count[i - 1], mv = values[i - 1];
	while (i--) {
		j = count[i];
		if (j > mc) {
			mc = j;
			mv = values[i];
		}
	}
	return mv;
}

// assumes no NaN values!
export function calcMinMax(data) {
	let min, max;
	let i = data.length - 1;
	let v = data[i];
	if (typeof v === 'number') {
		min = max = v;
		while (i--) {
			const v = data[i];
			min = min < v ? min : v;
			max = max > v ? max : v;
		}
	}
	return { min, max };
}

/**
 * Tests if all values in an array are integer values
*/
export function isInteger(array) {
	// |0 forces to integer value, we can
	//  then compare strict equality
	let i = array.length;
	while (i-- && array[i] === (array[i] | 0)) { }
	// if i === 0, the while loop
	// must have gone through the whole array,
	// so all values are integer numbers
	return i === 0;
}

/**
 * Tests if all values in an array are integer values
 * and finds min and max values of the array.
*/
export function isIntegerMinMax(array) {
	let min, max, isInt;
	let i = array.length - 1;
	let v = array[i];
	if (typeof v === 'number') {
		min = max = v;
		isInt = v === (v | 0);
		while (i--) {
			const v = array[i];
			if (v < min) { min = v; }
			if (v > max) { max = v; }
			isInt = isInt && v === (v | 0);
		}
	}
	return { min, max, isInt };	// |0 forces to integer value, we can
}


// === Metadata Arrays ===
// Instead of plain arrays, we wrap the data from our attributes
// and genes in an object containing useful metadata about them.
// This includes array type (typed arrays are much faster
// to use, and we also have a special format for indexed strings)
// to which attribute and dataset the data belongs, if the array
// has zeros, min and max value excluding zeros, which twenty
// values are most common, by how much, whether they are filtered,
// and a color indices LUT matching these common values


// Convert plain array to object with
// typed/indexed array and metadata
export function convertArray(data, name) {
	let uniques = countElements(data);
	if (uniques.length === 1) {
		return convertUnique(data, name, uniques, uniques[0].val);
	} else {
		return convertWholeArray(data, name, uniques);
	}
}

function convertWholeArray(data, name, uniques) {
	// Data is either a string or a number; assumes no
	// invalid input is given here (no objects, arrays,
	// and so on)
	let arrayType = (typeof data[0]) === 'number' ? 'number' : 'string';

	// For our plotters we often need to know the dynamic range
	// for non-zero values. If all values are integers, we can
	// also use this information to convert to smaller types
	let { min, max, isInt } = isIntegerMinMax(data);

	// convert number values to typed arrays matching the schema,
	// and string arrays with few unique values to indexedString
	let indexedVal;
	switch (arrayType) {
		case 'number':
			if (isInt) {
				// convert to most compact integer representation
				// for better performance.
				if (min >= 0) {
					if (max < 256) {
						arrayType = 'uint8';
					} else if (max < 65535) {
						arrayType = 'uint16';
					} else {
						arrayType = 'uint32';
					}
				} else if (min > -128 && max < 128) {
					arrayType = 'int8';
				} else if (min > -32769 && max < 32768) {
					arrayType = 'int16';
				} else {
					arrayType = 'int32';
				}
			} else {
				arrayType = 'float32';
			}
			data = arrayConstr(arrayType).from(data);
			break;
		case 'string':
		default:
			// in case of string arrays, we assume they represent
			// categories when plotted as x/y attributes. For this
			// we need to set min/max to the number of unique categories
			min = 0;
			max = uniques.length - 1;

			// convert to indexed form if fewer than 256 unique strings
			// Using indexed strings can be much faster, since Uint8Arrays
			// are smaller, remove pointer indirection, and allow
			// for quicker comparisons than strings.
			if (uniques.length < 256) {
				// sort by least frequent, see below
				uniques.sort((a, b) => {
					return (
						a.count < b.count ? -1 :
							a.count > b.count ? 1 :
								a.val < b.val ? -1 : 1
					);
				});
				// Store original values, with zero value as null
				indexedVal = [null];
				let i = uniques.length;
				while (i--) {
					indexedVal.push(uniques[i].val);
				}

				// Create array of index values
				let indexedData = new Uint8Array(data.length);
				let j = data.length;
				while (j--) {
					const dataVal = data[j];
					i = indexedVal.length;
					// because we sorted earlier, we tend to
					// leave this loop as early as possible.
					while (i-- && dataVal !== indexedVal[i]) { }
					// indexedVal.length - i, so that the most
					// common values have the smallest indices
					indexedData[j] = indexedVal.length - i;
				}
				data = indexedData;
				uniques = countElements(data);
				min = 1;
				max = uniques.length;
				break;
			}
			break;
	}

	// We set filtered flags after conversion,
	// in case array.uniques had to be updated for indexedData
	let i = uniques.length;
	while (i--) {
		uniques[i].filtered = false;
	}


	// create lookup table to convert attribute values
	// to color indices (so a look-up table for finding
	// indices for another lookup table).
	// Use an array if possible for faster lookup
	let colorIndices = (arrayType.startsWith('uint') || indexedVal !== null) ? (
		colorIndicesArray(uniques, data)
	) : colorIndicesDict(uniques, data);

	return {
		arrayType,
		data,
		indexedVal,
		uniques,
		colorIndices,
		min,
		max,
	};
}

// Split into separate function so mostFreq and max are type stable
function colorIndicesArray(uniques, data) {
	let mostFreq = [], max = [];

	uniques.sort((a, b) => {
		return (
			a.val > b.val ? -1 : 1
		);
	});
	for (let i = 0; i < 20 && i < uniques.length; i++) {
		max[uniques[i].val] = i + 1;
	}

	// if every value is unique, we keep the sort-by-max order
	if (uniques.length < data.length) {
		uniques.sort((a, b) => {
			return (
				a.count > b.count ? -1 :
					a.count < b.count ? 1 :
						a.val < b.val ? -1 : 1
			);
		});
	}

	for (let i = 0; i < 20 && i < uniques.length; i++) {
		mostFreq[uniques[i].val] = i + 1;
	}
	return { mostFreq, max };
}

function colorIndicesDict(uniques, data) {
	let mostFreq = {}, max = {};

	uniques.sort((a, b) => {
		return (
			a.val > b.val ? -1 : 1
		);
	});
	for (let i = 0; i < 20 && i < uniques.length; i++) {
		max[uniques[i].val] = i + 1;
	}

	if (uniques.length < data.length) {
		uniques.sort((a, b) => {
			return (
				a.count > b.count ? -1 :
					a.count < b.count ? 1 :
						a.val < b.val ? -1 : 1
			);
		});
	}

	for (let i = 0; i < 20 && i < uniques.length; i++) {
		mostFreq[uniques[i].val] = i + 1;
	}
	return { mostFreq, max };

}

// if we know all values are the same,
// we can convert the array much easier
function convertUnique(data, name, uniques, uniqueVal) {
	let arrayType = (typeof uniqueVal) === 'number' ? 'number' : 'string';

	if (arrayType === 'number') {
		arrayType = uniqueVal === (uniqueVal | 0) ? 'integer' : 'float32';
	}

	let min = uniqueVal,
		max = uniqueVal;
	let indexedVal;
	if (arrayType === 'string') {
		indexedVal = [null, uniqueVal];
		data = new Uint8Array(data.length).fill(1);
		uniques[0].val = 1;
		min = 1;
		max = 1;
	} else { // No, this is not an else-if bug
		if (arrayType === 'integer') {
			if (min >= 0) {
				if (max < 256) {
					arrayType = 'uint8';
				} else if (max < 65535) {
					arrayType = 'uint16';
				} else {
					arrayType = 'uint32';
				}
			} else if (min > -128 && max < 128) {
				arrayType = 'int8';
			} else if (min > -32769 && max < 32768) {
				arrayType = 'int16';
			} else {
				arrayType = 'int32';
			}
		} else {
			arrayType = 'float32';
		}
		let arrayCon = arrayConstr(arrayType);
		data = new arrayCon(data.length).fill(uniqueVal);
	}


	let colorIndices = (arrayType.startsWith('uint') || indexedVal !== null) ? ({
		mostFreq: [],
		max: [],
		min: [],
	}) : ({
		mostFreq: {},
		max: {},
		min: {},
	});
	colorIndices.mostFreq[data[0]] = 1;
	colorIndices.max[data[0]] = 1;
	colorIndices.min[data[0]] = 1;

	uniques[0].filtered = false;

	return {
		arrayType,
		data,
		indexedVal,
		uniques,
		uniqueVal,
		colorIndices,
		min,
		max,
	};
}

/**
 * - `array`: array to be sorted
 * - `comparator`: comparison closure that takes *indices* i and j,
 *   and compares `array[i]` to `array[j]`. To ensure stability, it
 *   should always end with `i - j` as the last comparison .
 *
 * Example:
 * ```
 *  let array = [{n: 1, s: "b"}, {n: 1, s: "a"}, {n:0, s: "a"}];
 *  let comparator = (i, j) => {
 *    let vi = array[i].n, vj = array[j].n;
 *    return vi < vj ? -1 :
 *      vi > vj ? 1 :
 *        i - j;
 *  };
 *  stableSortInPlace(array, comparator);
 *  // ==> [{n:0, s: "a"}, {n:1, s: "b"}, {n:1, s: "a"}]
 * ```
 */
export function stableSortInPlace(array, comparator) {
	return sortFromIndices(array, findIndices(array, comparator));
}

export function stableSortedCopy(array, comparator) {
	let indices = findIndices(array, comparator);
	let sortedArray = [];
	for (let i = 0; i < array.length; i++) {
		sortedArray.push(array[indices[i]]);
	}
	return sortedArray;
}

/**
 * Finds the index of the value that *should* be stored
 * at each array position (that is: `array[i]` should have
 * the value at `array[indices[i]]`)
 *
 * - `array`: array to find indices for.
 * - `comparator`: comparison closure that takes *index* i and j,
 *   and compares values at `array[i]` to `array[j]` in some way.
 *   To force stability, end comparison chain with with `i - j`.
 *
 * Example:
 * ```
 *  let array = [{n: 1, s: "b"}, {n: 1, s: "a"}, {n:0, s: "a"}];
 *  let comparator = (i, j) => {
 *    let vi = array[i].n, vj = array[j].n;
 *    return vi < vj ? -1 :
 *      vi > vj ? 1 :
 *        i - j;
 *  };
 *  findIndices(array, comparator);
 *  // ==> [2, 0, 1]
 * ```
 */
export function findIndices(array, comparator) {
	// Assumes we don't have to worry about sorting more than
	// 4 billion elements; if you know the upper bounds of your
	// input you could replace it with a smaller typed array
	let indices = new Uint32Array(array.length), i = indices.length;
	while (i--) {
		indices[i] = i;
	}
	// after sorting, `indices[i]` gives the index from where
	// `array[i]` should take the value from, so
	// `array[i]` should have the value at `array[indices[i]]`
	return indices.sort(comparator);
}

/**
 * - `array`: array to be sorted
 * - `indices`: array of indices from where the value should *come from*,
 * that is: `array[i] = array[indices[i]]` (of course, this naive
 * assignment would destroy the value at `array[i]`, hence this function)
 *
 * **Important:** `indices` must contain each index of `array`, and each
 * index must be present only once! In other words: indices may only
 * contain integers in the range `[0, array.length-1]`.
 *
 * This function does *not* check for valid input!
 *
 * Mutates `indices`. For correct input, it will be sorted afterwards,
 * as `[ 0, 1, ... array.length-1 ]`.
 *
 * Example:
 * - in: `['a', 'b', 'c', 'd', 'e' ]`, `[1, 2, 0, 4, 3]`,
 * - out: `['b', 'c', 'a', 'e', 'd' ]`, `[0, 1, 2, 3, 4]`
 */
export function sortFromIndices(array, indices) {
	// there might be multiple cycles, so we must
	// walk through the whole array to check
	let k = array.length;
	while (k--) {
		// advance until we find a value in
		// the "wrong" position
		if (k !== indices[k]) {
			// create vacancy to use "half-swaps" trick
			// Thank you Andrei Alexandrescu
			let v0 = array[k];
			let i = k;
			let j = indices[k];
			while (j !== k) {
				// shuffle value around
				array[i] = array[j];
				// array[i] is now in the correct position,
				// update indices[i] to reflect this
				indices[i] = i;
				// go to next index
				i = j;
				j = indices[j];
			}
			// put original array[k] back in
			// and update indices
			array[i] = v0;
			indices[i] = i;
		}
	}
	return array;
}

export function arrayConstr(arrayType) {
	switch (arrayType) {
		case 'float32':
			return Float32Array;
		case 'number':
		case 'float64':
			return Float64Array;
		case 'integer':
		case 'int32':
			return Int32Array;
		case 'int16':
			return Int16Array;
		case 'int8':
			return Int8Array;
		case 'uint32':
			return Uint32Array;
		case 'uint16':
			return Uint16Array;
		case 'uint8':
			return Uint8Array;
		default:
	}
	return Array;
}

// checks if an object is an array or typed array
// not for our objects that encapsulate typed arrays
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
 * Takes arrays `a` and `b`.
 * Returns an array containing overlapping values, and
 * mutates `a` and `b` such that they only contain their
 * non-overlapping values. If there are any overlapping
 * values, `a` and `b` might change order. If either
 * array contains duplicates, this function will only
 * only find the number of matching duplicates
 * Example:
 * - in: a = `[1, 2, 2, 3]`, b = `[2, 3, 4, 5, 6]`
 * - out: `[2, 3]`; a = `[1, 2]`, b = `[5, 6, 4]`
 * @param {x[]} a - will be mutated
 * @param {x[]} b - will be mutated
 * @returns {x[]} overlap - overlapping values
 */
export function disjointArrays(a, b) {
	// Having the larger array in the inner loop should
	// be a little bit faster (less loop initialisations)
	if (b.length < a.length) {
		let t = a;
		a = b;
		b = t;
	}
	let overlap = [], i = a.length;
	while (i--) {
		let aval = a[i];
		let j = b.length;
		while (j--) {
			let bval = b[j];
			if (aval === bval) {
				overlap.push(aval);
				a[i] = a[a.length - 1]; a.pop();
				b[j] = b[b.length - 1]; b.pop();
				break;
			}
		}
	}
	return overlap;
}

/**
 * Returns a new object that merges the values of
 * `newObj` into `oldObj`. Uses shallow copying.
 *
 * **IMPORTANT:** util.merge does **NOT** behave like
 * lodash merge!
 *
 * - for duplicate keys, values that are objects
 * (but not (typed) arrays) are recursively merged.
 * - in all other cases, the value from `newObj` is
 * assigned to the resulting object.
 *
 * **TL;DR:** (typed) arrays are not merged but replaced
 * by the newer array!
 * @param {object} oldObj
 * @param {object} newObj
 */
export function merge(oldObj, newObj) {
	if (!oldObj) {
		return Object.assign({}, newObj);
	} else if (!newObj) {
		return oldObj;
	}
	let untouchedKeys = Object.keys(oldObj);
	let newKeys = Object.keys(newObj);
	let overlappingKeys = disjointArrays(untouchedKeys, newKeys);

	let mergedObj = {}, key = '', i = overlappingKeys.length;
	while (i--) {
		key = overlappingKeys[i];
		let newVal = newObj[key];
		// merge object values by recursion, otherwise just assign new value
		mergedObj[key] = (typeof newVal === 'object' && !isArray(newVal)) ?
			merge(oldObj[key], newVal) : newVal;
	}
	// directly assign all values that don't need merging
	i = untouchedKeys.length;
	while (i--) {
		key = untouchedKeys[i];
		mergedObj[key] = oldObj[key];
	}
	i = newKeys.length;
	while (i--) {
		key = newKeys[i];
		mergedObj[key] = newObj[key];
	}
	return mergedObj;
}

/**
 * Like `merge`, but overwrites `oldObj` instead of creating
 * a new one.
 * @param {object} oldObj - original object to be merged into
 * @param {object} newObj - new object to merge into oldObj
 */
export function mergeInplace(oldObj, newObj) {
	if (!oldObj) {
		return Object.assign({}, newObj);
	} else if (!newObj) {
		return oldObj;
	}
	let untouchedKeys = Object.keys(oldObj);
	let newKeys = Object.keys(newObj);
	let overlappingKeys = disjointArrays(untouchedKeys, newKeys);

	let key = '', i = overlappingKeys.length;
	while (i--) {
		key = overlappingKeys[i];
		let newVal = newObj[key];
		// merge object values by recursion, otherwise just assign new value
		oldObj[key] = (typeof newVal === 'object' && !isArray(newVal)) ?
			mergeInplace(oldObj[key], newVal) : newVal;
	}
	i = newKeys.length;
	while (i--) {
		key = newKeys[i];
		oldObj[key] = newObj[key];
	}
	return oldObj;
}

/**
* Similar to `util.merge`, but for "deleting" fields from trees
* Produces a new object, with leaves of `delTree` that are marked
* with 0 pruned out of `sourceTree` (by virtue of not copying).
* - `sourceTree` is the pre-existing state, assumed
*   to be an object structured like a tree.
* - `delTree` should be a tree where the values
*   are either subtrees (objects) that matching
*   the structure of `sourceTree`, or a leaf with 0
*   to mark a field for pruning. Anything else is
*   ignored (and thus, does not affect the structure
*   of the sourceTree)
*/
// export function prune(sourceTree, delTree) {
// 	if (!sourceTree) {
// 		// we might be trying to recursively
// 		// prune on a non-existent node in
// 		// sourceTree
// 		return undefined;
// 	} else if (!delTree) {
// 		return sourceTree;
// 	}
// 	let sourceKeys = Object.keys(sourceTree);
// 	let delKeys = Object.keys(delTree);
// 	let subKeys = [];
// 	for (let i = 0; i < delKeys.length; i++) {
// 		let delKey = delKeys[i];
// 		for (let j = 0; j < sourceKeys.length; j++) {
// 			let sourceKey = sourceKeys[j];
// 			if (sourceKey === delKey) {
// 				// check if we need to recurse or delete
// 				let val = delTree[delKey];
// 				if (val === 0 || typeof val === 'object' && !Array.isArray(val)) {
// 					sourceKeys[j] = sourceKeys[sourceKeys.length - 1];
// 					sourceKey = sourceKeys.pop();
// 					if (val) { subKeys.push(delKey); }
// 				}
// 				break;
// 			}
// 		}
// 	}

// 	let prunedObj = {};
// 	// copy all values that aren't pruned
// 	for (let i = 0; i < sourceKeys.length; i++) {
// 		let key = sourceKeys[i];
// 		prunedObj[key] = sourceTree[key];
// 	}
// 	// recurse on all subtrees
// 	for (let i = 0; i < subKeys.length; i++) {
// 		let key = subKeys[i];
// 		prunedObj[key] = prune(sourceTree[key], delTree[key]);
// 	}
// 	// don't return prunedObj if it is empty
// 	return prunedObj;
// }

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
