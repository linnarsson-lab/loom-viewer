import { sortFilterIndices } from './sort-dataset';
import { radixSortCopy } from '../js/radix-sorts';

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
	let newIndices = sortFilterIndices(data, order, Uint32Array.from(indices));
	// In some cases, we just want to know which indices
	// are present, and iterating over ascending indices
	// will be more cache friendly in that case.
	// So we save a separate set of sorted indices.
	let ascendingIndices = radixSortCopy(newIndices);

	return {
		indices: newIndices,
		ascendingIndices,
	};
}