// You'd be surprised how often I need this.
// I hope webpack puts it at top level...

export function nullFunc() { }

// test if we are on a little endian or big endian architecture

export const isLittleEndian = (function () {
	let t16 = new Uint16Array(1);
	let t8 = new Uint8Array(t16.buffer);
	t8[1] = 0xFF;
	return t16[0] === 0xFF00;
})();


// === Color handling ===

import * as colorLUT from './colors';
const {
	category20,
	viridis,
} = colorLUT;

export function getPalette(colorMode) {
	switch (colorMode) {
		case 'Heatmap':
		case 'Flame':
		case 'Bar':
		case 'Box':
		case 'Text':
		case 'Icicle':
			return viridis;
		case 'Categorical':
		case 'Stacked':
			return category20;
		default:
			return [];
	}
}

export function constrain(x, a, b) {
	return x < a ? a :
		x > b ? b :
			x;
}


function blackColor() {
	return 'black';
}

const { log2 } = Math;

export function logProject(x) {
	return x >= 0 ? log2(1 + x) : -log2(1 - x);
}

export function logProjectArray(data) {
	for (let i = 0; i < data.length; i++) {
		let v = data[i];
		data[i] = v > 0 ? log2(1 + v) : -log2(1 - v);
	}
	return data;
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

export function attrToColorFactory(colorAttr, colorMode, settings) {
	settings = settings || {};
	const palette = getPalette(colorMode);
	switch (colorMode) {
		case 'Categorical':
		case 'Stacked':
			let { mostFreq } = colorAttr.colorIndices;
			return (
				(val) => {
					const cIdx = mostFreq[val] | 0;
					return palette[cIdx];
				}
			);
		case 'Heatmap':
		case 'Flame':
		case 'Icicle':
		case 'Box':
		case 'Bar':
		case 'Text':
			let {
				min,
				max,
				clipMin,
				clipMax,
			} = clipRange(colorAttr, settings);
			const isZero = min === 0;

			if (min === max) {
				if (isZero) {
					const c = palette[0];
					return () => { return c; };
				} else {
					const c = palette[1];
					return () => { return c; };
				}
			}

			const clipDelta = (clipMax - clipMin) || 1;
			const maxColor = palette[palette.length - 1];
			if (isZero) { // zero-value is coloured differently
				const minColor = palette[0];
				const colorIdxScale = (palette.length - 1) / clipDelta;
				return settings.logScale ? (
					(val) => {
						val = logProject(val);
						if (val >= clipMax) {
							return maxColor;
						} else if (val <= clipMin) {
							return minColor;
						} else {
							const cIdx = ((val - clipMin) * colorIdxScale) | 0;
							return palette[cIdx];
						}
					}
				) : (
					(val) => {
						if (val >= clipMax) {
							return maxColor;
						} else if (val <= clipMin) {
							return minColor;
						} else {
							const cIdx = ((val - clipMin) * colorIdxScale) | 0;
							return palette[cIdx];
						}
					}
				);
			} else {
				// skip using special color for the zero-value for
				// data ranges that have negative values and/or
				// no zero value
				const minColor = palette[1];
				const colorIdxScale = (palette.length - 2) / clipDelta;
				return settings.logScale ? (
					(val) => {
						val = logProject(val);
						if (val >= clipMax) {
							return maxColor;
						} else if (val <= clipMin) {
							return minColor;
						} else {
							const cIdx = 1 + ((val - clipMin) * colorIdxScale) | 0;
							return palette[cIdx];
						}
					}
				) : (
					(val) => {
						if (val >= clipMax) {
							return maxColor;
						} else if (val < clipMin) {
							return minColor;
						} else {
							const cIdx = 1 + ((val - clipMin) * colorIdxScale) | 0;
							return palette[cIdx];
						}
					}
				);
			}
		default:
			return blackColor;
	}
}

// Again, the returned function is called inside an inner loop, which
// is why we have so much code duplication.
export function attrToColorIndexFactory(colorAttr, colorMode, settings) {
	switch (colorMode) {
		case 'Categorical':
		case 'Stacked':
			let { mostFreq } = colorAttr.colorIndices;
			return (
				(val) => {
					return mostFreq[val] | 0;
				}
			);
		case 'Heatmap':
		case 'Flame':
		case 'Icicle':
		case 'Bar':
		case 'Box':
		case 'Text':
			let {
				min,
				max,
				clipMin,
				clipMax,
			} = clipRange(colorAttr, settings);
			const isZero = min === 0;
			if (min === max) {
				if (isZero) {
					return () => { return 0; };
				} else {
					return () => { return 1; };
				}
			}

			const clipDelta = (clipMax - clipMin) || 1;
			const paletteEnd = getPalette(colorMode).length - 1;
			if (isZero) { // zero-value is coloured differently
				const colorIdxScale = paletteEnd / clipDelta;
				return settings.logScale ? (
					(val) => {
						val = logProject(val);
						if (val >= clipMax) {
							return paletteEnd;
						} else if (val <= clipMin) {
							return 0;
						} else {
							return ((val - clipMin) * colorIdxScale) | 0;
						}
					}
				) : (
					(val) => {
						if (val >= clipMax) {
							return paletteEnd;
						} else if (val <= clipMin) {
							return 0;
						} else {
							return ((val - clipMin) * colorIdxScale) | 0;
						}
					}
				);
			} else {
				// skip using special color for the zero-value for
				// data ranges that have negative values and/or
				// no zero value
				const colorIdxScale = (paletteEnd - 1) / clipDelta;
				return settings.logScale ? (
					(val) => {
						val = logProject(val);
						if (val >= clipMax) {
							return paletteEnd;
						} else if (val <= clipMin) {
							return 1;
						} else {
							return 1 + ((val - clipMin) * colorIdxScale) | 0;
						}
					}
				) : (
					(val) => {
						if (val >= clipMax) {
							return paletteEnd;
						} else if (val <= clipMin) {
							return 1;
						} else {
							return 1 + ((val - clipMin) * colorIdxScale) | 0;
						}
					}
				);
			}
		default:
			return blackColor;
	}
}

// === Maths helper functions ===

/**
 * Crude visual approximation of a normal curve.
 * Returns an array of random values between (-0.5, 0.5)
 */
export function rndNormArray(length) {
	let source = new Uint8Array(Math.min(length * 4, 65536)),
		returnValues = new Float32Array(length);
	window.crypto.getRandomValues(source);
	for (let i = 0; i < length; i++) {
		let i4 = (i * 4) % (source.length - 3);
		returnValues[i] = (source[i4] + source[i4 + 1] - source[i4 + 2] - source[i4 + 3]) * 0.0009765625; // 0.0009765625 = 1 / (4 * 256)
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
		r2[1] < r1[3]    // r2.yMin < r1.yMax
	);
}

/**
 * Returns array of all unique values as `{ val, count }`
 * objects. Sorted by `val`.
 */
export function countElements(array, start, end) {
	start = start > 0 ? start : 0;
	end = end < array.length ? end : array.length;
	// Copy and sort the array. Note that after sorting,
	// undefined values will be at the end of the array!
	let sorted = array.slice(start, end);
	sorted.sort();

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
		while (j - 1024 > start && sorted[j - 1024] === val) { j -= 1024; }
		while (j - 256 > start && sorted[j - 256] === val) { j -= 256; }
		while (j - 64 > start && sorted[j - 64] === val) { j -= 64; }
		while (j - 8 > start && sorted[j - 8] === val) { j -= 8; }
		while (j > start && sorted[j] === val) { j--; }

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
	if (array && start < array.length && end > 0) {
		start = start > 0 ? start : 0;
		end = end < array.length ? end : array.length;
		let i = 0,
			j = 0,
			sorted = array.slice(start, end).sort(),
			val = sorted[i],
			mc = 1;
		mv = val;
		// linearly run through the array, count unique values
		while (val !== null && val !== undefined) {

			// keep going until a different value is found
			while (sorted[j + 1024] === val) { j += 1024; }
			while (sorted[j + 256] === val) { j += 256; }
			while (sorted[j + 64] === val) { j += 64; }
			while (sorted[j + 8] === val) { j += 8; }
			while (sorted[j] === val) { j++; }

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
			if (v < min) { min = v; }
			if (v > max) { max = v; }
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
			if (v < min) { min = v; }
			if (v > max) { max = v; }
			isInt = isInt && v === (v | 0);
		}
	}
	return {
		min,
		max,
		isInt,
	};	// |0 forces to integer value, we can
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
		if (norm < normMin) { normMin = norm; }
		if (norm > normMax) { normMax = norm; }
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


// Convert plain array to object with
// typed/indexed array and metadata
export function convertJSONarray(arr, name) {
	let {
		arrayType,
		data,
		indexedVal,
		uniques,
		colorIndices,
		min,
		max,
	} = arr;

	if (indexedVal) {
		indexedVal.unshift(null);
	}

	const processedData = indexedVal ? Uint8Array.from(data) : arrayConstr(arrayType).from(data);

	const uniqueVal = (uniques.length === 1 && uniques[0].count === data.length) ? data[0] : undefined;

	const allUnique = uniques.length === 0 || uniques.length === data.length;

	return {
		name,
		arrayType,
		indexedVal,
		data: processedData,
		allUnique,
		uniqueVal,
		uniques,
		colorIndices,
		min,
		max,
	};
}

/**
 * Returns the first string in `keyList` that is a key
 * in `obj`. Returns empty string if none are found.
 * @param {object} obj
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

function toLowerCase(key){
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
	let keys = Object.keys(obj),
		keysLowerCase = keys.map(toLowerCase),
		keyListLowerCase = keyList.map(toLowerCase);
	for (let i = 0; i < keyList.length; i++) {
		if (keysLowerCase.indexOf(keyListLowerCase[i]) !== -1) {
			return keys[i];
		}
	}
	return '';
}


/**
 * - `array`: array to be sorted
 * - `compareFunc`: optional comparison callback that will be given
 *   *indices* i and j. This can be used to create callbacks that
 *   do more complex comparisons on objects in the array, and more
 *   importantly *other arrays*
 *   To ensure stability it should always end with `i - j`
 *   as the last sort key.
 *
 * Example:
 *
 *    let array = [
 *      {label: 'b', value: 1},
 *      {label: 'a', value: 1},
 *      {label: 'c', value: 0}
 *    ];
 *    const compareFunc = (i, j) => {
 *      let vi = array[i].value,
 *        vj = array[j].value;
 *      return vi < vj ? -1 :
 *        vi > vj ? 1 :
 *          i - j;
 *    };
 *    sortInPlace(array, compareFunc);
 *    // ==> [
 *    //   {label: "c", value:0},
 *    //   {label: "b", value:1},
 *    //   {label: "a", value:1}
 *    // ]
 *
 * @param {*[]} array
 * @param {{(i:number, j:number)=> number}=} compareFunc
 */
export function sortInPlace(array, compareFunc) {
	return sortFromIndices(array, findIndices(array, compareFunc));
}

/**
 * @param {*[]} array
 * @param {{(i:number, j:number)=> number}=} compareFunc
 * @returns {*[]} sortedArray
 */
export function sortedCopy(array, compareFunc) {
	let indices = findIndices(array, compareFunc);
	let i = array.length;
	// make sure we use the same type of array
	let sortedArray = new Object.getPrototypeOf(array).constructor(i);
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
function makeCompareFunc(array) {
	isTypedArray(array) || typeof array[0] === 'number' ?
		makeNumberCompareFunc(array) :
		makeBaseCompareFunc(array);
}

/**
 * Creates a compare function for sorting a set of *indices*
 * based on lexicographical comparison of the array values.
 * Uses comparisons.
 * @param {*[]} array
 * @returns {{(i:number, j:number)=> number}}
 */
function makeBaseCompareFunc(array) {
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
function makeNumberCompareFunc(array) {
	return (i, j) => {
		return (+array[i]) - (+array[j]) || i - j;
	};
}

/**
 * - `array`: array to find indices for.
 * - `compareFunc`: comparison closure that takes _indices_ i and j,
 *   and compares values at `array[i]` to `array[j]` in some way.
 *   To force stability, use `i - j` as last sort key.
 *
 * Finds the indices of the values that *should* be stored
 * at each array position (that is: `array[i]` should have
 * the value at `array[indices[i]]`).
 *
 * Returns the smallest typed array that can contain all indices
 *
 * Example:
 *
 *    let array = [
 *      {label: 'b', value: 1},
 *      {label: 'a', value: 1},
 *      {label: 'c', value: 0}
 *    ];
 *    const compareFunc = (i, j) => {
 *      let vi = array[i].n, vj = array[j].n;
 *      return vi < vj ? -1 :
 *        vi > vj ? 1 :
 *          i - j;
 *    };
 *    findIndices(array, compareFunc);
 *    // ==> [2, 0, 1]
 *
 * @param {*[]} array
 * @param {{(i:number, j:number)=> number}=} compareFunc
 */
export function findIndices(array, compareFunc) {
	// Assumes we don't have to worry about sorting more than
	// 4 billion elements; uses the smallest fitting typed array
	// for smaller input sizes.
	const indicesConstr = array.length < 256 ?
		Uint8Array :
		array.length < 65535 ?
			Uint16Array :
			Uint32Array;
	let i = array.length,
		indices = new indicesConstr(i);
	// unrolled 16-decrement loop was benchmarked as the fastest
	while (i - 16 > 0) {
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
	}
	while (i--) {
		indices[i] = i;
	}
	if (typeof compareFunc !== 'function') {
		compareFunc = makeCompareFunc(array);
	}
	// after sorting, `indices[i]` gives the index from where
	// `array[i]` should take the value from, so
	// `array[i]` should have the value at `array[indices[i]]`
	return indices.sort(compareFunc);
}

/**
 * - `array`: data to be sorted in-place
 * - `indices`: indices from where the value should _come from_,
 *   that is:  `sorted array[i] = array[indices[i]]`
 *    (`indices` is sorted in-place as a side effect).
 *
 * `indices` must contain each index of `array`, and each
 * index must be present only once! In other words:
 * indices must contain all integers in the range
 * `[0, array.length-1]`.
 *
 * Example:
 *
 *     let array = ['a', 'b', 'c', 'd', 'e' ],
 *       indices = [1, 2, 0, 4, 3]
 *     sortFromIndices(array, indices)
 *     // ==> array: ['b', 'c', 'a', 'e', 'd' ],
 *     //     indices: [0, 1, 2, 3, 4]
 * - in: `['a', 'b', 'c', 'd', 'e' ]`, `[1, 2, 0, 4, 3]`,
 * - out: `['b', 'c', 'a', 'e', 'd' ]`, `[0, 1, 2, 3, 4]`
 *
 * @param {*[]} array
 * @param {number[]} indices
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

export function attrSubset(attr, indices, i0, i1) {
	return arraySubset(attr.data, attr.arrayType, indices, i0, i1);
}

export function attrIndexedSubset(attr, indices, i0, i1) {
	return indexedSubset(attr.data, indices, i0, i1, attr.indexedVal);
}

export function arraySubset(data, arrayType, indices, i0, i1) {
	i0 = i0 || 0;
	i1 = i1 === undefined ? indices.length : i1;
	let i = i0,
		selection = new (arrayConstr(arrayType))(i1 - i0);
	while (i < i1) {
		selection[i - i0] = data[indices[i++]];
	}
	return selection;
}

export function indexedSubset(data, indices, i0, i1, indexedVal) {
	i0 = i0 || 0;
	i1 = i1 === undefined ? indices.length : i1;
	let i = i0,
		selection = new Array(i1 - i0);
	while (i < i1) {
		selection[i - i0] = indexedVal[data[indices[i]]];
		i++;
	}
	return selection;
}

export function extractStringArray(attr) {
	const { data } = attr;
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
	let retVal = [];
	for (let i = 0; i < data.length; i++) {
		const str = indexedVal[data[i]];
		retVal.push(str ? str : '');
	}
	return retVal;
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
	return obj instanceof Array || isTypedArray(obj);
}

export function isTypedArray(obj) {
	return obj instanceof Uint8Array ||
		obj instanceof Float32Array ||
		obj instanceof Uint16Array ||
		obj instanceof Uint32Array ||
		obj instanceof Int32Array ||
		obj instanceof Float64Array ||
		obj instanceof Int8Array ||
		obj instanceof Uint8ClampedArray ||
		obj instanceof Int16Array;
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
 *   recursively merged (except (typed) arrays and `null`)
 * - in all other cases, the value from `newObj` is
 *   assigned to the returned object (including (typed) arrays and `null`).
 *
 * @param {object} oldObj
 * @param {object} newObj
 */
export function merge(oldObj, newObj) {
	if (!(oldObj || newObj)) {
		// if neither are defined, return whatever newObj is
		// (safe, since all falsy values are immutable values)
		return newObj;
	} else if (!oldObj) {
		// we expect a new object (immutability guarantee),
		// so if there is no oldObj, return a copy of newObj
		return Object.assign({}, newObj);
	} else if (!newObj) {
		// we expect a new object (immutability guarantee),
		// so if there is no newObj, return a copy of oldObj
		return Object.assign({}, oldObj);
	}

	let untouchedKeys = Object.keys(oldObj),
		newKeys = Object.keys(newObj),
		overlappingKeys = disjointArrays(untouchedKeys, newKeys),
		mergedObj = {},
		key = '',
		i = overlappingKeys.length;

	while (i--) {
		key = overlappingKeys[i];
		let newVal = newObj[key];
		// merge object values by recursion, otherwise just assign new value
		mergedObj[key] = (
			typeof newVal === 'object' &&
			newVal !== null && // avoid accidentally turning null into {}
			!isArray(newVal)   // typof returns object for arrays
		) ? merge(oldObj[key], newVal) : newVal;
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
export function mergeInPlace(oldObj, newObj) {
	if (!(oldObj || newObj)) {
		return newObj;
	} else if (!oldObj) {
		return Object.assign({}, newObj);
	} else if (!newObj) {
		return oldObj;
	}

	let untouchedKeys = Object.keys(oldObj),
		newKeys = Object.keys(newObj),
		overlappingKeys = disjointArrays(untouchedKeys, newKeys),
		key = '',
		i = overlappingKeys.length;

	while (i--) {
		key = overlappingKeys[i];
		let newVal = newObj[key];
		// merge object values by recursion, otherwise just assign new value
		oldObj[key] = (
			typeof newVal === 'object' &&
			newVal !== null && // avoid accidentally turning null into {}
			!isArray(newVal)   // typof returns object for arrays
		) ? mergeInPlace(oldObj[key], newVal) : newVal;
	}
	i = newKeys.length;
	while (i--) {
		key = newKeys[i];
		oldObj[key] = newObj[key];
	}
	return oldObj;
}

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
			var oldIndex = stack.indexOf(obj);
			var l1 = keys.join('.') + '.' + key;
			var l2 = keys.slice(0, oldIndex + 1).join('.');
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