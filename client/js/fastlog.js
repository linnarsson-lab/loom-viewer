/**
 === Original C code, Copyright (C) 2011 Paul Mineiro ===

 source:
   https://github.com/romeric/fastapprox/

 blog post discussing it:
   http://www.machinedlearnings.com/2011/06/fast-approximate-logarithm-exponential.html

 */

// Fake a C-union using a typed array
// Hoisted because allocating a new
// new typed array is SLOW
const unionU32 = new Uint32Array(1),
	unionF32 = new Float32Array(unionU32.buffer),
	unionI32 = new Int32Array(unionU32.buffer);

export function fastlog2(x) {
	unionF32[0] = x;
	let vx_u = unionU32[0];
	unionU32[0] = (vx_u & 0x007FFFFF) | 0x3F000000;
	let mx_f = unionF32[0];
	return (vx_u * 1.1920928955078125e-7) - 124.22551499 - 1.498030302 * mx_f - 1.72587999 / (0.3520887068 + mx_f);
}

export function fasterlog2(x) {
	unionF32[0] = x;
	return (unionU32[0] * 1.1920928955078125e-7) - 126.94269504;
}

export function fastlog(x) {
	// return 0.69314718 * fastlog2 (x);
	// premultiplied all constants
	unionF32[0] = x;
	let vx_u = unionU32[0];
	unionU32[0] = (vx_u & 0x007FFFFF) | 0x3F000000;
	let mx_f = unionF32[0];
	return (vx_u * 8.262958288192749e-8) - 86.10656539936622 - 1.0383554793858485 * mx_f - 1.196288848086928 / (0.3520887068 + mx_f);
}

export function fasterlog(x) {
	unionF32[0] = x;
	return (unionU32[0] * 8.262958288192749e-8) - 87.98997108857598;
}

/**
 * @param {Float32Array} n
 */
export function fastlog2F32Array(n) {
	for (let i = 0, nU32 = new Uint32Array(n.buffer); i < n.length; i++) {
		let vx_u = nU32[i];
		nU32[i] = (vx_u & 0x007FFFFF) | 0x3F000000;
		let mx_f = n[i];
		n[i] = (vx_u * 1.1920928955078125e-7) - 124.22551499 - 1.498030302 * mx_f - 1.72587999 / (0.3520887068 + mx_f);
	}
	return n;
}

/**
 * @param {Float32Array} n
 */
export function fasterlog2F32Array(n) {
	for (let i = 0, nU32 = new Uint32Array(n.buffer); i < n.length; i++) {
		n[i] = (nU32[i] * 1.1920928955078125e-7) - 126.94269504;
	}
	return n;
}

/**
 * @param {Float32Array} n
 */
export function fastlogF32Array(n) {
	for (let i = 0, nU32 = new Uint32Array(n.buffer); i < n.length; i++) {
		let vx_u = nU32[i];
		nU32[i] = (vx_u & 0x007FFFFF) | 0x3F000000;
		let mx_f = n[i];
		n[i] = (vx_u * 8.262958288192749e-8) - 86.10656539936622 - 1.0383554793858485 * mx_f - 1.196288848086928 / (0.3520887068 + mx_f);
	}
	return n;
}

/**
 * @param {Float32Array} n
 */
export function fasterlogF32Array(n) {
	for (let i = 0, nU32 = new Uint32Array(n.buffer); i < n.length; i++) {
		n[i] = (nU32[i] * 8.262958288192749e-8) - 87.98997108857598;
	}
	return n;
}

export function logProject(x) {
	if (x) {
		let multiplier = (x > 0 ? 1 : -1);
		// bit of algebraic trickery: regardless of `x`'s sign,
		// the result of this is Math.abs(x) + 1;
		unionF32[0] = multiplier * (x + multiplier);
		let vx_u = unionU32[0];
		unionU32[0] = (vx_u & 0x007FFFFF) | 0x3F000000;
		let mx_f = unionF32[0];
		return (
			vx_u * 1.1920928955078125e-7 -
			124.22551499 -
			1.498030302 * mx_f -
			1.72587999 / (0.3520887068 + mx_f)
		) * multiplier;
	}
	return 0;
}

/**
 * Creates a `Float32Array` copy of `n`
 * and log2-projects it.
 * @param {*[]} n
 */
export function logProjectArrayCopy(n) {
	const nF = Float32Array.from(n),
		nU = new Uint32Array(nF.buffer);
	for (let i = 0; i < nF.length; i++) {
		let v = nF[i];
		if (v) {
			let multiplier = (v > 0 ? 1 : -1);
			nF[i] = multiplier * (v + multiplier);
			let vx_u = nU[i];
			nU[i] = (vx_u & 0x007FFFFF) | 0x3F000000;
			let mx_f = nF[i];
			nF[i] = (
				vx_u * 1.1920928955078125e-7 -
				124.22551499 -
				1.498030302 * mx_f -
				1.72587999 / (0.3520887068 + mx_f)
			) * multiplier;
		}
	}
	return nF;
}

