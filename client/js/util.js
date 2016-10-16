export function nMostFrequent(array, n) {
	// Copy and sort the array. Note that after sorting,
	// undefined values will be at the end of the array!
	const sorted = array.slice(0).sort();

	// linearly run through the array, track the
	// unique entries and count how often they show up
	let uniques = [sorted[0]];
	let frequency = [];
	for (let i = 0, j = 0; sorted[i] !== undefined; i++) {
		if ((sorted[i]) !== uniques[j]) {
			j++;
			uniques[j] = sorted[i];
		}
		frequency[j]++;
	}
	// sort by most frequent
	const result = uniques.sort((a, b) => {
		return frequency[b] - frequency[a];
	});
	frequency.sort();

	// if n is undefined or zero, return the whole array
	n = n ? n : sorted.length;
	// remove empty strings
	if (result[0] === '') {
		return {
			val: result.slice(1, n + 1),
			count: frequency.slice(1, n + 1),
		};
	} else {
		return {
			values: result.slice(0, n),
			count: frequency.slice(0, n),
		};
	}
	// // Sten's functional, elegant but slower original:
	// // (also not sure if it handles undefined values)
	// let frequence = {};
	// array.forEach((value) => { frequency[value] = 0; });
	// const uniques = array.filter((value) => {
	// 	return ++frequency[value] === 1;
	// });
	// const result = uniques.sort((a, b) => {
	// 	return frequency[b] - frequency[a];
	// });
	// return result[0] === '' ? result.slice(1, n + 1) : result.slice(0, n);
}


// Crude normal curve approximation by taking the average of 8 random values
// random value between [-1, 1)
export function rndNorm() {
	return ((Math.random() + Math.random() + Math.random() + Math.random() +
		Math.random() + Math.random() + Math.random() + Math.random()) - 4) * 0.25;
}

// Until we get that spread object operator to work
// we might as well create a helper-function
export function merge(...args) {
	return Object.assign({}, ...args);
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