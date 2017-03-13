// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';
// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import JSURL from 'jsurl';
import { merge, disjointArrays } from '../js/util';


import {
	// REQUEST_PROJECTS,
	// REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	// REQUEST_DATASET,
	// REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	SEARCH_DATASETS,
	SORT_DATASETS,
	REQUEST_GENE_FETCH,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
	SET_VIEW_PROPS,
} from '../actions/actionTypes';

/**
 * Usage: action can optionally have "prune" and "state" trees
 * to "declaratively" modify the old state tree.
 * - action.prune is a tree of values of the old state tree to
 *   "remove" (by not copying them to the new state). Only leaves
 *   will be pruned
 * - action.state is a tree of new values to merge into the old
 *   state tree, resulting in the new state.
 * If both are provided, prune is applied first (which lets us
 * _replace_ objects wholesale, instead of merging them).
 * IMPORTANT: use simple, "plain" JS objects only; this borks when
 * passed JSX objects, for example.
 */
function update(state, action) {
	// // We're not using prune for now, so we might as well comment it out
	// let newState = action.prune ? prune(state, action.prune) : state;
	// return action.state ? merge(newState, action.state) : newState;
	return merge(state, action.state);
}

function setViewStateURL(state, action) {
	let { stateName, path } = action;
	let view = 'unknown';
	switch (stateName) {
		case 'heatmap':
			view = 'heatmap';
			break;
		case 'sparkline':
			view = 'sparklines';
			break;
		case 'landscape':
			view = 'cells';
			break;
		case 'genescape':
			view = 'genes';
			break;
		case 'geneMD':
			view = 'genemetadata';
			break;
		case 'cellMD':
			view = 'cellmetadata';
			break;
		default:
			// A bit hackish, but basically we default to current view
			view = browserHistory.getCurrentLocation().pathname.split('/')[2];
	}
	const { viewState } = state.list[path];
	const url = `/dataset/${view}/${path}/${JSURL.stringify(viewState)}`;
	browserHistory.replace(url);
	return state;
}

// Merges new viewState, and updates sorting and filter data
// if necessary.
function updateViewState(state, action) {
	const { path } = action;
	let dataset = state.list[path];
	let prevViewState = dataset.viewState;
	const prevRowFilter = prevViewState.row.filter,
		prevColFilter = prevViewState.col.filter;

	let viewState = merge(prevViewState, action.viewState);

	if (action.sortAttrName) {
		const { axis } = action;
		let order = updateAttrSort(viewState[axis].order, action.sortAttrName);
		viewState = merge(viewState, {
			[axis]: { order },
		});
	}

	if (action.filterAttrName) {
		const { filterAttrName, filterVal, axis } = action;
		let filter = viewState[axis].filter.slice();
		let i = filter.length;
		while (i--) {
			let filterEntry = filter[i];
			if (filterEntry.attr === filterAttrName &&
				filterEntry.val === filterVal) {
				break;
			}
		}
		if (i === -1){
			// a new filter entry
			filter.push({attr: filterAttrName, val: filterVal});
		} else {
			filter[i] = filter[filter.length-1];
			filter.pop();
		}
		// remember that merge returns a new object,
		// so here we can safely replace entries in viewState
		// viewState without breaking the redux guarantee of
		// immutability.
		viewState[axis].filter = filter;
	}

	dataset = merge(dataset, { viewState });

	// see if filter settings were overwritten by new viewState
	let rowFilterChanged = viewState.row.filter !== prevRowFilter,
		colFilterChanged = viewState.col.filter !== prevColFilter;
	if (rowFilterChanged) {
		dataset = merge(dataset,
			updateFiltered(dataset, 'row', prevRowFilter)
		);
	}
	if (colFilterChanged) {
		dataset = merge(dataset,
			updateFiltered(dataset, 'col', prevColFilter)
		);
	}

	// Two scenarios when we need to sort:
	// - if we were passed viewState with a new order,
	// - if we have different indices after calling updateFiltered.
	// First is comparing order array in viewState,
	// last one by comparing sortedFilterIndices.
	// Because we re-use these arrays if they are unchanged,
	// a pointer comparison suffices.
	if (prevViewState.col.order !== viewState.col.order ||
		dataset.col.sortedFilterIndices !==
		state.list[path].col.sortedFilterIndices) {
		sortFilterIndices(dataset.col, viewState.col.order, dataset.col.sortedFilterIndices);
	}
	if (prevViewState.row.order !== viewState.row.order ||
		dataset.row.sortedFilterIndices !==
		state.list[path].row.sortedFilterIndices) {
		sortFilterIndices(dataset.row, viewState.row.order, dataset.row.sortedFilterIndices);
	}

	return merge(state,
		{
			list: {
				[path]: dataset,
			},
		}
	);
}


function updateAttrSort(order, sortAttrName) {
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
		i = i === -1 ? order.length : i;
		while (i--) {
			order[i + 1] = order[i];
		}
	}
	order[0] = orderEntry ?
		orderEntry : { key: sortAttrName, asc: true };
	return order;
}

