import { sortFilterIndices } from './sort-dataset';

export function updateFilteredIndices(data, filter, order, originalIndices) {
	let indices = Array.from(originalIndices);

	let typedArray = Float64Array;
	if (indices.length < (1 << 8)){
		typedArray = Uint8Array;
	} else if (indices.length < (1 << 16)){
		typedArray = Uint16Array;
	} else if (indices.length < (1 << 32)){
		typedArray = Uint32Array;
	}

	let i = filter.length;
	while (i--) {
		let filterEntry = filter[i];
		let filterAttrName = filterEntry.attr;
		let filterVal = filterEntry.val;

		let attr = data.attrs[filterAttrName];

		// attr may be an unfetched gene
		if (attr) {
			// count occurrences of filtered value.
			let j = indices.length;
			let attrData = attr.data;
			while (j--) {
				if (attrData[indices[j]] === filterVal) {
					// Remove value from indices.
					// Note that indices will be unsorted after this
					// Also note that we do not test values that
					// have already been filtered out, which should
					// speed things up a bit.
					indices[j] = indices[indices.length - 1];
					indices.pop();
				}
			}
		}
	}

	// Convert to typed array
	indices = typedArray.from(indices);

	// In some cases, we just want to know which indices
	// are present, and iterating by ascending indices
	// will be more cache friendly in that case.
	// Hence, we save a separate set of indices.
	let ascendingIndices = indices.slice(0);
	ascendingIndices.sort();

	return {
		indices: sortFilterIndices(data, order, indices),
		ascendingIndices,
	};
}
