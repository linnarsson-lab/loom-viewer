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
	return result[0] === '' ? result.slice(1, n + 1) : result.slice(0, n);

	// // Sten's functional, elegant but slower original:
	// // (also not sure if it handles undefined)
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