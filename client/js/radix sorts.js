/*
By Job van der Zwan, CC0 2017

Inspired by Malte Skarupke's ska_sort[0], I wanted to see if radixSort sort is
also faster in JavaScript.


(Also, turns out I'm too dumb to implement ska_sort, so I used the more
simple LSB radixSort sort instead. It is based on an implementation by
Victor J. Duvanenko, but cleaned up to remove a lot of redundancies,
updated for ES6, and making use of TypedArrays for better performance.
If someone else could give a ska sort implemention a try, to see if
it might do even better, that would be awesome!)

For large uniform distributions, radixSort sort beats the built-in sort.
I haven't tested other types of inputs. See benchmarks here:

https://run.perf.zone/view/radixSort-sorts-for-typed-arrays-v2-1507847259416

https://run.perf.zone/view/radixSort-sort-32-bit-int-with-plain-array-test-1507850042653

I hope that for the typed arrays at least, this speed boost is temporary:
with the right algorithm, the built-in sort should be able to be faster
than these, due to better memory access and other reductions in overhead.

This particular implementation returns a new array, and does not mutate
the original array. It's actually less work; LSB radix sort is not
in-place anyway.

TODO: implement and benchmark a Float64 version (and faux-Uint64 version)
This will just be like Uint32, but reading out two 32-bit values at a
time and making 8 passes to cover all bytes.

PS: Skarupke mentions other radixSort sort implementations implementing a
Uint32 radixSort sort that makes three passes in 10-11-11 bit chunks. I have
implemented and tested this[1], but it turns out to be even slower than
the built-in version. Probably due to the large count buffer needed.

[0] https://probablydance.com/2016/12/27/i-wrote-a-faster-sorting-algorithm/

[1] https://run.perf.zone/view/radixSort-sort-variants-for-Uint32Array-1507830151297
*/

// Needed for radixSortFloat64
// import {
// 	isLittleEndian,
// } from 'js/util';

const isLittleEndian = (function () {
	let t16 = new Uint16Array(1);
	let t8 = new Uint8Array(t16.buffer);
	t8[1] = 0xFF;
	return t16[0] === 0xFF00;
})();
/**
 * Returns a sorted array. Leaves original array untouched.
 *
 * Expects 8-bit unsigned integers.
 *
 * "Works" on all arrays, but "incorrect" values will be
 * sorted by their coerced unsigned 8-bit integer equivalent,
 * that is: by sorting `value & 0xFF` (returned array will
 * have original values).
 * @param {number[]} input
 * @param {arrayConstr=} outputConstr
 */
function radixSortUint8(input, outputConstr) {
	const arrayConstr = input.length < (1 << 16) ?
		Uint16Array :
		Uint32Array;
	let count = new arrayConstr(256);

	// Count number of occurrences of each byte value
	for (let i = 0; i < input.length; i++) {
		count[input[i] & 0xFF]++;
	}
	// Convert count to sum of previous counts.
	// This lets us directly copy values to their
	// correct position later
	let t = 0,
		sum = 0;
	for (let i = 0; i < 256; i++) {
		t = count[i];
		count[i] = sum;
		sum += t;
	}

	// Ensure that the output is the same array type as the input.
	// Imagine we pass a Uint32Array that we want to sort based
	// on the lower 8 bits (hey, it could happen...). In that case,
	// we want to avoid coercing the values on copy, so we
	// cannot blindly use a Uint8Array for the output.
	outputConstr = outputConstr || Object.getPrototypeOf(input).constructor;
	let output = new outputConstr(input.length);

	for (let i = 0; i < input.length; i++) {
		let val = input[i];
		output[count[val & 0xFF]++] = val;
	}

	return output;
}

/**
 * Sorts an array of Int8 values. "Works" on all arrays,
 * but incorrect values will be coerced into and sorted
 * as if they are 8-bit signed integers.
 * @param {number[]} input
 * @param {arrayConstr=} outputConstr
 */
