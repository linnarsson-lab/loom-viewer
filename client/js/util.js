import { radixSortCopy } from './radix-sorts';

// You'd be surprised how often I need this.
// I hope WebPack puts it at top level...

export function nullFunc() {}

// test if we are on a little endian or big endian architecture

export const isLittleEndian = (function () {
	let t16 = new Uint16Array(1);
	let t8 = new Uint8Array(t16.buffer);
	t8[1] = 0xFF;
	return t16[0] === 0xFF00;
})();

/**
 * Constrain input x to min or max
 *
 * @param {Number} x
 * @param {Number} min
 * @param {Number} max
 */
export function constrain(x, min, max) {
	return x < min ? min :
		x > max ? max :
			x;
}

const {
	log2,
} = Math;

export function logProject(x) {
	return x >= 0 ? log2(1 + x) : -log2(1 - x);
}

export function logProjectArray(data) {
	switch (data.constructor) {
		case Float32Array:
			return logProjectF32(data);
		case Float64Array:
			return logProjectF64(data);
		case Int32Array:
			return logProjectI32(data);
		case Int16Array:
			return logProjectI16(data);
		case Int8Array:
			return logProjectI8(data);
		case Uint32Array:
			return logProjectU32(data);
		case Uint16Array:
			return logProjectU16(data);
		case Uint8Array:
			return logProjectU8(data);
		default:
	}
	return logProjectArrayPlain(data);
}

/**
 * @param {Float64Array} data
 */
