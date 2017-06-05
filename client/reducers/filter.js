import { merge, mergeInplace, disjointArrays } from '../js/util';

export function updateFiltered(dataset, axis, prevFilter) {

	// after disjointArrays, prevFilter will only contain
	// formerly filtered values (if any), and filter only
	// to-be-filtered values.
	let filter = dataset.viewState[axis].filter.slice();
	prevFilter = prevFilter.slice();
	disjointArrays(filter, prevFilter);

	// Update filterCount. First we decrease removed filters
	const axisData = dataset[axis], prevFilterCount = axisData.filterCount;
	// we pass filterCount and keep changing the same array
	let filterCount = prevFilterCount.slice(),
		newAttrs = {}, i = prevFilter.length;
	while (i--) {
		let filterEntry = prevFilter[i], filterAttrName = filterEntry.attr;
		let attr = newAttrs[filterAttrName] ? newAttrs[filterAttrName] : axisData.attrs[filterAttrName];
		if (attr){ // attr may be an unfetched gene
			newAttrs = mergeInplace(
				newAttrs,

				newFilterValues(attr, filterAttrName, filterEntry.val, false, filterCount).attrs
			);
		}
	}
	// Update filtercount. Increase added filters
	i = filter.length;
	while (i--) {
		let filterEntry = filter[i], filterAttrName = filterEntry.attr;
		let attr = newAttrs[filterAttrName] ? newAttrs[filterAttrName] : axisData.attrs[filterAttrName];
		if (attr){ // attr may be an unfetched gene
			newAttrs = mergeInplace(
				newAttrs,
				newFilterValues(attr, filterAttrName, filterEntry.val, true, filterCount).attrs
			);
		}
	}

	i = filterCount.length;
	let { sortedFilterIndices } = dataset[axis], mismatches = 0, sfiLength = 0;
	while (i--) {
		// we only need to replace sortedFilterIndices
		// if there are any mismatches in zeros between
		// filterCount and newFilterCount
		let pfc = prevFilterCount[i], fc = filterCount[i];
		if ((pfc | fc) && // is at least one value nonzero?
			(pfc === 0 || fc === 0) // is at least one value zero?
		) {
			mismatches++;
		}
		// count all zeros in the new filterCount
		if (fc === 0) {
			sfiLength++;
		}
	}
	// mismatches being nonzero implies a significant change in newFilterCount
	if (mismatches) {
		sortedFilterIndices = new Uint16Array(sfiLength);
		let i = filterCount.length;
		while (i--) {
			if (filterCount[i] === 0) {
				sortedFilterIndices[--sfiLength] = i;
			}
		}
	}

	return {
		[axis]: {
			filterCount,
			sortedFilterIndices,
			attrs: newAttrs,
		},
	};
}

function newFilterValues(attr, filterAttrName, filterVal, filtered, filterCount) {
	// const axisData = dataset[axis];
	// let attr = axisData.attrs[filterAttrName];
	const oldUniques = attr.uniques, data = attr.data;
	let i = oldUniques.length, uniques = new Array(i);
	while (i--) {
		let uniqueEntry = oldUniques[i];
		if (filterVal === uniqueEntry.val) {
			uniques[i] = merge(uniqueEntry, { filtered: !uniqueEntry.filtered });
		} else {
			uniques[i] = uniqueEntry;
		}
	}

	// update filterCount
	i = filterCount.length;
	if (filtered) {
		while (i--) {
			if (data[i] === filterVal) {
				filterCount[i]++;
			}
		}
	} else {
		while (i--) {
			if (data[i] === filterVal) {
				filterCount[i]--;
			}
		}
	}

	return {
		filterCount,
		attrs: {
			[filterAttrName]: {
				uniques,
				data,
			},
		},
	};
}