function radixSortInt8(input, outputConstr) {
	const inputConstr = Object.getPrototypeOf(input).constructor;
	if (inputConstr === Uint8ClampedArray) {
		// We want to avoid Uint8ClampedArray from messing up our
		// adjustment below, so we turn it into a Uint8Array view
		input = new Uint8Array(input.buffer);
	} else if (inputConstr === Array) {
		// If we have a plain array as input, we might
		// have strings or other objects in the array
		// which would interact funnily with the `+= 80`
		// below. So we coerce the values to numbers first.
		// Surprisingly, for some strings this works out:
		//   Uint8Array.from(["80", "1e4", "257"]);
		// ==> Uint8Array(3) [80, 16, 1]
		input = Uint8Array.from(input);
	}

	for (let i = 0; i < input.length; i++) {
		input[i] += 0x80;
	}
	const output = radixSortUint8(input, outputConstr || inputConstr);

	// If the passed input was an Array, it was turned into a
	// copy anyway, so we did not override the original input.
	// In that case there is no point in wasting time on a copy
	// that will be thrown away.
	if (inputConstr !== Array) {
		for (let i = 0; i < input.length; i++) {
			input[i] -= 0x80;
		}
	}

	return output;
}

/**
 * Sorts an array of Uint16 values. "Works" on all arrays,
 * but incorrect values will be sorted by their coerced
 * unsigned 16-bit integer equivalent, that is: `value & 0xFFFF`.
 *
 * The returned array contains the original values.
 * @param {number[]} input
 */
function radixSortUint16(input, inputConstr) {
	const arrayConstr = input.length < (1 << 16) ?
		Uint16Array :
		Uint32Array;
	let count1 = new arrayConstr(256),
		count2 = new arrayConstr(256);

	// count all bytes in one pass
	for (let i = 0; i < input.length; i++) {
		let val = input[i];
		count1[val & 0xFF]++;
		count2[((val >> 8) & 0xFF)]++;
	}

	// convert count to sum of previous counts
	// this lets us directly copy values to their
	// correct position later
	let t = 0,
		sum1 = 0,
		sum2 = 0;
	for (let i = 0; i < 256; i++) {
		t = count1[i];
		count1[i] = sum1;
		sum1 += t;
		t = count2[i];
		count2[i] = sum2;
		sum2 += t;
	}

	inputConstr = inputConstr || Object.getPrototypeOf(input).constructor;
	let output = new inputConstr(input.length);
	// first pass
	for (let i = 0; i < input.length; i++) {
		let val = input[i];
		output[count1[val & 0xFF]++] = val;
	}
	// second pass
	for (let i = 0; i < input.length; i++) {
		let val = output[i];
		input[count2[(val >> 8) & 0xFF]++] = val;
	}

	return input;
}

/**
 * Sorts an array of Int16 values. "Works" on all arrays,
 * but incorrect values will be coerced into 16-bit numbers.
 * @param {number[]} input
 */
function radixSortInt16(input) {
	const isInt16 = input instanceof Int16Array;
	let bufferView = isInt16 ?
		input.buffer :
		(Int16Array.from(input)).buffer;
	let uinput = new Uint16Array(bufferView);

	for (let i = 0; i < uinput.length; i++) {
		uinput[i] += 0x8000;
	}

	radixSortUint16(uinput);

	for (let i = 0; i < uinput.length; i++) {
		uinput[i] -= 0x8000;
	}

	if (!isInt16) {
		for (let i = 0; i < input.length; i++) {
			input[i] = uinput[i];
		}
	}
	return input;
}


/*
Note that radixSortUint32 returns the original values; it only
coerces the value when determining sort order.

Also note: doubles can store every integer values less than
54 bits in size. So there is room for some nasty bitpacking
hacks storing information in the upper 11 bits.

I have actually used this to pack x, y pixel positions (both 16 bits)
and sprite index (11 bits), sort all of that in one go, then extract
the information to blit sprites.

Using a single Float64Array turns out to be a LOT faster
than sorting JavaScript objects with a custom compare function.
Combining it with this radix sort on top of that feels like
entering hyperspeed.
*/

