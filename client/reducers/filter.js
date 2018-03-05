import { sortFilterIndices } from './sort-dataset';

export function updateFilteredIndices(data, filter, order, originalIndices) {
	let indices = Array.from(originalIndices);

	for(let i = 0; i < filter.length; i++) {
		let filterEntry = filter[i];
		let filterAttrName = filterEntry.attr;
		let filterVal = filterEntry.val;

		let attr = data.attrs[filterAttrName];

		// attr may be an unfetched gene
		if (attr) {
			// count occurrences of filtered value.

			let attrData = attr.data;
			for(let j = 0; j < indices.length; j++) {
				while (attrData[indices[j]] === filterVal) {
					// Remove value from indices.
					// Note that indices will be unsorted after this
					indices[j] = indices[indices.length - 1];
					indices.pop();
				}
			}
		}
	}

	// Convert to typed array
	let newIndices = Uint32Array.from(indices);

	// In some cases, we just want to know which indices
	// are present, and iterating by ascending indices
	// will be more cache friendly in that case.
	// Hence, we save a separate set of indices.
	let ascendingIndices = newIndices.slice(0);
	ascendingIndices.sort(compareIndices);

	return {
		indices: sortFilterIndices(data, order, newIndices),
		ascendingIndices,
	};
}

function compareIndices(i, j){ return i - j; }