export function logProjectF64(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

/**
 * @param {Float32Array} data
 */
export function logProjectF32(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

/**
 * @param {Int32Array} data
 */
export function logProjectI32(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

/**
 * @param {Int16Array} data
 */
export function logProjectI16(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

/**
 * @param {Int8Array} data
 */
export function logProjectI8(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

/**
 * @param {Uint32Array} data
 */
export function logProjectU32(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

/**
 * @param {Uint16Array} data
 */
export function logProjectU16(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

/**
 * @param {Uint8Array} data
 */
export function logProjectU8(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

function logProjectArrayPlain(data) {
	let _data = data.slice(0);
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		_data[i] = v < 0 ? -log2(1 - v) : log2(1 + v);
	}
	return _data;
}

export function clipRange(attr, settings) {
	let {
		min,
		max,
	} = attr;
	let {
		lowerBound,
		upperBound,
	} = settings;
	if (lowerBound === undefined) {
		lowerBound = 0;
	}
	if (upperBound === undefined) {
		upperBound = 100;
	}

	if (settings.logScale) {
		min = logProject(min);
		max = logProject(max);
	}

	// boundaries for clipping, only applies to heatmap-like situations
	// anything under lowerBound is "zero",
	// anything above upperBound is "maxColor"
	let clipMin = min;
	let clipMax = max;
	if (settings.clip) {
		const delta = max - min;
		clipMin = min + lowerBound * delta / 100;
		clipMax = min + upperBound * delta / 100;
	}
	return {
		min,
		max,
		clipMin,
		clipMax,
	};
}

// === Maths helper functions ===

/**
 * Crude visual approximation of a normal curve.
 * Returns an array of random values guaranteed to
 * be within (-0.5, 0.5)
 */
export function rndNormArray(length) {
	let source = new Uint32Array(Math.min(length, 16384)),
		returnValues = new Float32Array(length);
	// For large arrays, this is faster than iterating over Math.random()
	// For small arrays, the extra cost doesn't matter.
	for (let i = 0; i < length; i++) {
		if (i % 16384 === 0) {
			window.crypto.getRandomValues(source);
		}
		// we take an 32bit integers,
		// convert them to four 8bit integers
		// add two, subtract the other two,
		// then normalise the result.
		let v = source[i % source.length];
		returnValues[i] = (
			(v >>> 24) + ((v >>> 16) & 0xFF) -
			(((v >>> 8) & 0xFF) + (v & 0xFF))
		) * 0.0009765625; // 0.0009765625	= 1 / (4 * 256)
	}
	return returnValues;
}

// https://blogs.msdn.microsoft.com/jeuge/2005/06/08/bit-fiddling-3/
export function msb(u) {
	if (u < 0x100000000) {
		u |= u >> 1;
		u |= u >> 2;
		u |= u >> 4;
		u |= u >> 8;
		u |= u >> 16;
		u = u - ((u >>> 1) & 0o33333333333) - ((u >>> 2) & 0o11111111111);
		return ((u + (u >>> 3)) & 0o30707070707) % 63;
	}
	return 32 + msb((u / 0x100000000) | 0);
}

export function bitCount(u) {
	if (u < 0x100000000) {
		u = u - ((u >>> 1) & 0o33333333333) - ((u >>> 2) & 0o11111111111);
		return ((u + (u >>> 3)) & 0o30707070707) % 63;
	}
	return bitCount(u & 0xFFFFFFFF) + bitCount((u / 0x100000000) | 0);
}

// expects two number arrays of [xMin, yMin, xMax, yMax].
export function inBounds(r1, r2) {
	return (
		r1[0] < r2[2] && // r1.xMin < r2.xMax
		r2[2] < r1[2] && // r2.xMin < r1.xMax
		r1[1] < r2[3] && // r1.yMin < r2.yMax
		r2[1] < r1[3] // r2.yMin < r1.yMax
	);
}

// The following functions have been replaced with server-side work by Numpy
// Still here for legacy purposes, or in case we ever need to remove
// that Numpy thing aspect.

/**
 * Returns array of all unique values as `{ val, count }`
 * objects. Sorted by `val`.
 */
export function countUniques(array, start, end) {
	start = start > 0 ? start : 0;
	end = end < array.length ? end : array.length;
	// Copy and sort the array. Note that after sorting,
	// undefined values will be at the end of the array!
	let sorted = radixSortCopy(array, start, end);

	// skip undefined elements
	let i = sorted.indexOf(undefined);
	if (i !== -1) {
		end = i;
	}
	i = end - 1;

	// By using a sentinel value we can skip counting the
	// smallest element of the array.
	// Many gene arrays contain mostly zeros, which will
	// be at the front, so this can save a bit of time.
	let val = sorted[i],
		sentinel = sorted[start],
		j = i,
		uniques = [];
	while (val !== sentinel) {
		// keep going until a different value is found
		while (j - 1024 > start && sorted[j - 1024] === val) {
			j -= 1024;
		}
		while (j - 256 > start && sorted[j - 256] === val) {
			j -= 256;
		}
		while (j - 64 > start && sorted[j - 64] === val) {
			j -= 64;
		}
		while (j - 8 > start && sorted[j - 8] === val) {
			j -= 8;
		}
		while (j > start && sorted[j] === val) {
			j--;
		}

		uniques.push({
			val,
			count: i - j,
		});
		i = j;
		val = sorted[j];
	}
	// add skipped first value
	uniques.push({
		val,
		count: j + 1,
	});

	return uniques;
}

export function findMostCommon(array, start, end) {
	let mv;
	if (array) {
		start = start > 0 ? start : 0;
		end = end < array.length ? end : array.length;
		let i = 0,
			j = 0,
			sorted = radixSortCopy(array, start, end),
			val = sorted[i],
			mc = 1;
		mv = val;
		// linearly run through the array, count unique values
		while (val !== null && val !== undefined) {

			// keep going until a different value is found
			while (sorted[j + 1024] === val) {
				j += 1024;
			}
			while (sorted[j + 256] === val) {
				j += 256;
			}
			while (sorted[j + 64] === val) {
				j += 64;
			}
			while (sorted[j + 8] === val) {
				j += 8;
			}
			while (sorted[j] === val) {
				j++;
			}

			if (j - i > mc) {
				mv = val;
				mc = j - i;
			}
			i = j;
			val = sorted[j];
		}
	}
	return mv;
}

// assumes no NaN values!
export function calcMinMax(data, start, end) {
	start = start || 0;
	end = end || data.length;

	let min,
		max;
	let i = end - 1;
	let v = data[i];
	if (typeof v === 'number') {
		min = max = v;
		while (start < i--) {
			v = data[i];
			if (v < min) {
				min = v;
			}
			if (v > max) {
				max = v;
			}
		}
	}
	return {
		min,
		max,
	};
}

/**
 * Tests if all values in an array are integer values
 * and finds min and max values of the array.
 */
export function isIntegerMinMax(array) {
	let min,
		max,
		isInt;
	let i = array.length - 1;
	let v = array[i];
	if (typeof v === 'number') {
		min = max = v;
		isInt = v === (v | 0);
		while (i--) {
			v = array[i];
			if (v < min) {
				min = v;
			}
			if (v > max) {
				max = v;
			}
			isInt = isInt && v === (v | 0);
		}
	}
	return {
		min,
		max,
		isInt,
	}; // |0 forces to integer value, we can
}

export function normalise(array) {
	let data = Float64Array.from(array);
	// sorted summation reduces error
	data.sort();
	let sum = 0,
		i = 0;
	for (; i < data.length; i++) {
		sum += data[i];
	}
	const mean = sum / data.length;
	// sum squared difference
	sum = 0;
	while (i--) {
		const delta = data[i] - mean;
		data[i] = delta;
		sum += delta * delta;
	}
	i = data.length;
	const deviation = sum / i;
	let normMin = Number.MAX_VALUE,
		normMax = Number.MIN_VALUE;
	while (i--) {
		let norm = data[i] / deviation;
		if (norm < normMin) {
			normMin = norm;
		}
		if (norm > normMax) {
			normMax = norm;
		}
		data[i] = norm;
	}
	return {
		data,

		mean,

		deviation,

		normMin,

		normMax,
	};
}

// === Metadata Arrays ===
// Instead of plain arrays, we wrap the data from our attributes
// and genes in an object containing useful metadata about them.
// This includes array type (typed arrays are much faster
// to use, and we also have a special format for indexed strings)
// to which attribute and dataset the data belongs, min and max
// value, which twenty values are most common, by how much,
// whether they are filtered, and a color indices LUT matching
// these common values

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


// Convert plain array to object with
// typed/indexed array and metadata
export function convertJSONarray(arr, name) {
	let {
		arrayType,
		data,
		indexedVal,
		uniques,
		min,
		max,
	} = arr;

	if (indexedVal) {
		indexedVal.unshift(null);
	}

	const processedData = indexedVal ? Uint8Array.from(data) : arrayConstr(arrayType).from(data);

	const uniqueVal = (uniques.length === 1 && uniques[0].count === data.length) ? data[0] : undefined;

	const allUnique = uniques.length === 0 || uniques.length === data.length;

	let uniquesColor = {};

	for (let i = 0; i < uniques.length; i++) {
		uniquesColor[uniques[i].val] = i;
	}

	const colorIndices = {
		uniques: uniquesColor,
	};

	return {
		allUnique,
		arrayType,
		colorIndices,
		data: processedData,
		indexedVal,
		max,
		min,
		name,
		uniqueVal,
		uniques,
	};
}

/**
 * Adds a custom `toJSON()` function so that `attrs`
 * - shows only the first three elements of `data` and `unique`
 * - shows Typed Arrays as arrays, instead of key/val objects
 * @param {*} attr
 */
export function reduxAttrToJSON(attr){
	const  {
		data,
		uniques,
	} = attr;
	const reduxJSON = {
		allUnique: attr.allUnique,
		arrayType: attr.arrayType,
		colorIndices: attr.colorIndices,
		name: attr.name,
		data: Array.from(data.slice(0, Math.min(3, data.length))),
		data_length: `${data.length} items`,
		indexedVal: attr.indexedVal,
		max: attr.max,
		min: attr.min,
		total_uniques: `${uniques.length} items`,
		uniqueVal: attr.uniqueVal,
		uniques: uniques.slice(0, Math.min(3, uniques.length)),
	};
	attr.toJSON = () => {
		return reduxJSON;
	};
}

/**
 * Returns the first string in `keyList` that is a key
 * in `obj`. Returns empty string if none are found.
 * @param {*} obj
 * @param {string[]} keyList
 */
export function firstMatchingKey(obj, keyList) {
	for (let i = 0; i < keyList.length; i++) {
		if (obj[keyList[i]]) {
			return keyList[i];
		}
	}
	return '';
}

function toLowerCase(key) {
	return key.toLowerCase();
}

/**
 * Returns the first key in `keyList` that matches a key
 * in `obj`, case insensitive, i.e. if `keyList` contains
 * `'a'`, and the matching key in `obj` is `'A'`, then
 * the returned key is `'A'`.
 *
 * Returns empty string if no matches are found.
 * @param {object} obj
 * @param {string[]} keyList
 */
export function firstMatchingKeyCaseInsensitive(obj, keyList) {
	let keys = Object.keys(obj);
	let keysLowerCase = keys.map(toLowerCase),
		keyListLowerCase = keyList.map(toLowerCase);
	for (let i = 0; i < keyList.length; i++) {
		let j = keysLowerCase.indexOf(keyListLowerCase[i]);
		if (j !== -1) {
			return keys[j];
		}
	}
	return '';
}

/**
 * Returns a list of all pairs in `keyList` with
 * keys in `obj`.
 *
 * Returns empty array if no matches are found.
 * @param {object} obj
 * @param {string[][]} keyPairList
 */
export function allMatchingPairs(obj, keyPairList){
	let matchingPairs = [];
	for(let i = 0; i < keyPairList.length; i++){
		let pair = keyPairList[i];
		if(obj[pair[0]] !== undefined && obj[pair[1]] !== undefined){
			matchingPairs.push(pair);
		}
	}
	return matchingPairs;
}

function toLowerCasePair(pair) {
	return [pair[0].toLowerCase(), pair[1].toLowerCase()];
}

/**
 * Returns a list of all pairs in `keyList` with
 * keys in `obj`. Case insensitive search, returns
 * actual object keys.
 *
 * Returns empty array if no matches are found.
 * @param {object} obj
 * @param {string[][]} keyPairList
 */
export function allMatchingPairsCaseInsensitive(obj, keyPairList){
	const keys = Object.keys(obj);

	const keysLC = keys.map(toLowerCase),
		keyPairListLC = keyPairList.map(toLowerCasePair);

	let matchingPairs = [];

	for(let i = 0; i < keyPairList.length; i++){
		let pair = keyPairListLC[i],
			index0 = keysLC.indexOf(pair[0]),
			index1 = keysLC.indexOf(pair[1]);
		if (index0 !== -1 && index1 !== -1){
			matchingPairs.push([keys[index0], keys[index1]]);
		}
	}
	return matchingPairs;
}


export function generateIndices(length) {
	// I don't think we have to worry about ever
	// have more than 4294967296 elements,
	// since single Float64Array would be over 32 gigabytes.
	let indices = new Uint32Array(length);

	// unrolled 16-decrement loop was benchmarked as the fastest option on the slowest browser supported.
	// https://run.perf.zone/view/initiating-indices-for-vs-while-loop-plain-unrolled-16-and-unrolled-32-1516713346278
	while (length - 16 > 0) {
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
		indices[--length] = length;
	}
	while (length--) {
		indices[length] = length;
	}
	return indices;
}

/**
 * For a given selection of indices, returns the indices not selected
 *
 * @param {Uint32Array} ascendingIndices selected indices, sorted in ascending order,
 * @param {number} totalIndices a number indicating total indices.
 * @returns {Uint32Array} a sorted Uint32Array of the indices not selected.
 */
export function generateExcludedIndices(ascendingIndices, totalIndices) {
	let otherIndices = new Uint32Array(totalIndices - ascendingIndices.length);
	for (let i = 0, j = 0, k = 0; i < totalIndices; i++) {
		const iNext = j < ascendingIndices.length ? ascendingIndices[j++] : totalIndices;
		while (i < iNext) {
			otherIndices[i - k] = i++;
		}
		k++;
	}
	return otherIndices;
}

/**
 * - `array`: array to be sorted
 * - `compareFunc`: optional comparison callback that will be given
 *   *indices* i and j. This can be used to create callbacks that
 *   do more complex comparisons on objects in the array, and
 *   more importantly *other arrays as well*.
 *
 *   `compareFunc` should always end with `i - j`
 *   as the last sort key, as this will ensure a stable sort.
 *
 * Example:
 *
 *		let array = [
 *			{label: 'b', value: 1},
 *			{label: 'a', value: 1},
 *			{label: 'c', value: 0}
 *		];
 *		const compareFunc = (i, j) => {
 *			let vi = array[i].value,
 *				vj = array[j].value;
 *			return vi < vj ? -1 :
 *				vi > vj ? 1 :
 *					i - j;
 *		};
 *		sortInPlace(array, compareFunc);
 *		// ==> [
 *		//	 {label: "c", value:0},
 *		//	 {label: "b", value:1},
 *		//	 {label: "a", value:1}
 *		// ]
 *
 * @param {*[]} array
 * @param {{(i:number, j:number)=> number}=} compareFunc
 */
export function sortInPlace(array, compareFunc) {
	return sortFromIndices(array, findSourceIndices(array, compareFunc));
}

/**
 * @param {*[]} array
 * @param {{(i:number, j:number)=> number}=} compareFunc
 * @returns {*[]} sortedArray
 */
export function sortedCopy(array, compareFunc) {
	let indices = findSourceIndices(array, compareFunc);
	let i = array.length;
	// make sure we use the same type of array
	let sortedArray = new (Object.getPrototypeOf(array)).constructor(i);
	// unrolled 16-decrement loop was benchmarked
	// as the fastest way to copy data over.
	while (i - 16 > 0) {
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
		sortedArray[--i] = array[indices[i]];
	}
	while (i--) {
		sortedArray[i] = array[indices[i]];
	}
	return sortedArray;
}

/**
 * Creates a compare function for sorting a set of *indices*
 * based on lexicographical comparison of the array values.
 * @param {*[]} array
 * @returns {{(i:number, j:number)=> number}}
 */
function makeSourceCompareFunc(array) {
	isTypedArray(array) || typeof array[0] === 'number' ?
		makeSourceNumberFunc(array) :
		makeSourceAnyFunc(array);
}

/**
 * Creates a compare function for sorting a set of *indices*
 * based on lexicographical comparison of the array values.
 * Therefore, elements in array must be have sensible output
 * for greater than/smaller than operations.
 * @param {*[]} array
 * @returns {{(i:number, j:number)=> number}}
 */
function makeSourceAnyFunc(array) {
	return (i, j) => {
		let vi = array[i],
			vj = array[j];
		return vi < vj ?
			-1 :
			vi > vj ?
				1 :
				i - j; // the part that makes this a stable sort
	};
}

/**
 * Creates a compare function for sorting a set of *indices*
 * based on lexicographical comparison of the array values.
 * Uses subtraction, expects passed array to contain only numbers
 * @param {*[]} array
 * @returns {{(i:number, j:number)=> number}}
 */
function makeSourceNumberFunc(array) {
	return (i, j) => {
		return (+array[i]) - (+array[j]) || i - j;
	};
}

/**
 * - `array`: array to find indices for.
 * - `compareFunc`: comparison closure that takes _indices_ i and j,
 *	 and compares values at `array[i]` to `array[j]` in some way.
 *	 Suggestion: use `i - j` as last sort key for a stable sort.
 *	 If `array` contains only strings, or only numbers, `compareFunc`
 *	 is optional.
 *
 * For a given `array` and `compareFunc`, `findSourceIndices`
 * returns a `Uint32Array` with indices such that the following
 * would result in a sorted array:
 *
 *		let array2 = []
 *		for(let i = 0; i < array.length; i++){
 *			array2.push(array[indices[i]])
 *		}
 *
 * Example:
 *
 *		const data = [
 *			{label: 'd', v: 0},
 *			{label: 'b', v: 1},
 *			{label: 'a', v: 1},
 *			{label: 'c', v: 0}
 *		];
 *
 *		const compareFunc = (i, j) => {
 *			const vDelta = data[i].v - data[j].v,
 *				li = data[i].label,
 *				lj = data[j].label;
 *
 *			return (
 *				vDelta !== 0 ? vDelta :
 *				 li < lj ? -1 :
 *					 li > lj ? 1 :
 *						 i - j
 *			);
 *		};
 *
 *		const indices = findSourceIndices(compareFunc);
 *		// ==> [3, 0, 2, 1]
 *
 *		const sortedData = data.map((_, i) => {
 *			return data[indices[i]];
 *		});
 *		// ==> [
 *		//			 {label: 'd', v: 0},
 *		//			 {label: 'b', v: 1},
 *		//			 {label: 'a', v: 1},
 *		//			 {label: 'c', v: 0}
 *		//		 ];
 *
 * @param {*[]} array
 * @param {{(i:number, j:number)=> number}=} compareFunc
 */
export function findSourceIndices(array, compareFunc) {
	let indices = generateIndices(array.length);
	if (typeof compareFunc !== 'function') {
		compareFunc = makeSourceCompareFunc(array);
	}
	// after sorting, `indices[i]` gives the index from where
	// `array[i]` should take the value from, so
	// `array[i]` should have the value at `array[indices[i]]`
	return indices.sort(compareFunc);
}

/**
 * Almost identical to `findSourceIndices`, except that
 * the returned indices are ordered such that the following
 * results in an ordered array:
 *
 *		let array2 = new Array(array1.length)
 *		for(let i = 0; i < array.length; i++){
 *			array2[indices[i] = array[i];
 *		}
 * @param {*} array
 * @param {*} compareFunc
 */
export function findTargetIndices(array, compareFunc) {
	let sourceIndices = findSourceIndices(array, compareFunc),
		i = sourceIndices.length,
		targetIndices = Uint32Array(i);

	while (i - 16 > 0) {
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
		targetIndices[sourceIndices[--i]] = i;
	}

	while (i--) {
		targetIndices[sourceIndices[--i]] = i;
	}
	return targetIndices;
}

/**
 * - `array`: data to be sorted in-place
 * - `indices`: indices from where the value should _come from_,
 *	 that is:	`sorted array[i] = array[indices[i]]`
 *		(`indices` is sorted in-place as a side effect).
 *
 * `indices` must contain each index of `array`, and each
 * index must be present only once! In other words:
 * indices must contain all integers in the range
 * `[0, array.length-1]`.
 *
 * Example:
 *
 *		 let array = ['a', 'b', 'c', 'd', 'e' ],
 *			 indices = [1, 2, 0, 4, 3]
 *		 sortFromIndices(array, indices)
 *		 // ==> array: ['b', 'c', 'a', 'e', 'd' ],
 *		 //		 indices: [0, 1, 2, 3, 4]
 * - in: `['a', 'b', 'c', 'd', 'e' ]`, `[1, 2, 0, 4, 3]`,
 * - out: `['b', 'c', 'a', 'e', 'd' ]`, `[0, 1, 2, 3, 4]`
 *
 * @param {*[]} array
 * @param {Uint32Array} indices
 */
export function sortFromIndices(array, indices) {
	switch (array.constructor) {
		case Uint8Array:
			return sortFromIndicesU8(array, indices);
		case Uint32Array:
			return sortFromIndicesU32(array, indices);
		default:
	}
	return sortFromIndicesArray(array, indices);
}

function sortFromIndicesArray(array, indices) {
	// there might be multiple cycles, so we must
	// walk through the whole array to check
	let k = array.length;
	while (k--) {
		// advance until we find a value in
		// the "wrong" position
		if (k !== indices[k]) {
			// create vacancy to use "half-swaps" trick
			// Thank you Andrei Alexandrescu :)
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
			// the array and update indices
			array[i] = v0;
			indices[i] = i;
		}
	}
	return array;
}

function sortFromIndicesU8(array, indices) {
	// there might be multiple cycles, so we must
	// walk through the whole array to check
	let k = array.length;
	while (k--) {
		// advance until we find a value in
		// the "wrong" position
		if (k !== indices[k]) {
			// create vacancy to use "half-swaps" trick
			// Thank you Andrei Alexandrescu :)
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
			// the array and update indices
			array[i] = v0;
			indices[i] = i;
		}
	}
	return array;
}

function sortFromIndicesU32(array, indices) {
	// there might be multiple cycles, so we must
	// walk through the whole array to check
	let k = array.length;
	while (k--) {
		// advance until we find a value in
		// the "wrong" position
		if (k !== indices[k]) {
			// create vacancy to use "half-swaps" trick
			// Thank you Andrei Alexandrescu :)
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
			// the array and update indices
			array[i] = v0;
			indices[i] = i;
		}
	}
	return array;
}

/**
 * Like `sortFromIndices`, except that it treats
 * each step of two as "one" block.
 * @param {number[]} array
 * @param {number[]} indices
 */
export function sortBlock2FromIndices(array, indices) {
	// there might be multiple cycles, so we must
	// walk through the whole array to check
	let k = array.length;
	while (k--) {
		// advance until we find a value in
		// the "wrong" position
		if (k !== indices[k]) {
			// create vacancy to use "half-swaps" trick
			// Thank you Andrei Alexandrescu :)
			let v0 = array[k << 1];
			let v1 = array[(k << 1) + 1];
			let i = k;
			let j = indices[k];
			while (j !== k) {
				// shuffle value around
				array[i << 1] = array[j << 1];
				array[(i << 1) + 1] = array[(j << 1) + 1];
				// array[i] is now in the correct position,
				// update indices[i] to reflect this
				indices[i] = i;
				// go to next index
				i = j;
				j = indices[j];
			}
			// put original array[k] back in
			// the array and update indices
			array[i << 1] = v0;
			array[(i << 1) + 1] = v1;
			indices[i] = i;
		}
	}
	return array;
}

// === Array Subset ===

/**
 * arraySubset can and will be called by many different
 * types of arrays. In such situations, JS engines are
 * likely to permanently de-opt it.
 * By making a separate sub-function for each data type,
 * the sub-functions stay type stable (a.k.a. monomorphic).
 * So while arraySubset will be de-opted, the sub-function
 * are likely to remain performant.
 *
 * 2018/02/08: This has been confirmed in practice with
 * a large loom file. Previously, a stackedCategoriesChart
 * would take take multiple frames to render. With this
 * approach, it renders multiple charts per frame.
 * (no precise measurement necessary, this was visible by
 * eyeballing on both Firefox and Chrome)
 * This suggests similar optimisations may improve the
 * performance inside the plotters themselves too, actually.
 */

export function attrSubset(attr, indices, i0, i1) {
	return arraySubset(attr.data, attr.data.constructor, indices, i0, i1);
}

export function arraySubset(data, constructor, indices, i0, i1) {
	constructor = constructor || data.constructor;
	if (!indices) {
		return constructor.from(data);
	}
	i0 = i0 || 0;
	i1 = i1 === undefined ? indices.length : i1;
	switch (constructor) {
		case Float32Array:
			// We coerce to F32 arrays quite often inside the scatter plot,
			// so we differentiate both input and output types.
			// For other array types,	we only make subsets equal to
			// the input type (so far).
			let selection = new Float32Array(i1 - i0);
			switch (data.constructor) {
				case Float32Array:
					return arraySubsetF32_F32(data, selection, indices, i0, i1);
				case Float64Array:
					return arraySubsetF32_F64(data, selection, indices, i0, i1);
				case Int32Array:
					return arraySubsetF32_I32(data, selection, indices, i0, i1);
				case Int16Array:
					return arraySubsetF32_I16(data, selection, indices, i0, i1);
				case Int8Array:
					return arraySubsetF32_I8(data, selection, indices, i0, i1);
				case Uint32Array:
					return arraySubsetF32_U32(data, selection, indices, i0, i1);
				case Uint16Array:
					return arraySubsetF32_U16(data, selection, indices, i0, i1);
				case Uint8Array:
					return arraySubsetF32_U8(data, selection, indices, i0, i1);
				default:
			}
			return arraySubsetF32_Array(data, selection, indices, i0, i1);
		case Float64Array:
			return arraySubsetF64(data, indices, i0, i1);
		case Int32Array:
			return arraySubsetI32(data, indices, i0, i1);
		case Int16Array:
			return arraySubsetI16(data, indices, i0, i1);
		case Int8Array:
			return arraySubsetI8(data, indices, i0, i1);
		case Uint32Array:
			return arraySubsetU32(data, indices, i0, i1);
		case Uint16Array:
			return arraySubsetU16(data, indices, i0, i1);
		case Uint8Array:
			return arraySubsetU8(data, indices, i0, i1);
		default:
	}
	return arraySubsetPlain(data, indices, i0, i1);
}

function arraySubsetF32_F32(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF32_F64(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF32_I32(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF32_U32(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF32_I16(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF32_U16(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF32_I8(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF32_U8(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF32_Array(data, selection, indices, i0, i1) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetF64(data, indices, i0, i1) {
	let selection = new Float64Array(i1 - i0);
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetI32(data, indices, i0, i1) {
	let selection = new Int32Array(i1 - i0);
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetI16(data, indices, i0, i1) {
	let selection = new Int16Array(i1 - i0);
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetI8(data, indices, i0, i1) {
	let selection = new Int8Array(i1 - i0);
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetU32(data, indices, i0, i1) {
	let selection = new Uint32Array(i1 - i0);
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetU16(data, indices, i0, i1) {
	let selection = new Uint16Array(i1 - i0);
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetU8(data, indices, i0, i1) {
	let selection = new Uint8Array(i1 - i0);
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

function arraySubsetPlain(data, indices, i0, i1) {
	let selection = new Array(i1 - i0);
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = data[indices[i]];
	}
	return selection;
}

export function attrIndexedSubset(attr, indices, i0, i1) {
	return indexedSubset(attr.data, indices, i0, i1, attr.indexedVal, attr.uniqueVal);
}

export function indexedSubset(data, indices, i0, i1, indexedVal, uniqueVal) {
	i0 = i0 || 0;
	i1 = i1 === undefined ? indices.length : i1;
	let selection = new Array(i1 - i0);
	if (uniqueVal || indexedVal === undefined) {
		uniqueVal = uniqueVal !== undefined ? uniqueVal : '';
		for (let i = 0; i < selection.length; i++) {
			selection[i] = uniqueVal;
		}
	} else {
		switch (data.constructor) {
			case Float64Array:
				indexedSubsetF64(data, selection, indices, i0, i1, indexedVal);
				break;
			case Float32Array:
				indexedSubsetF32(data, selection, indices, i0, i1, indexedVal);
				break;
			case Int32Array:
				indexedSubsetI32(data, selection, indices, i0, i1, indexedVal);
				break;
			case Int16Array:
				indexedSubsetI16(data, selection, indices, i0, i1, indexedVal);
				break;
			case Int8Array:
				indexedSubsetI8(data, selection, indices, i0, i1, indexedVal);
				break;
			case Uint32Array:
				indexedSubsetU32(data, selection, indices, i0, i1, indexedVal);
				break;
			case Uint16Array:
				indexedSubsetU16(data, selection, indices, i0, i1, indexedVal);
				break;
			case Uint8Array:
				indexedSubsetU8(data, selection, indices, i0, i1, indexedVal);
				break;
			default:
				indexedSubsetPlain(data, selection, indices, i0, i1, indexedVal);
		}
	}
	return selection;
}

function indexedSubsetF64(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

function indexedSubsetF32(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

function indexedSubsetI32(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

function indexedSubsetI16(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

function indexedSubsetI8(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

function indexedSubsetU32(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

function indexedSubsetU16(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

function indexedSubsetU8(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

function indexedSubsetPlain(data, selection, indices, i0, i1, indexedVal) {
	for (let i = i0; i < i1; i++) {
		selection[i - i0] = indexedVal[data[indices[i]]];
	}
}

/**
 * Convert an indexed string array to plain string array
 * @param {*} attr
 */
export function extractStringArray(attr) {
	// We do not need to type-switch, since
	// all indexed arrays are Uint8Arrays.
	const {
		data,
	} = attr;
	if (attr.arrayType === 'string') {
		if (attr.indexedVal) {
			return indexedToStringArray(data, attr.indexedVal);
		} else {
			let retArray = [];
			for (let i = 0; i < data.length; i++) {
				// make sure the returned strings are not 'undefined' or 'null'
				const str = data[i];
				retArray.push(str !== undefined || str !== null ? str : '');
			}
			return retArray;
		}
	} else {
		let retArray = [];
		for (let i = 0; i < data.length; i++) {
			// make sure the returned strings are not 'undefined' or 'null'
			const str = data[i];
			retArray.push(str !== undefined || str !== null ? str + '' : '');
		}
		return retArray;
	}
}

export function indexedToStringArray(data, indexedVal) {
	let retVal = new Array(data.length);
	for (let i = 0; i < data.length; i++) {
		const str = indexedVal[data[i]];
		retVal[i] = str ? str : '';
	}
	return retVal;
}

// checks if an object is an array or typed array
export function isArray(obj) {
	return obj && (obj.constructor === Array || isTypedArray(obj));
}

// benchmarked as significantly faster than instanceof
// https://run.perf.zone/view/isTypedArray-constructor-vs-instanceof-1519140393812
export function isTypedArray(obj) {
	switch (obj && obj.constructor) {
		case Uint8Array:
		case Float32Array:
		case Uint16Array:
		case Uint32Array:
		case Int32Array:
		case Float64Array:
		case Int8Array:
		case Uint8ClampedArray:
		case Int16Array:
			return true;
		default:
			return false;
	}
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
 * array contains duplicates, the matching duplicates
 * will be put in the returned array, and the rest in
 * will remain in the original arrays.
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
	let overlap = [],
		i = a.length;
	while (i--) {
		let aVal = a[i];
		let j = b.length;
		while (j--) {
			let bVal = b[j];
			if (aVal === bVal) {
				overlap.push(aVal);
				a[i] = a[a.length - 1];
				a.pop();
				b[j] = b[b.length - 1];
				b.pop();
				break;
			}
		}
	}
	return overlap;
}

/**
 * * Returns `{ keys: string[], inObject: number[] }`
 *
 * `keys` is the set of total keys, returned as an array
 * of sorted strings. `inObject` is an array of numbers
 * that are either 0, -1 or 1, representing "in both",
 * "in obj1", and "in obj2" respectively.
 *
 * The reason we to sort is to maximise consistent property
 * order when merging two objects, which should lead to
 * more identical hidden classes, which is something
 * JavaScript engines like when it comes to optimisation.
 *
 * See also: https://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order/38218582#38218582
 * http://mp.binaervarianz.de/fse2015.pdf, (figure six)

 * Example:
 *
let a = {
	xa: 0,
	ya: 0,
	both: 'this is in both',
};

let b = {
	xb: 0,
	yb: 0,
	both: 'this is in both',
};
 *
 *		 sortedOverlap(a, b);
 *		 // ==> {
 *		 //	 keys: ['both', 'xa', 'xb', 'ya', 'yb'],
 *		 //	 in: [0, -1, 1, -1, 1],
 *		 // };
 *
 * @param {*} obj1
 * @param {*} obj2
 * @returns {{ keys: string[], inObject: number[]}}
 */
export function sortedOverlap(obj1, obj2) {
	let keys = [],
		inObject = [];
	if (
		obj1 !== null &&
		obj1 !== undefined &&
		obj2 !== null &&
		obj2 !== undefined
	) {
		let firstKeys = Object.keys(obj1).sort(),
			secondKeys = Object.keys(obj2).sort();
		for (let i = 0, j = 0; i < firstKeys.length || j < secondKeys.length;) {
			let ki = firstKeys[i],
				kj = secondKeys[j],
				inObjectValue = (ki < kj || ki && kj === undefined) ? -1 : (ki > kj || ki === undefined && kj) ? 1 : 0;
			switch (inObjectValue) {
				case 0:
					j++;
				case -1:
					i++;
					break;
				case 1:
					ki = kj;
					j++;
			}
			keys.push(ki);
			inObject.push(inObjectValue);
		}
	}
	return {
		keys,
		inObject,
	};
}


/**
 * `oldObj` and `newObj` must be plain objects.
 * Returns a new object that merges the values of
 * `newObj` into `oldObj`. Uses shallow copying.
 *
 * **WARNING: Do NOT pass cyclical objects!
 * This includes React nodes!**
 *
 * **IMPORTANT:** util.merge does **NOT** behave like
 * lodash merge! *TL;DR:* (typed) arrays are not merged
 * but replaced by the newer array.
 *
 * - for duplicate keys, values that are objects are
 *	 recursively merged (except (typed) arrays and `null`)
 * - in all other cases, the value from `newObj` is
 *	 assigned to the returned object (including (typed) arrays and `null`).
 *
 * @param {object} oldObj
 * @param {object} newObj
 */
export function merge(oldObj, newObj) {
	if (newObj === undefined) {
		return oldObj;
	} else if (oldObj === undefined ||
		oldObj === null ||
		newObj === null ||
		oldObj.constructor !== Object ||
		newObj.constructor !== Object
	) {
		return newObj;
	}

	const {
		keys,
		inObject,
	} = sortedOverlap(oldObj, newObj);
	let mergedObj = {};
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i],
			t = inObject[i];
		mergedObj[key] = t < 0 ?
			oldObj[key] : t > 0 ?
				newObj[key] : merge(oldObj[key], newObj[key]);
	}
	return mergedObj;
}

/**
 * Like `merge`, but overwrites `oldObj` instead of creating
 * a new one.
 *
 * For guaranteed immutability, stick to `merge` and never
 * directly assign.
 * @param {object} oldObj - original object to be merged into
 * @param {object} newObj - new object to merge into oldObj
 */
export function mergeInPlace(oldObj, newObj) {
	if (newObj === undefined) {
		return oldObj;
	} else if (oldObj === undefined ||
		oldObj === null ||
		newObj === null ||
		oldObj.constructor !== Object ||
		newObj.constructor !== Object
	) {
		return newObj;
	}

	const {
		keys,
		inObject,
	} = sortedOverlap(oldObj, newObj);
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i],
			t = inObject[i];
		oldObj[key] = t < 0 ? oldObj[key] :
			t > 0 ? newObj[key] :
				mergeInPlace(oldObj[key], newObj[key]);
	}
	return oldObj;
}

/**
 * Recursively copies objects via iterating over sorted
 * keys of `obj`. Returns a naive deep copy of the object,
 * except that enumerables other than plain Objects will be copied
 * by reference. So (typed) arrays, Maps, Sets, etc.
 *
 * Will initiate all properties by sorted key order, for more
 * consistent hidden classes.
 * @param {*} obj
 * @returns {*}
 */
export function sortedDeepCopy(obj) {
	if (obj && obj.constructor === Object) {
		const keys = Object.keys(obj).sort();
		let copy = {};
		for (let i = 0; i < keys.length; i++) {
			let k = keys[i],
				v = obj[k];
			copy[k] = (v && v.constructor === Object) ?
				sortedDeepCopy(v) : v;
		}
		return copy;
	}
	return obj;
}

/**
 * Returns a new object that purges the leaves of
 * `purgeTree` from `oldObj`, by virtue of not copying.
 * Uses shallow copying where possible.
 *
 * **WARNING: Do NOT pass cyclical objects!
 * This includes React nodes!**
 *
 * - keys that only exist in `oldObj` are preserved
 * - for duplicate keys, values that are objects
 *	 (except (typed) arrays and `null`) are
 *	 recursively merged.
 * - in all other cases, the overlapping value
 *	 represents a leaf, and the matching key/value
 *	 pair is *not* copied over to the returned object.
 *
 * @param {object} oldObj
 * @param {object} purgeTree
 */
export function purge(oldObj, purgeTree) {
	if (!(oldObj && purgeTree)) {
		// we expect a new object (immutability guarantee),
		// so if either aren't defined, return a copy of oldObj
		return Object.assign({}, oldObj);
	}

	let untouchedKeys = Object.keys(oldObj),
		purgeKeys = Object.keys(purgeTree),
		overlappingKeys = disjointArrays(untouchedKeys, purgeKeys),
		purgedObj = {},
		key = '',
		i = overlappingKeys.length;

	while (i--) {
		key = overlappingKeys[i];
		let purgeVal = purgeTree[key];
		// navigate purgeTree by recursion
		if (
			typeof purgeVal === 'object' &&
			!isArray(purgeVal) && // typof returns object for arrays
			purgeVal !== null // null represents values to be purged, not recursed on
		) {
			let val = purge(oldObj[key], purgeVal);
			if (val !== undefined) {
				purgedObj[key] = val;
			}
		}
	}
	// directly assign all values that don't need purging
	i = untouchedKeys.length;
	while (i--) {
		key = untouchedKeys[i];
		purgedObj[key] = oldObj[key];
	}
	return Object.keys(purgedObj).length ? purgedObj : undefined;
}


// cycle detector
export function isCyclic(object) {
	let keys = [];
	let stack = [];
	let stackSet = new Set();
	let detected = false;

	const detect = (obj, key) => {
		if (typeof obj !== 'object') {
			return;
		}

		if (stackSet.has(obj)) { // it's cyclic! Print the object and its locations.
			let oldIndex = stack.indexOf(obj);
			let l1 = keys.join('.') + '.' + key;
			let l2 = keys.slice(0, oldIndex + 1).join('.');
			console.log('CIRCULAR: ' + l1 + ' = ' + l2 + ' = ' + obj);
			console.log({
				obj,
			});
			detected = true;
			return;
		}

		keys.push(key);
		stack.push(obj);
		stackSet.add(obj);
		for (let k in obj) { // dive on the object's children
			if (obj.hasOwnProperty(k)) {
				detect(obj[k], k);
			}
		}

		keys.pop();
		stack.pop();
		stackSet.delete(obj);
		return;
	};

	detect(object, 'obj');
	return detected;
}

/*
function percentage(old_val, error_old, new_val, error_new){
	let closest = 100 * (new_val * 100 / (100 + error_new)) / (old_val * 100 / (100 - error_old)) - 100;
	let furthest = 100 * (new_val * 100 / (100 - error_new)) / (old_val * 100 / (100 + error_old)) - 100;
	let avg = 100 * new_val / old_val - 100;
	console.log({avg, closest, furthest});
}
*/