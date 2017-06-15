import { sortFilterIndices } from './sort-dataset';

export function updateFilteredIndices(filter, order, data) {
	const { length } = data;
	let i = length,
		indices = new Array(i),
		arrayType = i < (1 << 8) ? Uint8Array :
			(i < (1 < 16) ? Uint16Array :
				(i < (1 << 32) ? Uint32Array : Float64Array)
			);

	while (i - 16 > 0) {
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
	}
	while (i--) {
		indices[i] = i;
	}

	i = filter.length;
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
	indices = arrayType.from(indices);

	// for scatterplots we sort by X and Y, so sorting
	// by ascending is more apprioriate as it will be
	// more cache friendly. Hence, we save a separate
	// set of indices.
	let ascendingIndices = indices.slice();
	ascendingIndices.sort();

	return {
		indices: sortFilterIndices(data, order, indices),
		ascendingIndices,
	};
}
