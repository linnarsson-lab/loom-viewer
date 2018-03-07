/*
By Job van der Zwan, CC0 2017

Inspired by Malte Skarupke's ska_sort[0], I wanted to see if
radixSort sort is also faster in JavaScript. For TypedArrays
this seems to be the case.

I hope that for the typed arrays at least, this speed boost is temporary:
with the right algorithm, the built-in sort should be able to be faster
than these, due to better memory access and other reductions in overhead.

PS: Skarupke mentions other radixSort sort implementations implementing a
Uint32 radixSort sort that makes three passes in 10-11-11 bit chunks. I have
implemented and tested this[1], but it turns out to be even slower than
the built-in version. Probably due to the large count buffer needed.

[0] https://probablydance.com/2016/12/27/i-wrote-a-faster-sorting-algorithm/
*/
// Needed for radixSortFloat64
// import {
// 	isLittleEndian,
// } from 'js/util';

// 256 buckets, up to 4 bytes each (32 bit values)
const count32 = new Uint32Array(256 * 4),
	count16 = new Uint16Array(count32.buffer, 0, 256 * 4),
	c2 = 256 * 1,
	c3 = 256 * 2,
	c4 = 256 * 3;

let sortCopyCacheU32 = new Uint32Array(32),
	sortCopyCacheI32 = new Int32Array(sortCopyCacheU32.buffer),
	sortCopyCacheU16 = new Uint16Array(32),
	sortCopyCacheI16 = new Int16Array(sortCopyCacheU16.buffer);

function fitSortCopyCache32(length) {
	if (length > sortCopyCacheU32.length) {
		sortCopyCacheU32 = new Uint32Array(length);
		sortCopyCacheI32 = new Int32Array(sortCopyCacheU32.buffer);
	}
}

function fitSortCopyCache16(length) {
	if (length > sortCopyCacheU16.length) {
		sortCopyCacheU16 = new Uint16Array(length);
		sortCopyCacheI16 = new Int16Array(sortCopyCacheU16.buffer);
	}
}

/**
 * ================================
 * === Uint8Array and Int8Array ===
 * ================================
 */

/**
 * Expects Uint8Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Uint8Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Uint8Array} input
 */
export function radixU8(input, start, end) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;

	if (end < (1 << 16)) {
		return radixU8_16(input, start, end);
	} else {
		return radixU8_32(input, start, end);
	}
}

function radixU8_16(input, start, end) {
	// Count number of occurrences of each byte value
	count16.fill(0, 0, 256);
	for (let i = start; i < end; i++) {
		count16[input[i] & 0xFF]++;
	}
	// Convert count to cumulative sum of counts.
	// This lets us directly copy values to their
	// correct position later. Add starting offset first.
	count16[0] += start;
	for (let i = 1; i < 256; i++) {
		count16[i] += count16[i - 1];
	}
	// Set range of values to final value
	for (let i = 0, iStart = start, iEnd = 0; i < 256; i++) {
		iEnd = count16[i];
		for (let j = iStart; j < iEnd; j++) {
			input[j] = i;
		}
		iStart = iEnd;
	}
	return input;
}

function radixU8_32(input, start, end) {
	// Same as above, but for arrays 65k or longer
	count32.fill(0, 0, 256);
	for (let i = start; i < end; i++) {
		count32[input[i] & 0xFF]++;
	}
	count32[0] += start;
	for (let i = 1; i < 256; i++) {
		count32[i] += count32[i - 1];
	}
	for (let i = 0, iStart = start, iEnd = 0; i < 256; i++) {
		iEnd = count32[i];
		for (let j = iStart; j < iEnd; j++) {
			input[j] = i;
		}
		iStart = iEnd;
	}
	return input;
}

/**
 * Expects Uint8Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns a sorted copy of the input array.
 * @param {Uint8Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Uint8Array} input
 */
export function radixU8Copy(input, start, end) {
	return radixU8(input.slice(0), start, end);
}

/**
 * Expects Int8Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Int8Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Int8Array}
 */
export function radixI8(input, start, end) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;

	if (end < (1 << 16)) {
		radixI8_16(input, start, end);
	} else {
		radixI8_32(input, start, end);

	}
	return input;
}