function updateFiltered(dataset, axis, prevFilter) {

	// after disjointArrays, prevFilter will only contain
	// formerly filtered values (if any), and filter only
	// to-be-filtered values.
	let filter = dataset.viewState[axis].filter.slice();
	prevFilter = prevFilter.slice();
	disjointArrays(filter, prevFilter);

	// Update filterCount.
	// we pass filterCount and keep changing the same array
	const prevFilterCount = dataset[axis].filterCount;
	let filterCount = prevFilterCount.slice();
	let newAttrs = {};
	let i = prevFilter.length;
	while (i--) {
		let filterEntry = prevFilter[i];
		newAttrs = merge(
			newAttrs,

			newFilterValues(dataset, axis, filterEntry.attr, filterEntry.val, false, filterCount).attrs
		);
	}
	i = filter.length;
	while (i--) {
		let filterEntry = filter[i];
		newAttrs = merge(
			newAttrs,
			newFilterValues(dataset, axis, filterEntry.attr, filterEntry.val, true, filterCount).attrs
		);
	}

	// TODO: update sortedFilterIndices if necessary
	// TODO: merge new attrs
	i = filterCount.length;
	let { sortedFilterIndices } = dataset[axis];
	while (i--) {
		// we only need to replace sortedFilterIndices
		// if there are any mismatches in zeros between
		// filterCount and newFilterCount
		let pfc = prevFilterCount[i], fc = filterCount[i];
		if ((pfc | fc) && // is at least one value nonzero?
			(pfc === 0 || fc === 0) // is at least one value zero?
		) {
			// make sure i isn't zero (we might happen to
			// only have a change on index zero)
			i++;
			break;
		}
	}
	// i is only bigger than zero if the above loop was aborted
	// early, implying a significant change in newFilterCount
	if (i > 0) {
		sortedFilterIndices = [];
		for (i = 0; i < filterCount.length; i++) {
			if (filterCount[i] === 0) {
				sortedFilterIndices.push(i);
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

function newFilterValues(dataset, axis, filterAttrName, filterVal, filtered, filterCount) {
	const axisData = dataset[axis];
	let attr = axisData.attrs[filterAttrName];
	const oldUniques = attr.uniques;
	let uniques = [];
	for (let i = 0; i < oldUniques.length; i++) {
		let uniqueEntry = oldUniques[i];
		if (filterVal === uniqueEntry.val) {
			uniques.push(merge(uniqueEntry, { filtered: !uniqueEntry.filtered }));
		} else {
			uniques.push(uniqueEntry);
		}
	}

	// update filterCount
	filterCount = filterCount ? filterCount : axisData.filterCount.slice(0);
	if (filtered) {
		for (let i = 0; i < filterCount.length; i++) {
			if (attr.data[i] === filterVal) {
				filterCount[i]++;
			}
		}
	} else {
		for (let i = 0; i < filterCount.length; i++) {
			if (attr.data[i] === filterVal) {
				filterCount[i]--;
			}
		}
	}

	return {
		filterCount,
		attrs: {
			[filterAttrName]: {
				uniques,
			},
		},
	};
}

function sortFilterIndices(axisData, order, sortedFilterIndices) {
	let attrs = [], ascending = [];
	sortedFilterIndices = sortedFilterIndices ? sortedFilterIndices : axisData.sortedFilterIndices.slice();

	// attr may be a gene being fetched, so undefined
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
		// We want to sort the sortedFilterIndices,
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
		sortedFilterIndices.sort(comparator);
	}
	return sortedFilterIndices;
}

function maybeSortIndices(state, newState, action) {
	const { path } = action;
	const { row, col } = state.list[path];
	const newDataset = newState.list[path];
	const newRow = newDataset.row;
	const newCol = newDataset.col;
	const rowOrder = newDataset.viewState.row.order;
	const colOrder = newDataset.viewState.col.order;

	for (let i = 0; i < rowOrder.length; i++) {
		const { key } = rowOrder[i];
		// If these differ, it's because it was a row
		// that was fetched. In that case we need to update
		// the sortFilterIndices
		if (row.attrs[key] !== newRow.attrs[key]) {
			newState.list[path].row.sortFilterIndices = sortFilterIndices(newRow, rowOrder);
			break;
		}
	}

	for (let i = 0; i < colOrder.length; i++) {
		const { key } = colOrder[i];
		if (col.attrs[key] !== newCol.attrs[key]) {
			newState.list[path].col.sortFilterIndices = sortFilterIndices(newCol, colOrder);
			break;
		}
	}

	return newState;
}

function updateDatasetSortOrder(state, key) {
	return merge(state, {
		order: (state.order.key === key) ?
			{ key: state.order.key, asc: !state.order.asc } : { key, asc: true },
	});
}

function datasets(state = {}, action) {
	let newState;
	switch (action.type) {
		case RECEIVE_PROJECTS:
		case RECEIVE_DATASET:
		case SEARCH_DATASETS:
		case REQUEST_GENE_FETCH:
		case REQUEST_GENE_FAILED:
			return update(state, action);

		case RECEIVE_GENE:
			newState = update(state, action);
			return maybeSortIndices(state, newState, action);


		//===VIEW ACTIONS===
		case SET_VIEW_PROPS:
			newState = updateViewState(state, action);
			return setViewStateURL(newState, action);

		case SORT_DATASETS:
			return updateDatasetSortOrder(state, action.key);

		default:
			return state;
	}
}

const loomAppReducer = combineReducers({ datasets });
export default loomAppReducer;