// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

import {
	REQUEST_PROJECTS,
	REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	REQUEST_DATASET,
	REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	REQUEST_GENE,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
	SET_HEATMAP_PROPS,
	SET_GENESCAPE_PROPS,
	SET_LANDSCAPE_PROPS,
	SET_SPARKLINE_PROPS,
} from '../actions/actionTypes';

// Until we get that spread object operator to work
// we might as well create some helper-functions
function merge(...args) {
	return Object.assign({}, ...args);
}

// pattern used for merging various view states
// and fetchedGenes with their respective datasets
function mergeDataSetState(state, action, stateName) {
	const prevDataSet = state.dataSets[action.datasetName];
	const newState = merge(prevDataSet[stateName], action[stateName] );
	const dataSet = merge(prevDataSet, { [stateName]: newState });
	const dataSets = merge(state.dataSets, { [action.datasetName]: dataSet });
	return merge(state, { dataSets });
}

// Keeps track of projects and datasets, including managing asynchronous fetching
const initialData = {
	isFetchingData: false,
	errorFetchingData: false,

	//	{
	//		'Midbrain': [{ 'dataset': 'mouse_midbrain.loom', 'isCached': false}, ... ],
	// 	'Cortex': ...
	//	}
	projects: undefined,

	// dataSets object will store fetched datasets & genes for caching purposes.
	dataSets: {},
};

function data(state = initialData, action) {
	switch (action.type) {
		//===PROJECT ACTIONS===
	case REQUEST_PROJECTS:
		return merge(state, { isFetchingData: true, errorFetchingData: false });

	case RECEIVE_PROJECTS:
		return merge(state, {
			isFetchingData: false,
			projects: action.projects,
		});

	case REQUEST_PROJECTS_FAILED:
		return merge(state, { isFetchingData: false, errorFetchingData: true });

		//===DATASET ACTIONS===
	case REQUEST_DATASET:
		return merge(state, { isFetchingData: true, errorFetchingData: false });

	case RECEIVE_DATASET:
		// initialise empty fetchedGenes cache
		const dataSet = merge(action.dataSet, { fetchedGenes: {} });
		return merge(state, {
			isFetchingData: false,
			hasDataset: true,
			dataSets: merge(state.dataSets, { [dataSet.dataset]: dataSet }),
		});

	case REQUEST_DATASET_FAILED:
		return merge(state, { isFetchingData: false, errorFetchingData: true });

		//===GENE ACTIONS===
	case REQUEST_GENE:
		return merge(state, { isFetchingData: true, errorFetchingData: false });

	case RECEIVE_GENE:
		return mergeDataSetState(state, action, 'fetchedGenes');

	case REQUEST_GENE_FAILED:
		return merge(state, { isFetchingData: false, errorFetchingData: true });

		//===VIEW ACTIONS===

	case SET_HEATMAP_PROPS:
		return mergeDataSetState(state, action, 'heatmapState');

	case SET_SPARKLINE_PROPS:
		return mergeDataSetState(state, action, 'sparklineState');

	case SET_LANDSCAPE_PROPS:
		return mergeDataSetState(state, action, 'landscapeState');

	case SET_GENESCAPE_PROPS:
		return mergeDataSetState(state, action, 'genescapeState');

	default:
		return state;
	}
}

const loomAppReducer = combineReducers({
	data,
	routing: routerReducer,
});

export default loomAppReducer;