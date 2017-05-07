// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';
// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import { compressToEncodedURIComponent } from 'lz-string';
import { merge, mergeInplace, disjointArrays } from '../js/util';


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
 * `action` can optionally have "state" trees
 * to "declaratively" modify the old state tree.
 *
 * `action.state` must be a tree of new values to merge into the old
 *   state tree, resulting in the new state.
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
	const dataset = state.list[path];
	const encodedVS = JSON.stringify(dataset.viewStateConverter.encode(dataset.viewState));
	const compressedViewState = compressToEncodedURIComponent(encodedVS);
	const url = `/dataset/${view}/${path}/${compressedViewState}`;
	browserHistory.replace(url);
	return state;
}

// Merges new viewState, and updates sorting and filter data
// if necessary.
function updateViewState(state, action) {
	const { path, axis } = action;
	let dataset = state.list[path];
	let prevViewState = dataset.viewState;
	const prevRowFilter = prevViewState.row.filter,
		prevColFilter = prevViewState.col.filter;

	let viewState = merge(prevViewState, action.viewState);

	if (action.sortAttrName) {
		let order = updateAttrSort(viewState[axis].order, action.sortAttrName);
		viewState = merge(viewState, { [axis]: { order } });
	}

	if (action.filterAttrName) {
		const { filterAttrName, filterVal } = action;
		let filter = viewState[axis].filter.slice();
		let i = filter.length;
		while (i--) {
			let filterEntry = filter[i];
			if (filterEntry.attr === filterAttrName &&
				filterEntry.val === filterVal) {
				break;
			}
		}
		if (i === -1) {
			// a new filter entry
			filter.push({ attr: filterAttrName, val: filterVal });
		} else {
			filter[i] = filter[filter.length - 1];
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
		i = i === -1 ? order.length - 1 : i;
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

function sortFilterIndices(axisData, order, sortedFilterIndices) {
	let attrs = [], ascending = [];
	sortedFilterIndices = sortedFilterIndices ? sortedFilterIndices : axisData.sortedFilterIndices.slice();

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