function radixI8_16(input, start, end) {
	// Count number of occurrences of each byte value
	count16.fill(0, 0, 256);
	for (let i = start; i < end; i++) {
		count16[(input[i] + 128) & 0xFF]++;
	}
	// Convert count to cumulative sum of counts.
	// This lets us directly copy values to their
	// correct position later. Add starting offset first.
	count16[0] += start;
	for (let i = 1; i < 256; i++) {
		count16[i] += count16[i - 1];
	}
	// Set range of values to final value
	for (let i = 0, iStart = start, iEnd = 0, iVal = 0; i < 256; i++) {
		iEnd = count16[i];
		iVal = i - 128;
		for (let j = iStart; j < iEnd; j++) {
			input[j] = iVal;
		}
		iStart = iEnd;
	}
}


function radixI8_32(input, start, end) {
	// Same as above, but for arrays 65k or longer
	count32.fill(0, 0, 256);
	for (let i = start; i < end; i++) {
		count32[(input[i] + 128) & 0xFF]++;
	}
	count32[0] += start;
	for (let i = 1; i < 256; i++) {
		count32[i] += count32[i - 1];
	}
	for (let i = 0, iStart = start, iEnd = 0, iVal = 0; i < 256; i++) {
		iEnd = count32[i];
		iVal = i - 128;
		for (let j = iStart; j < iEnd; j++) {
			input[j] = iVal;
		}
		iStart = iEnd;
	}
}

/**
 * Expects 8-bit unsigned integers. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns a sorted copy of the input array.
 * @param {Int8Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Int8Array}
 */
export function radixI8Copy(input, start, end) {
	return radixI8(input.slice(0), start, end);
}

/**
 * ==================================
 * === Uint16Array and Int16Array ===
 * ==================================
 */

/**
 * Expects Uint16Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Uint16Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Uint16Array} input
 */
export function radixU16(input, start, end) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	const length = end - start;
	fitSortCopyCache16(length);
	if (length < (1 << 16)) {
		return radixU16_16(input, start, end);
	} else {
		return radixU16_32(input, start, end);
	}
}

/**
 * Sub-procedure used by both `radixU16_16` and `radixI16_16`
 *
 * Convert count to cumulative sum of previous counts.
 * This lets us directly copy values to their
 * correct position later.
 */
function radix16_sum16() {
	for (let j = 0; j < 2; j++) {
		const iStart = (j << 8),
			iEnd = ((j + 1) << 8);
		for (let i = iStart, v = 0, sum = 0; i < iEnd; i++) {
			v = count16[i];
			count16[i++] = sum;
			sum += v;
			v = count16[i];
			count16[i++] = sum;
			sum += v;
			v = count16[i];
			count16[i++] = sum;
			sum += v;
			v = count16[i];
			count16[i] = sum;
			sum += v;
		}
	}
}

/**
 * Sub-procedure used by both `radixU16_32` and `radixI16_32`
 *
 * Convert count to cumulative sum of previous counts.
 * This lets us directly copy values to their
 * correct position later.
 */
function radix16_sum32() {
	for (let j = 0; j < 2; j++) {
		const iStart = (j << 8),
			iEnd = ((j + 1) << 8);
		for (let i = iStart, v = 0, sum = 0; i < iEnd; i++) {
			v = count32[i];
			count32[i++] = sum;
			sum += v;
			v = count32[i];
			count32[i++] = sum;
			sum += v;
			v = count32[i];
			count32[i++] = sum;
			sum += v;
			v = count32[i];
			count32[i] = sum;
			sum += v;
		}
	}
}

function radixU16_16(input, start, end) {
	const length = end - start;
	// Count number of occurrences of each byte value
	count16.fill(0, 0, 512);
	for (let i = start, v = 0; i < end; i++) {
		v = input[i];
		count16[v & 0xFF]++;
		count16[c2 + (v >>> 8 & 0xFF)]++;
	}
	radix16_sum16();

	// Set range of values to final value
	for (let i = start, v = 0; i < end; i++) {
		v = input[i];
		sortCopyCacheU16[count16[v & 0xFF]++] = v;
	}
	for (let i = 0, v = 0; i < length; i++) {
		v = sortCopyCacheU16[i];
		input[start + count16[c2 + (v >>> 8 & 0xFF)]++] = v;
	}
	return input;
}