/**
 * Sorts an array of Uint32 values. "Works" on all arrays,
 * but incorrect values will be sorted by their coerced
 * unsigned 32-bit integer equivalent, that is: `value & 0xFFFFFFFF`.
 *
 * Can sort at most 2^53 values. To be clear,
 * a Uint8Array of 2^53 values is about 8 petabytes,
 * so I don't think this something to worry about any time soon
 *
 * The returned array contains the original values.
 * @param {number[]} input
 */
function radixSortUint32(input) {
	const arrayConstr = input.length < (1 << 16) ?
		Uint16Array :
		input.length < 0x100000000 ?
			Uint32Array :
			Float64Array,
		count1 = new arrayConstr(256),
		count2 = new arrayConstr(256),
		count3 = new arrayConstr(256),
		count4 = new arrayConstr(256),
		count = [count1, count2, count3, count4];


	// count all bytes in one pass
	for (let i = 0; i < input.length; i++) {
		let val = input[i];
		++count1[val & 0xFF];
		++count2[((val >>> 8) & 0xFF)];
		++count3[((val >>> 16) & 0xFF)];
		++count4[((val >>> 24) & 0xFF)];
	}

	// convert count to sum of previous counts
	// this lets us directly copy values to their
	// correct position later
	for (let j = 0; j < 4; j++) {
		let t = 0,
			sum = 0,
			_count = count[j];
		for (let i = 0; i < 256; i++) {
			t = _count[i];
			_count[i] = sum;
			sum += t;
		}
	}

	let outputConstr = Object.getPrototypeOf(input).constructor,
		output1 = new outputConstr(input.length),
		output2 = new outputConstr(input.length);

	for (let i = 0; i < input.length; i++) {
		let val = input[i];
		output1[count1[val & 0xFF]++] = val;
	}
	for (let i = 0; i < input.length; i++) {
		let val = output1[i];
		output2[count2[(val >>> 8) & 0xFF]++] = val;
	}
	for (let i = 0; i < input.length; i++) {
		let val = output2[i];
		output1[count3[(val >>> 16) & 0xFF]++] = val;
	}
	for (let i = 0; i < input.length; i++) {
		let val = output1[i];
		output2[count4[(val >>> 24) & 0xFF]++] = val;
	}

	return output2;
}

/**
 * Sorts an array of Int32 values. "Works" on all arrays,
 * but incorrect values will be coerced into 32-bit numbers.
 * @param {number[]} input
 */
function radixSortInt32(input) {
	const isInt32Array = input instanceof Int32Array;
	// Make use of ArrayBuffer to "reinterpret cast"
	// the Int32Array as a Uint32Array. If it is a plain
	// array, we first have to convert it to Int32 values
	let bufferView = isInt32Array ?
		input.buffer :
		Int32Array.from(input).buffer;
	let uinput = new Uint32Array(bufferView);

	// adjust to positive nrs
	for (let i = 0; i < uinput.length; i++) {
		uinput[i] += 0x80000000;
	}

	// Re-use radixSortUint32
	radixSortUint32(uinput);

	// Adjust back to signed nrs
	for (let i = 0; i < uinput.length; i++) {
		uinput[i] -= 0x80000000;
	}

	// for plain arrays, fake in-place behaviour
	if (!isInt32Array) {
		for (let i = 0; i < input.length; i++) {
			input[i] = uinput[i];
		}
	}

	return input;
}

/**
 * Sorts an array of Int32 values. "Works" on all arrays,
 * but incorrect values will be coerced into Float32 numbers.
 * @param {number[]} input
 */
