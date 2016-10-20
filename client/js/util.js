export function countElements(array){
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
		uniques.push({ val, count });
		i += count;
	}
	return uniques;
}


export function nMostFrequent(array, n) {
	let uniques = countElements(array);

	// if present, remove empty string from the result
	for (let i = 0; i < uniques.length; i++){
		if (uniques[i].val === ''){
			uniques[i] = uniques.pop();
			break;
		}
	}

	uniques.sort((a, b) => {
		return a.count < b.count ? 1 :
		a.count > b.count ? -1 :
		a.val < b.val ? -1 : 1; // on equal count, sort alphabetically
	});

	// if n is undefined or zero, return the whole array
	n = n ? Math.min(n, uniques.length) : uniques.length;
	let values = [], count = [];
	for (let i = 0; i < n; i++){
		values.push(uniques[i].val);
		count.push(uniques[i].count);
	}
	return { values, count };

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

export function calcMinMax(data) {
	let min = 0;
	let max = 0;
	if (typeof data[0] === 'number') {
		min = Number.MAX_VALUE;
		max = Number.MIN_VALUE;
		for (let i = 0; i < data.length; i++) {
			min = min < data[i] ? min : data[i];
			max = max > data[i] ? max : data[i];
		}
	}
	return { min, max };
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