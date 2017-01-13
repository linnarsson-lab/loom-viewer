/**
 * Crude normal curve approximation by taking the average of 8 random values.
 * Returns random value between [-0.5, 0.5)
 */
export function rndNorm() {
	return ((Math.random() + Math.random() + Math.random() + Math.random() +
		Math.random() + Math.random() + Math.random() + Math.random()) - 4) * 0.125;
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
				a.val < b.val ? -1 : 1;
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

// assumes no NaN values!
export function calcMinMax(data, ignoreZeros) {
	let min, max, hasZeros;
	if (typeof data[0] === 'number') {
		if (ignoreZeros) {
			let i = 0;
			while (data[i] === 0) { i++; }
			min = data[i];
			max = data[i];
			hasZeros = i > 0;
			while (i < data.length) {
				const v = data[i];
				if (v) {
					min = min < v ? min : v;
					max = max > v ? max : v;
				}
				hasZeros = hasZeros || v === 0;
				i++;
			}
		} else {
			min = data[0];
			max = data[0];
			for (let i = 1; i < data.length; i++) {
				const v = data[i];
				min = min < v ? min : v;
				max = max > v ? max : v;
				hasZeros = hasZeros || v === 0;
			}
		}
	}
	return { min, max, hasZeros };
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
	let array = { name };
	let uniques = countElements(data);
	if (uniques.length === 1) {
		array.uniqueVal = uniques[0].val;
	} else {
		array.uniques = uniques;
		// Convert arrays to compact (possibly indexed) format

		// Data is either a string or a number; assumes no
		// invalid input is given here (no objects, arrays,
		// and so on)
		array.arrayType = (typeof data[0]) === 'number' ? 'number' : 'string';

		if (array.arrayType === 'number') {
			// Test whether values are actually integers,
			// if so convert to typed integer arrays.
			array.arrayType = isInteger(data) ? 'integer' : 'float32';
		}

		// For our plotters we often need to know the dynamic
		// range for non-zero values, but also need to know
		// if zero-values are present. We also use this information
		// to determine integer size, so we pre-calc this.
		const { min, max, hasZeros } = calcMinMax(data, true);
		array.min = min;
		array.max = max;
		array.hasZeros = hasZeros;

		// convert number values to typed arrays matching the schema,
		// and string arrays with few unique values to indexedString
		switch (array.arrayType) {
			case 'float32':
				// the only way to force to Float32 is using a 
				// typed Float32Array. So we do that first,
				// and see if any information gets truncated
				// If so, we'll use doubles instead.
				array.data = Float32Array.from(data);
				for (let i = 0; i < data.length; i++) {
					if (array.data[i] !== data[i]) {
						array.arrayType = 'float64';
						break;
					}
				}
				if (array.arrayType === 'float64') {
					array.data = Float64Array.from(data);
					array.filteredData = Float64Array.from(array.data);
				} else {
					array.filteredData = Float32Array.from(array.data);
				}
				break;
			case 'integer':
				// convert to most compact integer representation
				// for better performance.
				if (min >= 0) {
					if (max < 256) {
						array.data = Uint8Array.from(data);
						array.filteredData = Uint8Array.from(array.data);
						array.arrayType = 'uint8';
					} else if (max < 65535) {
						array.data = Uint16Array.from(data);
						array.filteredData = Uint16Array.from(array.data);
						array.arrayType = 'uint16';
					} else {
						array.data = Uint32Array.from(data);
						array.filteredData = Uint32Array.from(array.data);
						array.arrayType = 'uint32';
					}
				} else if (min > -128 && max < 128) {
					array.data = Int8Array.from(data);
					array.filteredData = Int8Array.from(array.data);
					array.arrayType = 'int8';
				} else if (min > -32769 && max < 32768) {
					array.data = Int16Array.from(data);
					array.filteredData = Int16Array.from(array.data);
					array.arrayType = 'int16';
				} else {
					array.data = Int32Array.from(data);
					array.filteredData = Int32Array.from(array.data);
					array.arrayType = 'int32';
				}
				break;
			case 'string':
			default:
				// in case of string arrays, we assume they represent
				// categories when plotted as x/y attributes. For this
				// we need to set min/max to the number of unique categories
				array.min = 0;
				array.max = array.uniques.length-1;

				// convert to indexed form if fewer than 256 unique strings
				array.data = data;
				if (uniques.length < 256) {
					array = convertToIndexed(array);
					uniques = array.uniques;
					break;
				} else {
					array.filteredData = Array.from(data);
				}
				array.hasZeros = true;
				break;
		}

		// We set filtered flags after conversion, 
		// in case array.uniques had to be updated for indexedData
		for (let i = 0; i < array.uniques.length; i++) {
			array.uniques[i].filtered = false;
		}

		// create lookup table to convert attribute values
		// to color indices (so a look-up table for finding
		// indices for another lookup table).
		array.colorIndices = {
			mostFreq: {},
			max: {},
		};

		uniques.sort((a, b) => {
			return (
				a.count < b.count ? -1 :
					a.count > b.count ? 1 :
						a.val < b.val ? -1 : 1
			);
		});
		for (let i = 0; i < 20 && i < uniques.length; i++) {
			array.colorIndices.mostFreq[uniques[i].val] = i;
		}

		uniques.sort((a, b) => {
			return (
				a.val < b.val ? -1 : 1
			);
		});
		for (let i = 0; i < 20 && i < uniques.length; i++) {
			array.colorIndices.max[uniques[i].val] = i;
		}
	}
	return array;
}


/**
 * - `array`: array to be sorted
 * - `comparator`: comparison closure that takes *indices* i and j,
 *   and compares `array[i]` to `array[j]` in some way, but always
 *   ending with `i - j` as the last comparison to force stability.
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

export function stableSortedCopy(array, comparator){
	let indices = findIndices(array, comparator);
	let sortedArray = [];
	for (let i = 0; i < array.length; i++){
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
export function findIndices(array, comparator){
	// Assumes we don't have to worry about sorting more than 
	// 4 billion elements; if you know the upper bounds of your
	// input you could replace it with a smaller typed array
	let indices = new Uint32Array(array.length);
	for (let i = 0; i < indices.length; i++) {
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
 * For correct input, `indices` will be sorted afterwards,
 * `[ 0, 1, ... array.length-1 ]`.
 * 
 * Example:
 * - in: `['a', 'b', 'c', 'd', 'e' ]`, `[1, 2, 0, 4, 3]`,
 * - out: `['b', 'c', 'a', 'e', 'd' ]`, `[0, 1, 2, 3, 4]`
 */
export function sortFromIndices(array, indices) {
	// there might be multiple cycles, so we must
	// walk through the whole array to check
	for (let k = 0; k < array.length; k++) {
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

/** 
 * Tests if all values in an array are integer values
*/
export function isInteger(array) {
	// |0 forces to integer value, we can
	//  then compare strict equality
	let i = 0;
	while (array[i] === (array[i] | 0)) { ++i; }
	// if i === array.length, the while loop
	// must have gone through the whole array,
	// so all values are integer numbers
	return i === array.length;
}

// Using indexed strings can be much faster, since Uint8Arrays
// are smaller, remove pointer indirection, and allow
// for quicker comparisons than strings.
export function convertToIndexed(mdArray) {
	let un = mdArray.uniques.slice(0);
	let data = mdArray.data;
	// sort uniques by most frequent, so
	// the indices grow from most to least
	// common
	un.sort((a, b) => {
		return (
			a.count > b.count ? -1 :
				a.count < b.count ? 1 :
					a.val < b.val ? -1 : 1
		);
	});

	// Store original values
	let indexedVal = [];
	for (let i = 0; i < un.length; i++) {
		indexedVal.push(un[i].val);
	}
	mdArray.indexedVal = indexedVal;

	// Create array of index values
	let indexedData = new Uint8Array(data.length);
	for (let j = 0; j < data.length; j++) {
		for (let i = 0; i < indexedVal.length; i++) {
			if (data[j] === indexedVal[i]) {
				indexedData[j] = i;
			}
		}
	}
	mdArray.data = indexedData;

	mdArray.filteredData = Uint8Array.from(indexedData);
	mdArray.hasZeros = false;
	mdArray.min = 0;
	mdArray.max = un.length-1;
	mdArray.uniques = countElements(indexedData);
	return mdArray;
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
* *Again: (typed) arrays are not merged but replaced
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
				untouchedKey = untouchedKeys[untouchedKeys.length - 1];
				untouchedKeys[i--] = untouchedKey; // So we don't skip a key
				untouchedKeys.pop();
				// We only need to merge the value if it is an object, 
				// otherwise we overwrite it with the value from
				// the new object (as if it is a new key/value pair).
				let val = newObj[newKey];
				if (typeof val === 'object' && !isArray(val)) {
					overlappingKeys.push(newKey);
					newKey = newKeys[newKeys.length - 1];
					newKeys[j] = newKey;
					newKeys.pop();
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
				// check if we need to recurse or delete
				let val = delTree[delKey];
				if (val === 0 || typeof val === 'object' && !Array.isArray(val)) {
					sourceKeys[j] = sourceKeys[sourceKeys.length - 1];
					sourceKey = sourceKeys.pop();
					if (val) { subKeys.push(delKey); }
				}
				break;
			}
		}
	}

	let prunedObj = {};
	// copy all values that aren't pruned
	for (let i = 0; i < sourceKeys.length; i++) {
		let key = sourceKeys[i];
		prunedObj[key] = sourceTree[key];
	}
	// recurse on all subtrees
	for (let i = 0; i < subKeys.length; i++) {
		let key = subKeys[i];
		prunedObj[key] = prune(sourceTree[key], delTree[key]);
	}
	// don't return prunedObj if it is empty
	return prunedObj;
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