function radixSortFloat32(input) {
	const isFloat32Array = input instanceof Float32Array;
	// Make use of ArrayBuffer to "reinterpret cast"
	// the Float32 as a Uint32Array. If it is a plain
	// array, we first have to convert it to Float32 values
	let bufferView = isFloat32Array ?
		input.buffer :
		(Float32Array.from(input)).buffer;
	let uinput = new Uint32Array(bufferView);

	// Similar to radixSortInt32, but uses a more complicated trick
	// See: http://stereopsis.com/radixSort.html
	for (let i = 0; i < uinput.length; i++) {
		if (uinput[i] & 0x80000000) {
			uinput[i] ^= 0xFFFFFFFF;
		} else {
			uinput[i] ^= 0x80000000;
		}
	}

	// Re-use radixSortUint32
	radixSortUint32(uinput);

	// Adjust back to original floating point nrs
	for (let i = 0; i < uinput.length; i++) {
		if (uinput[i] & 0x80000000) {
			uinput[i] ^= 0x80000000;
		} else {
			uinput[i] ^= 0xFFFFFFFF;
		}
	}

	if (!isFloat32Array) {
		let floatTemp = new Float32Array(uinput.buffer);
		for (let i = 0; i < input.length; i++) {
			input[i] = floatTemp[i];
		}
	}

	return input;
}

/**
 * Sorts a Uint32Array as if it contained "Uint64" values,
 * simulated by merging two values from the array.
 * The endianness is the same as the endianness of the
 * environment (this is required to make it possible to implement
 * a Float64 radix).
 *
 * "Works" on all arrays TypedArrays that contain multiples of 8
 * bytes. Plain arrays are not supported.
 * @param {number[]} input
 */
const radixSortUint64 = isLittleEndian ?
	radixSortUint64LE :
	radixSortUint64BE;

function radixSortUint64LE(input) {
	// We shift seventeen instead of sixteen bits,
	// because we're using two Uint32 values as
	// one, thus only count half as many "total" values
	const arrayConstr = input.length < (1 << 17) ?
		Uint16Array :
		Uint32Array;
	let count0 = new arrayConstr(256),
		count1 = new arrayConstr(256),
		count2 = new arrayConstr(256),
		count3 = new arrayConstr(256),
		count4 = new arrayConstr(256),
		count5 = new arrayConstr(256),
		count6 = new arrayConstr(256),
		count7 = new arrayConstr(256),
		count = [
			count0,
			count1,
			count2,
			count3,
			count4,
			count5,
			count6,
			count7,
		];

	// count all bytes in one pass
	for (let i = 0; i < input.length; i += 2) {
		let val = input[i + 1];
		count0[val & 0xFF]++;
		count1[((val >> 8) & 0xFF)]++;
		count2[((val >> 16) & 0xFF)]++;
		count3[((val >> 24) & 0xFF)]++;
		val = input[i];
		count4[val & 0xFF]++;
		count5[((val >> 8) & 0xFF)]++;
		count6[((val >> 16) & 0xFF)]++;
		count7[((val >> 24) & 0xFF)]++;
	}

	for (let j = 0; j < 8; j++) {
		let t = 0,
			sum = 0,
			count_j = count[j];
		for (let i = 0; i < 256; i++) {
			t = count_j[i];
			count_j[i] = sum;
			sum += t;
		}
	}


	let output = new (Object.getPrototypeOf(input).constructor)(input.length);

	// Lower 32 bits
	for (let j = 0; j < 4; j++) {
		let count_j = count[j],
			shiftRight = j << 3;
		for (let i = 0; i < input.length; i++) {
			let val2 = input[i++],
				val = input[i],
				idx = (count_j[(val >> shiftRight) & 0xFF]++) * 2;
			output[idx++] = val;
			output[idx] = val2;
		}
		count_j = count[++j];
		shiftRight = j << 3;
		for (let i = 0; i < output.length; i++) {
			let val2 = output[i++],
				val = output[i],
				idx = (count_j[(val >> shiftRight) & 0xFF]++) * 2;
			input[idx++] = val;
			input[idx] = val2;
		}
	}
	// Upper 32 bits
	for (let j = 0; j < 4; j++) {
		let count_j = count[j],
			shiftRight = j << 3;
		for (let i = 0; i < input.length; i++) {
			let val2 = input[i++],
				val = input[i],
				idx = (count_j[(val2 >> shiftRight) & 0xFF]++) * 2;
			output[idx++] = val;
			output[idx] = val2;
		}
		count_j = count[++j];
		shiftRight = j << 3;
		for (let i = 0; i < output.length; i++) {
			let val2 = output[i++],
				val = output[i],
				idx = (count_j[(val2 >> shiftRight) & 0xFF]++) * 2;
			input[idx++] = val;
			input[idx] = val2;
		}
	}
	return input;
}

