import { updateFilteredIndices } from './filter';

import { merge, mergeInPlace } from '../js/util';

export function updateDatasetSortOrder(state, key) {
	return merge(state, {
		order: (state.order.key === key) ?
			{ key: state.order.key, asc: !state.order.asc } : { key, asc: true },
	});
}

export function updateSortOrder(order, sortAttrName) {
	order = order.slice();

	let orderEntry;
	// check if selected order is the first one
	// if so, switch ascending/descending
	if (order[0].key === sortAttrName) {
		orderEntry = { key: sortAttrName, asc: !order[0].asc };
	} else if (order.length > 1) {
		// check if the selected attribute is in the
		// last n attributes, and if so bump it to the front
		// If no matching attribute is found, bump everything
		let i = order.length;
		while (i--) {
			if (order[i].key === sortAttrName) {
				orderEntry = order[i];
				break;
			}
		}
		i = i === -1 ? order.length - 1 : i;
		while (i--) {
			order[i + 1] = order[i];
		}
	}
	order[0] = orderEntry ?
		orderEntry : { key: sortAttrName, asc: true };
	return order;
}

/** mutates and returns indices */
export function sortFilterIndices(axisData, order, indices) {
	let attrs = [], ascending = [];

	// attr may be a gene being fetched, so its data might be undefined
	for (let i = 0; i < order.length; i++) {
		const { key, asc } = order[i];
		const attr = axisData.attrs[key];
		// an attribute could be a gene that is still
		// being fetched, in which case it is undefined
		if (attr) {
			ascending.push(asc ? -1 : 1);
			attrs.push(attr);
		}
	}

	if (attrs.length) {
		// The comparator is somewhat tricky:
		// We want to sort the indices,
		// which are used to look up and compare
		// entries in the various attributes
		const comparator = (a, b) => {
			let rVal = 0;
			for (let i = 0; i < attrs.length; i++) {
				const { data } = attrs[i];
				const aVal = data[a], bVal = data[b];
				if (aVal === bVal) {
					continue;
				}
				rVal = aVal < bVal ? ascending[i] : -ascending[i];
				break;
			}
			return rVal;
		};
		indices.sort(comparator);
	}
	return indices;
}

export function maybeSortIndices(state, action) {
	const { path, genes } = action;
	const dataset = state.list[path];
	const { order, filter, originalIndices } = dataset.viewState.col;

	let attrKeys = [];

	let i = order.length;
	while (i--) {
		attrKeys.push(order[i].key);
	}

	i = filter.length;
	while (i--) {
		attrKeys.push(filter[i].attr);
	}

	i = genes.length;
	while (i--) {
		const key = attrKeys[i];
		if (genes.indexOf(key) !== -1) {

			const newIndices = updateFilteredIndices(filter, order, dataset.col, originalIndices);
			mergeInPlace(action.state, {
				list: {
					[path]: {
						viewState: {
							col: newIndices,
						},
					},
				},
			});
		}
	}

	return merge(state, action.state);
}
