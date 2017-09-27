import {
	merge,
	mergeInPlace,
} from 'js/util';

import { updateSortOrder } from 'reducers/sort-dataset';
import { updateFilteredIndices } from 'reducers/filter';

// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import { compressToEncodedURIComponent } from 'js/lz-string';

// Merges new viewState, and if necessary
// updates sorting and filtering
export function updateViewState(state, action) {
	const { path } = action;
	const dataset = state.list[path];

	// Update state tree with passed viewState first,
	// since this new state might be required for
	// sorting or filtering correctly later
	let newState = merge(state, {
		list: {
			[action.path]: {
				viewState: action.viewState,
			},
		},
	});

	// the change in viewState might change
	// affect sorting or filtering.
	if (action.sortAttrName || action.filterAttrName) {
		// note that at this point, viewState is a new
		// object and we can safely overwrite it
		let { viewState } = newState.list[path];
		mergeInPlace(newState.list[path].viewState,
			sortFilterUpdateIndices(dataset, viewState, action));
	}

	// Update URL to represent new viewState
	setViewStateURL(newState, action);

	return newState;
}

/**
 * sorting and/or filter settings changed,
 * so we need to update their state, as well
 * as the indices
 * @param {Object} dataset
 * @param {Object} viewState
 * @param {string} axis
 * @param {string} sortAttrName
 * @param {string} filterAttrName
 * @param {string} filterVal
 */
function sortFilterUpdateIndices(dataset, viewState, action) {
	const {
		axis,
		sortAttrName,
		filterAttrName,
		filterVal,
	} = action;

	let subSettings = {};

	if (sortAttrName) {
		subSettings.order = updateSortOrder(viewState[axis].order, sortAttrName);
	}
	if (filterAttrName) {
		subSettings.filter = updateFilter(viewState, filterAttrName, filterVal, axis);
	}

	if (sortAttrName || filterAttrName) {
		const { filter, order, originalIndices } = viewState[axis];
		const newIndices = updateFilteredIndices(filter, order, dataset[axis], originalIndices);
		subSettings.indices = newIndices.indices;
		subSettings.ascendingIndices = newIndices.ascendingIndices;
	}

	return subSettings;
}

function updateFilter(viewState, filterAttrName, filterVal, axis) {
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
		// a filter being removed
		filter[i] = filter[filter.length - 1];
		filter.pop();
	}
	return filter;
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
	const encodedVS = dataset.viewStateConverter.encode(dataset.viewState);
	const stringifiedVS = JSON.stringify(encodedVS);
	const compressedViewState = compressToEncodedURIComponent(stringifiedVS);
	const url = `/dataset/${view}/${path}/${compressedViewState}`;
	browserHistory.replace(url);
}
