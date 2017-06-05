// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import { compressToEncodedURIComponent } from 'lz-string';
import { merge } from '../js/util';

import { updateAttrSort, sortFilterIndices } from './sort-dataset';

import { updateFiltered } from './filter';

export function setViewStateURL(state, action) {
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
export function updateViewState(state, action) {
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
		viewState = merge( viewState, { [axis]: { filter } });
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