/**
 * Modifies `n`!
 * @param {Float32Array} n
 */
export function logProjectF32ArrayInline(n) {
	const nU = new Uint32Array(n.buffer);
	for (let i = 0; i < n.length; i++) {
		let v = n[i];
		if (v) {
			let multiplier = (v > 0 ? 1 : -1);
			// bit of algebraic trickery: regardless of `v`'s sign,
			// the result of this is Math.abs(v) + 1;
			n[i] = multiplier * (v + multiplier);
			let vx_u = nU[i];
			nU[i] = (vx_u & 0x007FFFFF) | 0x3F000000;
			let mx_f = n[i];
			n[i] = (
				vx_u * 1.1920928955078125e-7 -
				124.22551499 -
				1.498030302 * mx_f -
				1.72587999 / (0.3520887068 + mx_f)
			) * multiplier;
		}
	}
	return n;
}

/**
 *  Laurent de Soras's log2 approximation
 * inline float fast_log2 (float val)
 * {
 *    int * const    exp_ptr = reinterpret_cast <int * (&val);
 *    int            x = *exp_ptr;
 *    const int      log_2 = ((x  23) & 255) - 128;
 *    x &= ~(255 << 23);
 *    x += 127 << 23;
 *    *exp_ptr = x;
 *    val = ((-1.0f/3) * val + 2) * val - 2.0f/3;   // (1)
 *    return (val + log_2);
 * }
 */

function sorasLog2(x) {
	unionF32[0] = x;
	let xi = unionI32[0];
	let log2Int = ((xi >>> 23) & 255) - 128;
	// xi &= -2139095041; // ~(255 << 23);
	// xi += 1065353216; // 127 << 23;
	// 1065353216 = 127 << 23
	unionI32[0] = (xi & 0b10000000011111111111111111111111) + 1065353216;
	x = unionF32[0];
	return ((-1.0 / 3.0) * x + 2.0) * x - 2.0 / 3.0 + log2Int;
}


let perfSum = 0;
for (let j = 0; j < 100; j++) {
	let t = (new Float32Array(100000)).map(v => Math.random() * (1 << 24));
	let t0 = performance.now();
	for (let i = 0; i < t.length; i++) {
		t[i] = fastlog2(t[i]);
	}
	perfSum += performance.now() - t0;
}
console.log(perfSum / 100);

WebAssembly.instantiate(Uint8Array.from([0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 1, 125, 1, 125, 3, 2, 1, 0, 5, 3, 1, 0, 1, 7, 12, 1, 8, 102, 97, 115, 116, 108, 111, 103, 50, 0, 0, 10, 125, 1, 123, 4, 1, 127, 1, 127, 1, 127, 1, 125, 65, 1, 33, 1, 65, 1, 33, 2, 32, 1, 65, 0, 65, 2, 116, 106, 32, 0, 56, 2, 0, 32, 2, 65, 0, 65, 2, 116, 106, 40, 2, 0, 33, 3, 32, 2, 65, 0, 65, 2, 116, 106, 32, 3, 65, 255, 255, 255, 3, 113, 65, 128, 128, 128, 248, 3, 114, 54, 2, 0, 32, 1, 65, 0, 65, 2, 116, 106, 42, 2, 0, 33, 4, 32, 3, 178, 67, 0, 0, 0, 52, 148, 67, 119, 115, 248, 66, 147, 67, 117, 191, 191, 63, 32, 4, 148, 147, 67, 163, 233, 220, 63, 67, 249, 68, 180, 62, 32, 4, 146, 149, 147, 15, 11]).buffer)
	.then((result) => {
		let fastlog2WASM = result.instance.exports.fastlog2;
		let perfSum = 0;
		for (let j = 0; j < 100; j++) {
			let t = (new Float32Array(100000)).map(v => Math.random() * (1 << 24));
			let t0 = performance.now();
			for (let i = 0; i < t.length; i++) {
				t[i] = fastlog2WASM(t[i]);
			}
			perfSum += performance.now() - t0;
		}
		console.log(perfSum / 100);
	});
/*
let t = (new Float32Array(100)).map((v,i) => (i+1) / 1000),
	tLog = t.map(v => Math.log2(v)),
	tFastLog2 = t.map(v => fastlog2(v)),
	tFasterLog2 = t.map(v => fasterlog2(v)),
	tSorasLog2 = t.map(v => sorasLog2(v)),
	eFastLog2 = tLog.map((v, i) => (v - tFastLog2[i])/v),
	eFasterLog2 = tLog.map((v, i) => (v - tFasterLog2[i])/v),
	eSorasLog2 = tLog.map((v, i) => (v - tSorasLog2[i])/v);
*/