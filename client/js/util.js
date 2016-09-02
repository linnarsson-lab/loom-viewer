export function nMostFrequent(array, n) {
	// copy and sort the array
	const sorted = array.slice(0).sort();
	// linearly run through the array, track the
	// unique entries and count how often they show up
	let uniques = [sorted[0]];
	let frequency = [1];
	for (let i = 1, j = 0; i < sorted.length; i++) {
		if (sorted[i] !== uniques[j]) {
			j++;
			uniques[j] = sorted[i];
			frequency[j] = 1;
		}
		frequency[j]++;
	}
	// sort by most frequent
	const result = uniques.sort((a, b) => {
		return frequency[b] - frequency[a];
	});
	return result[0] === '' ? result.slice(1, n + 1) : result.slice(0, n);

	// Sten's functional and elegant but slower original:
	// let frequence = {};
	// array.forEach((value) => { frequency[value] = 0; });
	// const uniques = array.filter((value) => { return ++frequency[value] === 1; });
	// const result = uniques.sort((a, b) => {
	// 	return frequency[b] - frequency[a];
	// });
	// return result[0] === '' ? result.slice(1, n + 1) : result.slice(0, n);
}