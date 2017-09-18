import { merge, mergeInPlace } from '../js/util';

import { updateSortOrder } from './sort-dataset';

import { updateFilteredIndices } from './filter';


// Merges new viewState, and if necessary updates sorting and filtering
export function updateViewState(state, action) {
	let { path, axis } = action;
	const dataset = state.list[path];

	const pVS = dataset.viewState;
	let viewState = merge(dataset.viewState, action.viewState);

	if (action.sortAttrName) {
		viewState = updateOrder(viewState, action.sortAttrName, axis);
	}
	if (action.filterAttrName) {
		viewState = updateFilter(viewState, action, axis);
	}

	if (action.sortAttrName || action.filterAttrName) {
		viewState = updateIndices(dataset, viewState, axis);
	} else {
		// check if we updated the filter from encoded URL state
		if (!pVS || pVS.row.order !== viewState.row.order ||
			viewState.row.filter !== pVS.row.filter) {
			viewState = updateIndices(dataset, viewState, 'row');
		}
		if (!pVS || pVS.col.order !== viewState.col.order ||
			viewState.col.filter !== pVS.col.filter) {
			viewState = updateIndices(dataset, viewState, 'col');
		}
	}

	return merge(state,
		{
			list: {
				[path]: { viewState },
			},
		}
	);
}

function updateOrder(viewState, sortAttrName, axis) {
	let order = updateSortOrder(viewState[axis].order, sortAttrName);
	return merge(viewState, { [axis]: { order } });
}

function updateFilter(viewState, action, axis) {
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
		// a filter being removed
		filter[i] = filter[filter.length - 1];
		filter.pop();
	}
	return merge(viewState, { [axis]: { filter } });
}

function updateIndices(dataset, viewState, axis) {
	const { filter, order } = viewState[axis];
	// note: updateFilteredIndices returns unsorted indices
	const newIndices = updateFilteredIndices(filter, order, dataset[axis]);
	// at this point, we know that both viewState and viewState[axis]
	// are new objects, so we can use mergeInPlace
	return mergeInPlace(viewState, { [axis]: newIndices });
}

// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import { compressToEncodedURIComponent } from '../js/lz-string';

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
