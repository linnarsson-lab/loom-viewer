// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';
// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import JSURL from 'jsurl';
import { merge } from '../js/util';


import {
	// REQUEST_PROJECTS,
	// REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	// REQUEST_DATASET,
	// REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	SEARCH_DATASETS,
	SORT_DATASETS,
	FILTER_METADATA,
	SORT_ROW_METADATA,
	SORT_COL_METADATA,
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

function updateViewState(state, action) {
	let { path, viewState } = action;
	viewState = merge(state.list[path].viewState, viewState);
	return merge(state,
		{
			list: {
				[path]: { viewState },
			},
		}
	);
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

function updateDatasetSortOrder(state, key) {
	return merge(state, {
		order: (state.order.key === key) ?
			{ key: state.order.key, asc: !state.order.asc } : { key, asc: true },
	});
}

function updateFiltered(state, action) {
	// toggle filtered state in relevant uniques entry
	const { path, axis, attrName, val } = action;
	const dataset = state.list[path];
	const axisData = dataset[axis];
	let attr = axisData.attrs[attrName];
	const oldUniques = attr.uniques;
	let uniques = [], filtered = true;
	for (let i = 0; i < oldUniques.length; i++) {
		let uniqueEntry = oldUniques[i];
		if (val === uniqueEntry.val) {
			filtered = !uniqueEntry.filtered;
			uniques.push(merge(uniqueEntry, { filtered }));
		} else {
			uniques.push(uniqueEntry);
		}
	}

	// update filterCount
	let filterCount = axisData.filterCount.slice(0),
		changedIndices = false;
	if (filtered) {
		for (let i = 0; i < filterCount.length; i++) {
			if (attr.data[i] === val) {
				// we only have a different filtered indices
				// if we filter more than before, which
				// implies at least one value filterCount
				// went from zero to one (note prefix increment).
				changedIndices = ++filterCount[i] === 1 || changedIndices;
			}
		}
	} else {
		for (let i = 0; i < filterCount.length; i++) {
			if (attr.data[i] === val) {
				// we only have a different filtered indices
				// if we filter less than before, which
				// implies at least one value filterCount
				// went from one to zero (note postfix decrement).
				changedIndices = filterCount[i]-- === 1 || changedIndices;
			}
		}
	}

	let newState = {
		list: {
			[path]: {
				[axis]: {
					filterCount,
					attrs: {
						[attrName]: {
							uniques,
						},
					},
				},
			},
		},
	};

	// If we didn't change the selection of filtered values,
	// then there is no need to replace and sort the previous
	// sortedFilterIndices.
	// By keeping the old array we can do a simple pointer
	// comparison to the array to check if it changed,
	// instead of having to do a deep inspection.
	if (changedIndices) {
		let newIndices = [];
		for (let i = 0; i < filterCount.length; i++) {
			if (filterCount[i] === 0) {
				newIndices.push(i);
			}
		}
		newState.list[path][axis].sortedFilterIndices = sortFilterIndices(axisData, dataset.viewState[axis].order, newIndices);
	}

	return merge(state, newState);
}

function updateAttrSort(state, action) {
	const { path, axis, attrName } = action;
	const dataset = state.list[path];
	const axisData = dataset[axis];
	let order = dataset.viewState[axis].order.slice();

	let orderEntry;
	// check if selected order is the first one
	// if so, switch ascending/descending
	if (order[0].key === attrName) {
		orderEntry = { key: attrName, asc: !order[0].asc };
	} else if (order.length > 1) {
		// check if the selected attribute is in the
		// last n attributes, and if so bump it to the front
		// If no matching attribute is found, bump everything
		let i = order.length;
		while (i--) {
			if (order[i].key === attrName) {
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
		orderEntry : { key: attrName, asc: true };

	const sortedFilterIndices = sortFilterIndices(axisData, order);
	const newState = {
		list: {
			[path]: {
				viewState: { [axis]: { order } },
				[axis]: {
					sortedFilterIndices,
				},
			},
		},
	};
	return setViewStateURL(merge(state, newState), action);
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
	const { col, row } = state.list[path];
	const newDataset = newState.list[path];
	const newCol = newDataset.col;
	const newRow = newDataset.row;
	const colOrder = newDataset.viewState.col.order;
	const rowOrder = newDataset.viewState.row.order;

	for (let i = 0; i < colOrder.length; i++) {
		const { key } = colOrder[i];
		if (col.attrs[key] !== newCol.attrs[key]) {
			newState.list[path].col.sortFilterIndices = sortFilterIndices(newCol, colOrder);
			break;
		}
	}

	for (let i = 0; i < rowOrder.length; i++) {
		const { key } = rowOrder[i];
		if (row.attrs[key] !== newRow.attrs[key]) {
			newState.list[path].row.sortFilterIndices = sortFilterIndices(newRow, rowOrder);
			break;
		}
	}

	return newState;
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

		case SORT_ROW_METADATA:
		case SORT_COL_METADATA:
			return updateAttrSort(state, action);

		case FILTER_METADATA:
			return updateFiltered(state, action);

		default:
			return state;
	}
}

const loomAppReducer = combineReducers({ datasets });
export default loomAppReducer;