function radixU16_32(input, start, end) {
	const length = end - start;
	// Count number of occurrences of each byte value
	count32.fill(0, 0, 512);
	for (let i = start, v = 0; i < end; i++) {
		v = input[i];
		count32[v & 0xFF]++;
		count32[c2 + (v >>> 8 & 0xFF)]++;
	}
	radix16_sum32();
	// Set range of values to final value
	for (let i = start, v = 0; i < end; i++) {
		v = input[i];
		sortCopyCacheU16[count32[v & 0xFF]++] = v;
	}
	for (let i = 0, v = 0; i < length; i++) {
		v = sortCopyCacheU16[i];
		input[start + count32[c2 + (v >>> 8 & 0xFF)]++] = v;
	}
	return input;
}

/**
 * Expects Uint16Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns a sorted copy of the input array.
 * @param {Uint16Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Uint16Array} input
 */
export function radixU16Copy(input, start, end) {
	return radixU16(input.slice(0), start, end);
}

/**
 * Expects Int16Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Int16Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Int16Array} input
 */
export function radixI16(input, start, end) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	const length = end - start;
	fitSortCopyCache16(length);
	if (length < (1 << 16)) {
		return radixI16_16(input, start, end);
	} else {
		return radixI16_32(input, start, end);
	}
}

function radixI16_16(input, start, end) {
	const length = end - start;
	// Count number of occurrences of each byte value
	count16.fill(0, 0, 512);
	for (let i = start, v = 0; i < end; i++) {
		v = input[i] + 0x8000;
		input[i] = v;
		count16[v & 0xFF]++;
		count16[c2 + (v >>> 8 & 0xFF)]++;
	}
	radix16_sum16();
	// Set range of values to final value
	for (let i = start, v = 0; i < end; i++) {
		v = input[i];
		sortCopyCacheI16[count16[v & 0xFF]++] = v;
	}
	for (let i = 0, v = 0; i < length; i++) {
		v = sortCopyCacheI16[i];
		input[start + count16[c2 + (v >>> 8 & 0xFF)]++] = v - 0x8000;
	}
	return input;
}

function radixI16_32(input, start, end) {
	const length = end - start;
	// Count number of occurrences of each byte value
	count32.fill(0, 0, 512);
	for (let i = start, v = 0; i < end; i++) {
		v = input[i] + 0x8000;
		input[i] = v;
		count32[v & 0xFF]++;
		count32[c2 + (v >>> 8 & 0xFF)]++;
	}
	radix16_sum32();
	// Set range of values to final value
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheI16[count32[v & 0xFF]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheI16[i];
		input[start + count32[c2 + (v >>> 8 & 0xFF)]++] = v - 0x8000;
	}
	return input;
}

/**
 * Expects Int16Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns a sorted copy of the input array.
 * @param {Int16Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Int16Array} input
 */
export function radixI16Copy(input, start, end) {
	return radixI16(input.slice(0), start, end);
}

// ==================================
// === Uint32Array and Int32Array ===
// ==================================

/**
 * Expects Uint32Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Uint32Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Uint32Array} input
 */
export function radixU32(input, start, end) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	const length = end - start;
	fitSortCopyCache32(length);
	if (length < (1 << 16)) {
		return radixU32_16(input, start, end);
	} else {
		return radixU32_32(input, start, end);
	}
}

/** Sub-procedure used by both `radixU32_16` and `radixI32_16`
 *
 * Convert count to cumulative sum of previous counts.
 * This lets us directly copy values to their
 * correct position later.
 * count sum. This slightly-unrolled loop makes it
 * a linear pass over the array, so more cache-friendly
 */
function radix32_sum16() {
	for (let j = 0; j < 4; j++) {
		const iStart = (j << 8),
			iEnd = ((j + 1) << 8);
		for (let i = iStart, v = 0, sum = 0; i < iEnd; i++) {
			v = count16[i];
			count16[i++] = sum;
			sum += v;
			v = count16[i];
			count16[i++] = sum;
			sum += v;
			v = count16[i];
			count16[i++] = sum;
			sum += v;
			v = count16[i];
			count16[i] = sum;
			sum += v;
		}
	}
}

