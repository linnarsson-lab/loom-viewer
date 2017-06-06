import { merge } from '../js/util';

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

export function maybeSortIndices(state, newState, action) {
	const { path } = action;
	const { row, col } = state.list[path];
	const newDataset = newState.list[path];
	const newRow = newDataset.row;
	const newCol = newDataset.col;
	const rowOrder = newDataset.viewState.row.order;
	const colOrder = newDataset.viewState.col.order;

	let i = rowOrder.length;
	while (i--) {
		const { key } = rowOrder[i];
		// If these differ, it's because it was a row
		// that was fetched. In that case we need to update
		// the sortFilterIndices
		if (row.attrs[key] !== newRow.attrs[key]) {
			newState.list[path].row.sortFilterIndices = sortFilterIndices(newRow, rowOrder);
			break;
		}
	}

	i = colOrder.length;
	while (i--) {
		const { key } = colOrder[i];
		if (col.attrs[key] !== newCol.attrs[key]) {
			newState.list[path].col.sortFilterIndices = sortFilterIndices(newCol, colOrder);
			break;
		}
	}

	return newState;
}