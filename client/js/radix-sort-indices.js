
// 256 buckets, up to 4 bytes each (32 bit values)
const count32 = new Uint32Array(256 * 4),
	count16 = new Uint16Array(count32.buffer, 0, 256 * 4),
	c2 = 256 * 1,
	c3 = 256 * 2,
	c4 = 256 * 3;

let sortIndicesCache32 = new Uint32Array(0),
	sortIndicesCache16 = new Uint16Array(1024),

// ================================
// === Uint8Array and Int8Array ===
// ================================

/**
 * Expects Uint8Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Uint8Array} input
 * @param {Uint32Array} indices
 * @returns {Uint8Array} input
 */
export function radixU8Indices(input, indices) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;

	if (end < (1 << 16)) {
		return radixU8_16Indices(input, indices);
	} else {
		return radixU8_32Indices(input, indices);
	}
}

function radixU8_16Indices(input, indices) {
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

function radixU8_32Indices(input, indices) {
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
 * @param {Uint32Array} indices
 * @returns {Uint8Array} input
 */
export function radixU8CopyIndices(input, indices) {
	return radixU8(input.slice(0), start, end);
}

/**
 * Expects Int8Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Int8Array} input
 * @param {Uint32Array} indices
 * @returns {Int8Array}
 */
export function radixI8Indices(input, indices) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;

	if (end < (1 << 16)) {
		radixI8_16Indices(input, indices);
	} else {
		radixI8_32Indices(input, indices);

	}
	return input;
}

function radixI8_16Indices(input, indices) {
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


function radixI8_32Indices(input, indices) {
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
 * @param {Uint32Array} indices
 * @returns {Int8Array}
 */
export function radixI8CopyIndices(input, indices) {
	return radixI8(input.slice(0), start, end);
}

// ==================================
// === Uint16Array and Int16Array ===
// ==================================

/**
 * Expects Uint16Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Uint16Array} input
 * @param {Uint32Array} indices
 * @returns {Uint16Array} input
 */
export function radixU16Indices(input, indices) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	const length = end - start;
	if (length > sortCopyCacheU16.length) {
		sortCopyCacheU16 = new Uint16Array(length);
	}
	if (length < (1 << 16)) {
		return radixU16_16Indices(input, indices);
	} else {
		return radixU16_32Indices(input, indices);
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

function radixU16_16Indices(input, indices) {
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

function radixU16_32Indices(input, indices) {
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
 * @param {Uint32Array} indices
 * @returns {Uint16Array} input
 */
export function radixU16CopyIndices(input, indices) {
	return radixU16(input.slice(0), start, end);
}

/**
 * Expects Int16Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Int16Array} input
 * @param {Uint32Array} indices
 * @returns {Int16Array} input
 */
export function radixI16Indices(input, indices) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	const length = end - start;
	if (length > sortCopyCacheI16.length) {
		sortCopyCacheI16 = new Int16Array(length);
	}
	if (length < (1 << 16)) {
		return radixI16_16Indices(input, indices);
	} else {
		return radixI16_32Indices(input, indices);
	}
}

function radixI16_16Indices(input, indices) {
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

function radixI16_32Indices(input, indices) {
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
 * @param {Uint32Array} indices
 * @returns {Int16Array} input
 */
export function radixI16CopyIndices(input, indices) {
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
 * @param {Uint32Array} indices
 * @returns {Uint32Array} input
 */
export function radixU32Indices(input, indices) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	const length = end - start;
	if (length > sortCopyCacheU32.length) {
		sortCopyCacheU32 = new Uint32Array(length);
	}
	if (length < (1 << 16)) {
		return radixU32_16Indices(input, indices);
	} else {
		return radixU32_32Indices(input, indices);
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

function radixU32_16Indices(input, indices) {
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

function radixU32_32Indices(input, indices) {
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
 * @param {Uint32Array} indices
 * @returns {Uint32Array} input
 */
export function radixU32CopyIndices(input, indices) {
	return radixU32(input.slice(0), start, end);
}

/**
 * Expects Int32Array. "Works" on all arrays of
 * up to 2**32 elements, but "incorrect" values are coerced
 * or bitmasked to unsigned 8-bit integer values.
 * Returns the sorted input array.
 * @param {Int32Array} input
 * @param {Uint32Array} indices
 * @returns {Int32Array} input
 */
export function radixI32Indices(input, indices) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	if (end - start > sortCopyCacheI32.length) {
		sortCopyCacheI32 = new Int32Array(end - start);
	}
	if (end < (1 << 16)) {
		return radixI32_16Indices(input, indices);
	} else {
		return radixI32_32Indices(input, indices);
	}
}

function radixI32_16Indices(input, indices) {
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

function radixI32_32Indices(input, indices) {
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
	radix32_sum32Indices(input, indices);
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
 * @param {Uint32Array} indices
 * @returns {Int32Array} input
 */
export function radixI32CopyIndices(input, indices) {
	return radixI32(input.slice(0), start, end);
}



/**
 * If the input is a typed array (of the integer type),
 * use a radix sort to sort it. Otherwise, use the
 * built-in sort function
 * @param {*[] | Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array} input
 * @param {Uint32Array} indices
 */
export function radixSortIndices(input, indices) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	switch (input.constructor) {
		case Uint8Array:
			return radixU8Indices(input, indices);
		case Int8Array:
			return radixI8Indices(input, indices);
		case Uint16Array:
			return radixU16Indices(input, indices);
		case Int16Array:
			return radixI16Indices(input, indices);
		case Uint32Array:
			return radixU32Indices(input, indices);
		case Int32Array:
			return radixI32Indices(input, indices);
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
 * @param {Uint32Array} indices
 */
export function radixSortCopyIndices(input, indices) {
	start = (start | 0) || 0;
	end = (end | 0) || input.length;
	switch (input.constructor) {
		case Uint8Array:
			return radixU8CopyIndices(input, indices);
		case Int8Array:
			return radixI8CopyIndices(input, indices);
		case Uint16Array:
			return radixU16CopyIndices(input, indices);
		case Int16Array:
			return radixI16CopyIndices(input, indices);
		case Uint32Array:
			return radixU32CopyIndices(input, indices);
		case Int32Array:
			return radixI32CopyIndices(input, indices);
		default:
			if (start === 0 && end === input.length) {
				return input.slice(0).sort();
			} else {
				let subArray = input.slice(start, end),
					output = input.slice(0);
				subArray.sort();
				for (let i = 0; i < subArray.length; i++) {
					output[i + start] = subArray[i];
				}
				return output;
			}
	}
}