/**
 * Sub-procedure used by both `radixU32_32` and `radixI32_32`
 *
 * Convert count to cumulative sum of previous counts.
 * This lets us directly copy values to their
 * correct position later.
 * count sum. This slightly-unrolled loop makes it
 * a linear pass over the array, so more cache-friendly
 */
function radix32_sum32() {
	for (let j = 0; j < 4; j++) {
		const iStart = (j << 8),
			iEnd = ((j + 1) << 8);
		for (let i = iStart, v = 0, sum = 0; i < iEnd; i++) {
			v = count32[i];
			count32[i++] = sum;
			sum += v;
			v = count32[i];
			count32[i++] = sum;
			sum += v;
			v = count32[i];
			count32[i++] = sum;
			sum += v;
			v = count32[i];
			count32[i] = sum;
			sum += v;
		}
	}
}

function radixU32_16(input, start, end) {
	const length = end - start;
	// Count number of occurrences of each byte value
	count16.fill(0, 0, 1024);
	for (let i = start, v = 0; i < end; i++) {
		v = input[i];
		count16[v & 0xFF]++;
		count16[c2 + (v >>> 8 & 0xFF)]++;
		count16[c3 + (v >>> 16 & 0xFF)]++;
		count16[c4 + (v >>> 24 & 0xFF)]++;
	}

	radix32_sum16();

	// Set range of values to final value
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheU32[count16[v & 0xFF]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheU32[i];
		input[start + count16[c2 + (v >>> 8 & 0xFF)]++] = v;
	}
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheU32[count16[c3 + (v >>> 16 & 0xFF)]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheU32[i];
		input[start + count16[c4 + (v >>> 24 & 0xFF)]++] = v;
	}
	return input;
}

function radixU32_32(input, start, end) {
	const length = end - start;
	// Count number of occurrences of each byte value
	count32.fill(0, 0, 1024);
	for (let i = start, v = 0; i < end; i++) {
		v = input[i];
		count32[v & 0xFF]++;
		count32[c2 + (v >>> 8 & 0xFF)]++;
		count32[c3 + (v >>> 16 & 0xFF)]++;
		count32[c4 + (v >>> 24 & 0xFF)]++;
	}

	radix32_sum32();

	// Set range of values to final value
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheU32[count32[v & 0xFF]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheU32[i];
		input[start + count32[c2 + (v >>> 8 & 0xFF)]++] = v;
	}
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheU32[count32[c3 + (v >>> 16 & 0xFF)]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheU32[i];
		input[start + count32[c4 + (v >>> 24 & 0xFF)]++] = v;
	}
	return input;
}

/**
 * Expects Uint32Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns a sorted copy of the input array.
 * @param {Uint32Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Uint32Array} input
 */
export function radixU32Copy(input, start, end) {
	return radixU32(input.slice(0), start, end);
}

/**
 * Expects Int32Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Int32Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Int32Array} input
 */
export function radixI32(input, start, end) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	fitSortCopyCache32(length);
	const length = end - start;
	if (length < (1 << 16)) {
		return radixI32_16(input, start, end);
	} else {
		return radixI32_32(input, start, end);
	}
}

function radixI32_16(input, start, end) {
	const length = end - start;
	// Count number of occurrences of each byte value
	count16.fill(0, 0, 1024);
	for (let i = start, v = 0; i < end; i++) {
		v = input[i] + 0x80000000;
		input[i] = v;
		count16[v & 0xFF]++;
		count16[c2 + (v >>> 8 & 0xFF)]++;
		count16[c3 + (v >>> 16 & 0xFF)]++;
		count16[c4 + (v >>> 24 & 0xFF)]++;
	}
	radix32_sum16();
	// Set range of values to final value
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheI32[count16[v & 0xFF]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheI32[i];
		input[start + count16[c2 + (v >>> 8 & 0xFF)]++] = v;
	}
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheI32[count16[c3 + (v >>> 16 & 0xFF)]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheI32[i];
		input[start + count16[c4 + (v >>> 24 & 0xFF)]++] = v - 0x80000000;
	}
	return input;
}

