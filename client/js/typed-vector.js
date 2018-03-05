/**
 * Takes a typed array constructor and 
 * generates a prototypical vector class
 * @param {*} typedArray 
 */
let VecPrototype = (typedArray) => {
	/**
	 * Returns a `TypedVector` instance of size `length | 0`
	 * @param {number=} length 
	 */
	function Vector(length) {
		// ensure that length is a positive integer
		length = length < 0 ? 0 : length | 0;
		this.length = length;
		// We assueme that one wouldn't use a
		// vector unless they were going to
		// push() to it, so we set the initial
		// backing array size to 1.5x length.
		this.data = new typedArray(length * 1.5);
	}

	/**
	 * Create a new `TypedVector` instance from an array-like object.
	 * Note: does **not** support iterable objects!
	 * @param {*[]} array 
	 */
	Vector.from = function (array) {
		let { length } = array;
		let retVec = new Vector(length);
		while (length--) {
			retVec.data[length] = array[length];
		}
		return retVec;
	};

	/**
	 * creates a new `TypedVector` instance with a variable number of arguments, regardless of number or type of the arguments.
	 * @param {*[]} values 
	 */
	Vector.of = function (...values) {
		return Vector.from(values);
	};

	/**
	 * Adds one element to the end of a vector and
	 * returns the new length of the vector.
	 * This method re-allocates and grows the backing
	 * array when it is filled up.
	 * @param {number} value
	 */
	Vector.prototype.push = function (value) {
		let {
			length,
			data,
		} = this;
		if (length >= data.length) {
			// when increasing capacity, skip the lower powers
			// of two (2, 4, 8, 16) to avoid a lot of re-allocations
			data = new typedArray(Math.max(length * 2, 64));
			data.set(this.data);
			this.data = data;
		}
		data[length++] = value;
		return (this.length = length);
	};

	/**
	 * Adds multiple elements to the end of a vector
	 * and returns the new length of the vector.
	 * This method re-allocates and grows the backing
	 * array when it is filled up.
	* @param {number[]} values
	*/
	Vector.prototype.pushN = function (...values) {
		if (values.length) {
			let {
				length,
				data,
			} = this;
			let vLength = values.length;
			if ((length + vLength) >= data.length) {
				// when increasing capacity, skip the lower powers
				// of two (2, 4, 8, 16) to avoid a lot of re-allocations
				data = new typedArray(Math.max((length + vLength) * 2, 64));
				data.set(this.data);
				this.data = data;
			}
			for (let i = 0; i < vLength; i++) {
				data[length++] = values[i];
			}
			this.length = length;
		}
		return this.length;
	};

	/**
	 * Removes the **last** element from a vector and
	 * returns that element.
	 * This method changes the length of the vector.
	 * This method does **not** release memory from
	 * the backing array
	 */
	Vector.prototype.pop = function () {
		return this.length && this.data[this.length--];
	};

	/**
	 * Removes the **last n elements** from a vector and returns a typed array copy of these elements.
	 * This method changes the length of the vector.
	 * This method does **not** release memory from the backing array!
	 * @param {number} n 
	 */
	Vector.prototype.popN = function (n) {
		let { length } = this;
		n |= 0;
		n = Math.max(0, Math.min(length, length - n));
		this.length = n;
		return this.data.slice(n, length);
	};

	/**
	 * Shrinks backing array to `size`. If no parameter is passed, backing array is made to fit the current length of the vector.
	 * @param {number=} size 
	 */
	Vector.prototype.shrinkToFit = function (size) {
		size = (typeof size === 'number') ? size : this.length;
		if (size < this.data.length) {
			// Presumably the most efficient way to shrink: first create a 
			// "new" shrunken array with the same backing array (avoiding
			// the allocation of new a backing array), then create a new
			// TypedArray from this backing array. Ironically this means
			// we have to allocate memory to release memory.
			this.data = typedArray.from(this.data.subarray(0, size));
		}
		return this;
	};

	/**
	* Returns a `TypedArray` copy of the vector
	*/
	Vector.prototype.toTypedArray = function () {
		return this.data.slice(0, this.length);
	};

	return Vector;
};

export const Uint8Vector = VecPrototype(Uint8Array);
export const Uint8ClampedVector = VecPrototype(Uint8ClampedArray);
export const Int8Vector = VecPrototype(Int8Array);
export const Uint16Vector = VecPrototype(Uint16Array);
export const Int16Vector = VecPrototype(Int16Array);
export const Uint32Vector = VecPrototype(Uint32Array);
export const Int32Vector = VecPrototype(Int32Array);
export const Float32Vector = VecPrototype(Float32Array);
export const Float64Vector = VecPrototype(Float64Array);