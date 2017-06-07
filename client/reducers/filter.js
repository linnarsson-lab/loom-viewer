import { sortFilterIndices } from './sort-dataset';

export function updateFilteredIndices(filter, order, data) {
	let indices = new Array(data.length);

	let i = data.length;
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

	// convert to typed array
	const arrayType = indices.length < 256 ? Uint8Array :
			indices.length < 65535 ? Uint16Array : Uint32Array;
	indices = arrayType.from(indices);

	return sortFilterIndices(data, order, indices);
}
