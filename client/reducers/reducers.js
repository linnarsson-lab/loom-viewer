// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';

import {
	REQUEST_PROJECTS,
	REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	REQUEST_DATASET,
	REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	SEARCH_DATASETS,
	SORT_DATASETS,
	SORT_GENE_METADATA,
	// FILTER_GENE_METADATA,
	SORT_CELL_METADATA,
	// FILTER_CELL_METADATA,
	REQUEST_GENE,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
	SET_VIEW_PROPS,
} from '../actions/actionTypes';

import { merge, prune } from '../js/util';

// Usage: action must have a "state" field and an optional
// "prune" field.
// action.prune is a tree of values of the old state tree to remove
// action.state is a tree of values to merge into the old state tree
// If an object is both pruned and in the new state, it means it is
// replaced as a whole.
function update(state, action) {
	let newState = action.prune ? prune(state, action.prune) : state;
	newState = action.state ? merge(newState, action.state) : newState;
	return newState;
}

// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import JSURL from 'jsurl';

function setViewStateURL(state, action) {
	const { viewStateName, datasetName, viewState } = action;
	let view = 'unknown';
	switch (viewStateName) {
	case 'heatmapState':
		view = 'heatmap';
		break;
	case 'sparklineState':
		view = 'sparklines';
		break;
	case 'landscapeState':
		view = 'cells';
		break;
	case 'genescapeState':
		view = 'genes';
		break;
	case 'geneMetadataState':
		view = 'genemetadata';
		break;
	case 'cellMetadataState':
		view = 'cellmetadata';
	}
	const dataSet = state.dataSets[datasetName];
	const project = dataSet.project;
	const newViewState = merge(dataSet[viewStateName], viewState);
	const url = `/dataset/${view}/${project}/${datasetName}/${JSURL.stringify(newViewState)}`;
	browserHistory.replace(url);
	return {
		dataSets: {
			[datasetName]: { [viewStateName]: newViewState },
		},
	};
}

// Keeps track of projects and datasets, including managing asynchronous fetching
const initialData = {
	//	{
	//		'Midbrain': [{ 'dataset': 'mouse_midbrain.loom', 'isCached': false}, ... ],
	// 	'Cortex': ...
	//	}
	projects: undefined,

	// dataSets object will store fetched datasets & genes for caching purposes.
	dataSets: {},
};

function data(state = initialData, action) {
	let ascending;
	switch (action.type) {

	case REQUEST_PROJECTS:			//===PROJECT ACTIONS===
	case RECEIVE_PROJECTS:
	case REQUEST_PROJECTS_FAILED:
	case REQUEST_DATASET:			//===DATASET ACTIONS===
	case REQUEST_DATASET_FAILED:
	case RECEIVE_DATASET:
	case REQUEST_GENE:				//===GENE ACTIONS===
	case RECEIVE_GENE:
	case REQUEST_GENE_FAILED:
		return update(state, action);

	case SEARCH_DATASETS:
		return merge(state, { search: merge(state.search, { [action.field]: action.search }) });

	case SORT_DATASETS:
		ascending = (state.sortKey && state.sortKey.key === action.key) ?
				!state.sortKey.ascending : true;
		return merge(state, { sortKey: { key: action.key, ascending } });

	case SORT_GENE_METADATA:
		ascending = (state.geneSortKey && state.geneSortKey.key === action.key) ?
				!state.geneSortKey.ascending : true;
		return merge(state, { geneSortKey: { key: action.key, ascending } });

	case SORT_CELL_METADATA:
		ascending = (state.cellSortKey && state.cellSortKey.key === action.key) ?
				!state.cellSortKey.ascending : true;
		return merge(state, { cellSortKey: { key: action.key, ascending } });


		//===VIEW ACTIONS===
	case SET_VIEW_PROPS:
		let newViewState = setViewStateURL(state, action);
		return merge(state, newViewState);

	default:
		return state;
	}
}

const loomAppReducer = combineReducers({ data });
export default loomAppReducer;