function radixI32_32(input, start, end) {
	const length = end - start;
	// Count number of occurrences of each byte value
	count32.fill(0, 0, 1024);
	for (let i = start, v = 0; i < end; i++) {
		v = input[i] + 0x80000000;
		input[i] = v;
		count32[v & 0xFF]++;
		count32[c2 + (v >>> 8 & 0xFF)]++;
		count32[c3 + (v >>> 16 & 0xFF)]++;
		count32[c4 + (v >>> 24 & 0xFF)]++;
	}
	radix32_sum32();
	// Set range of values to final value
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheI32[count32[v & 0xFF]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheI32[i];
		input[start + count32[c2 + (v >>> 8 & 0xFF)]++] = v;
	}
	for (let i = start; i < end; i++) {
		let v = input[i];
		sortCopyCacheI32[count32[c3 + (v >>> 16 & 0xFF)]++] = v;
	}
	for (let i = 0; i < length; i++) {
		let v = sortCopyCacheI32[i];
		input[start + count32[c4 + (v >>> 24 & 0xFF)]++] = v - 0x80000000;
	}
	return input;
}

/**
 * Expects Int32Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns a sorted copy of the input array.
 * @param {Int32Array} input
 * @param {number=} start
 * @param {number=} end
 * @returns {Int32Array} input
 */
export function radixI32Copy(input, start, end) {
	return radixI32(input.slice(0), start, end);
}



/**
 * If the input is a typed array (of the integer type),
 * use a radix sort to sort it. Otherwise, use the
 * built-in sort function
 * @param {*[] | Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array} input
 * @param {number=} start
 * @param {number=} end
 */
export function radixSort(input, start, end) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	switch (input.constructor) {
		case Uint8Array:
			return radixU8(input, start, end);
		case Int8Array:
			return radixI8(input, start, end);
		case Uint16Array:
			return radixU16(input, start, end);
		case Int16Array:
			return radixI16(input, start, end);
		case Uint32Array:
			return radixU32(input, start, end);
		case Int32Array:
			return radixI32(input, start, end);
		default:
			if (start === 0 && end === input.length) {
				return input.sort();
			} else {
				let subArray = input.slice(start, end);
				subArray.sort();
				for (let i = 0; i < subArray.length; i++) {
					input[i + start] = subArray[i];
				}
				return input;
			}
	}
}

/**
 * If the input is a typed array (of the integer type),
 * use a radix sort to sort it. Otherwise, use the
 * built-in sort function
 * @param {*[] | Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array} input
 * @param {number=} start
 * @param {number=} end
 */
export function radixSortCopy(input, start, end) {
	input = input.slice(0);
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	switch (input.constructor) {
		case Uint8Array:
			return radixU8(input, start, end);
		case Int8Array:
			return radixI8(input, start, end);
		case Uint16Array:
			return radixU16(input, start, end);
		case Int16Array:
			return radixI16(input, start, end);
		case Uint32Array:
			return radixU32(input, start, end);
		case Int32Array:
			return radixI32(input, start, end);
		default:
			if (start === 0 && end === input.length) {
				return input.sort();
			} else {
				let subArray = input.slice(start, end);
				subArray.sort();
				for (let i = 0; i < subArray.length; i++) {
					input[i + start] = subArray[i];
				}
				return input;
			}
	}
}

// /**
//  * Fisher-Yates shuffle all elements in an array
//  * @param {[]} array
//  */
// export function shuffle(array) {
// 	let i = array.length;
// 	while (i--) {
// 		// random swap
// 		let t = array[i];
// 		let j = Math.random() * i | 0;
// 		array[i] = array[j];
// 		array[j] = t;
// 	}
// 	return array;
// }

// function compareFunc(arr1, arr2) {
// 	if (arr1.length !== arr2.length) return false;
// 	for (let i = 0; i < arr1.length; i++) {
// 		if (arr1[i] !== arr2[i]) {
// 			console.log(i);
// 			return false;
// 		}
// 	}
// 	return true;
// }

// let U32 = (new Uint32Array(10000)).map(v => Math.random() * 0x100000000 | 0);
// let I32 = new Int32Array(U32.buffer);
// let U16 = new Uint16Array(U32.buffer);
// let I16 = new Int16Array(U32.buffer);
// let U8 = new Uint8Array(U32.buffer);
// let I8 = new Int8Array(U32.buffer);