function radixSortUint64BE(input) {
	// We shift seventeen instead of sixteen bits,
	// because we're using two Uint32 values as
	// one, thus only count half as many "total" values
	const arrayConstr = input.length < (1 << 17) ?
		Uint16Array :
		Uint32Array;
	let count0 = new arrayConstr(256),
		count1 = new arrayConstr(256),
		count2 = new arrayConstr(256),
		count3 = new arrayConstr(256),
		count4 = new arrayConstr(256),
		count5 = new arrayConstr(256),
		count6 = new arrayConstr(256),
		count7 = new arrayConstr(256),
		count = [
			count0,
			count1,
			count2,
			count3,
			count4,
			count5,
			count6,
			count7,
		];

	// count all bytes in one pass
	for (let i = 0; i < input.length; i += 2) {
		let val = input[i];
		count0[val & 0xFF]++;
		count1[((val >> 8) & 0xFF)]++;
		count2[((val >> 16) & 0xFF)]++;
		count3[((val >> 24) & 0xFF)]++;
		val = input[i + 1];
		count4[val & 0xFF]++;
		count5[((val >> 8) & 0xFF)]++;
		count6[((val >> 16) & 0xFF)]++;
		count7[((val >> 24) & 0xFF)]++;
	}

	for (let j = 0; j < 8; j++) {
		let t = 0,
			sum = 0,
			count_j = count[j];
		for (let i = 0; i < 256; i++) {
			t = count_j[i];
			count_j[i] = sum;
			sum += t;
		}
	}


	let output = new (Object.getPrototypeOf(input).constructor)(input.length);

	// Lower 32 bits
	for (let j = 0; j < 4; j++) {
		let count_j = count[j],
			shiftRight = j << 3;
		for (let i = 0; i < input.length; i++) {
			let val = input[i++],
				val2 = input[i],
				idx = (count_j[(val >> shiftRight) & 0xFF]++) * 2;
			output[idx++] = val;
			output[idx] = val2;
		}
		count_j = count[++j];
		shiftRight = j << 3;
		for (let i = 0; i < output.length; i++) {
			let val = output[i++],
				val2 = output[i],
				idx = (count_j[(val >> shiftRight) & 0xFF]++) * 2;
			input[idx++] = val;
			input[idx] = val2;
		}
	}
	// Upper 32 bits
	for (let j = 0; j < 4; j++) {
		let count_j = count[j],
			shiftRight = j << 3;
		for (let i = 0; i < input.length; i++) {
			let val = input[i++],
				val2 = input[i],
				idx = (count_j[(val2 >> shiftRight) & 0xFF]++) * 2;
			output[idx++] = val;
			output[idx] = val2;
		}
		count_j = count[++j];
		shiftRight = j << 3;
		for (let i = 0; i < output.length; i++) {
			let val = output[i++],
				val2 = output[i],
				idx = (count_j[(val2 >> shiftRight) & 0xFF]++) * 2;
			input[idx++] = val;
			input[idx] = val2;
		}
	}
	return input;
}

const radixSortFloat64 = isLittleEndian ?
	radixSortFloat64LE :
	radixSortFloat64BE;

function radixSortFloat64LE(input) {
	const isFloat64Array = input instanceof Float64Array;
	let bufferView = isFloat64Array ?
		input.buffer :
		Float64Array.from(input).buffer;

	let uinput = new Uint32Array(bufferView);

	for (let i = 0; i < uinput.length; i++) {
		if (uinput[i + 1] & 0x80000000) {
			uinput[i] ^= 0xFFFFFFFF;
			uinput[++i] ^= 0xFFFFFFFF;
		} else {
			uinput[i] ^= 0x80000000;
			uinput[++i] ^= 0x80000000;
		}
	}

	radixSortUint64LE(uinput);

	for (let i = 0; i < uinput.length; i++) {
		if (uinput[i + 1] & 0x80000000) {
			uinput[i] ^= 0x80000000;
			uinput[++i] ^= 0x80000000;
		} else {
			uinput[i] ^= 0xFFFFFFFF;
			uinput[++i] ^= 0xFFFFFFFF;
		}
	}

	if (!isFloat64Array) {
		let floatTemp = new Float64Array(uinput.buffer);
		for (let i = 0; i < input.length; i++) {
			input[i] = floatTemp[i];
		}
	}
	return input;
}

function radixSortFloat64BE(input) {
	const isFloat64Array = input instanceof Float64Array;
	let bufferView = isFloat64Array ?
		input.buffer :
		Float64Array.from(input).buffer;

	let uinput = new Uint32Array(bufferView);

	for (let i = 0; i < uinput.length; i++) {
		if (uinput[i] & 0x80000000) {
			uinput[i] ^= 0xFFFFFFFF;
			uinput[++i] ^= 0xFFFFFFFF;
		} else {
			uinput[i] ^= 0x80000000;
			uinput[++i] ^= 0x80000000;
		}
	}

	radixSortUint64BE(uinput);

	for (let i = 0; i < uinput.length; i++) {
		if (uinput[i] & 0x80000000) {
			uinput[i] ^= 0x80000000;
			uinput[++i] ^= 0x80000000;
		} else {
			uinput[i] ^= 0xFFFFFFFF;
			uinput[++i] ^= 0xFFFFFFFF;
		}
	}

	if (!isFloat64Array) {
		let floatTemp = new Float64Array(uinput.buffer);
		for (let i = 0; i < input.length; i++) {
			input[i] = floatTemp[i];
		}
	}
	return input;
}

/**
 * Fisher-Yates shuffle all elements in an array
 * @param {[]} array
 */
function shuffle(array) {
	let i = array.length;
	while (i--) {
		// random swap
		let t = array[i];
		let j = Math.random() * i | 0;
		array[i] = array[j];
		array[j] = t;
	}
	return array;
}

/**
 * Method to test if a passed array is sorted properly.
 * Alternatively, pass an array constructor of any
 * type (Array or one of the TypedArrays) to see if
 * the sort function returns the right values and the
 * right type of array.
 *
 * Returns true on a failed test
 * @param {number[] | arrayConstr} arrayConstr
 * @param {sortFunc} sortFunc
 * @param {boolean} testReturnedArrayType
 */
function testSort(arrayConstr, sortFunction, testReturnedArrayType) {
	let testArray = new arrayConstr(10000);
	for (let i = 0; i < testArray.length; i++) {
		// TypedArrays truncate, so this works out fine
		testArray[i] = (0x100000000 * Math.random());
	}

	let verifyArray = testArray.slice(0).sort(compareFunc);
	let sortedArray = sortFunction(testArray);

	// check if the returned array has the
	// same array type as the input array
	if (testReturnedArrayType) {
		const sConstr = Object.getPrototypeOf(sortedArray).constructor,
			tConstr = Object.getPrototypeOf(testArray).constructor;
		if (sConstr !== tConstr) {
			console.log(`Sort function returns ${sConstr}, expected ${tConstr}`);
			return true;
		}

	}

	//
	for (let i = 0; i < testArray.length; i++) {
		if (testArray[i] !== verifyArray[i]) {
			console.log(`Test[${i}]: ${testArray[i]}, verify[${i}]: ${verifyArray[i]}`);
			return true;
		}
	}
	console.log(`All elements are the correct values, and are in the correct position. ${testReturnedArrayType ? 'Returned array type is equal to input array' : 'Returned array type not verified'}`);
	return false;
}


/**
 * Function that sorts an array in-place
 * @param {[]} array
 */
function sortFunc(array) {
	// dummy function for JSdoc
	return array.sort(compareFunc);
}

/**
 * @param {number} a
 * @param {number} b
 */
function compareFunc(a, b) {
	return a - b;
}

// dummy value for JSdoc
const arrayConstr = Array;

(input) {
	const length = input.length;
	let arrayConstr = length < (1 << 16) ? Uint16Array : Uint32Array,
		count1 = new arrayConstr(256),
		count2 = new arrayConstr(256),
		count3 = new arrayConstr(256),
		count4 = new arrayConstr(256),
		count = [count1, count2, count3, count4],
		indices = new arrayConstr(length),
		indices2 = new arrayConstr(length);

	for (let i = 0; i < length; i++) {
		indices[i] = i;
	}

	// count all bytes in one pass
	for (let i = 0; i < length; i++) {
		let val = input[i];
		count1[val & 0xFF]++;
		count2[(val >>> 8) & 0xFF]++;
		count3[(val >>> 16) & 0xFF]++;
		count4[(val >>> 24) & 0xFF]++;
	}

	// convert count to sum of previous counts
	// this lets us directly copy values to their
	// correct position later
	for (let j = 0; j < 4; j++) {
		let t = 0,
			sum = 0,
			_count = count[j];
		for (let i = 0; i < 256; i++) {
			t = _count[i];
			_count[i] = sum;
			sum += t;
		}
	}

	for (let i = 0; i < length; i++) {
		let j = indices[i];
		let val = input[j];
		indices2[count1[val & 0xFF]++] = j;
	}
	for (let i = 0; i < length; i++) {
		let j = indices2[i];
		let val = input[j];
		indices[count2[(val >>> 8) & 0xFF]++] = j;
	}
	for (let i = 0; i < length; i++) {
		let j = indices[i];
		let val = input[j];
		indices2[count3[(val >>> 16) & 0xFF]++] = j;
	}
	for (let i = 0; i < length; i++) {
		let j = indices2[i];
		let val = input[j];
		indices[count4[(val >>> 24) & 0xFF]++] = j;
	}

	return indices;
}

/*

TODO: Figure out why the following breaks scatterplot

function sortByAxes(xy, cIdx, sprites) {

	// Note that at this point xy contains the x,y coordinates
	// packed as 0x YYYY XXXX, so sorting by that value
	// automatically sorts by Y first, X second
	// However, we want to draw the zero-values underneath the
	// non-zero values, so we make a copy of this array
	// with 0x7FFFFFFF if cIdx is zero, and sort by that copy.
	// (we want zero values at the end because we use while(i--)
	// instead of for loops as a micro-optimization)


	// Strategy:
	// - Pack indexes and xy into one Float64.
	// - radix sort lower 32 bytes (xy)
	// - extract xy and index values without
	//   extra layers of indirection of above method
	// Doubles can store all integers up to 2**53+1,
	// so for any indices < 2**21 we're fine (two million)
	// Above has ben tested to be correct with the following snippet:
	// let mul = 0x100000000,
	// 	div = 1 / mul;
	// for (let i = 0; i < (1 << 22); i++) {
	// 	let j = i * mul;
	// 	j *= div;
	// 	if (i !== j) {
	// 		console.log({ i, j });
	// 		break;
	// 	}
	// }

	const l = cIdx.length;
	let zeros = 0,
		compVal = Float64Array.from(xy),
		cSprites = new Array(l),
		i = l;
	while(i--) {
		let idx =  cIdx[i];
		if (idx === 0){
			compVal[i] = compVal[i] & 0x80008000;
			zeros++;
		} else {
			compVal[i] += idx * 0x100000000;
		}
	}

	radix32Float64(compVal);

	// copy sprites;
	i = l;
	while(i--){
		// x2.3283064365386963e-10 ===  / 0x100000000
		let idx = (compVal[i] * 2.3283064365386963e-10) | 0;
		cSprites[i] = sprites[idx];
	}

	return {
		xy: compVal,
		cSprites,
		zeros,
	};
}
*/