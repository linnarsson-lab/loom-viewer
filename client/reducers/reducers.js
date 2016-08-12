// See http://rackt.org/redux/docs/basics/Reducers.html
import L from "leaflet";
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

const initialSparklineState = {
	type: SET_SPARKLINE_PROPS,	// This will be set to the last action type
	colAttr: "CellID",
	colMode: "Text",
	orderByAttr: "(none)",	// meaning, original order
	orderByGene: "",
	geneMode: "Heatmap",
	genes: "",
};

function sparklineState(state = initialSparklineState, action) {
	switch (action.type) {
	case SET_SPARKLINE_PROPS:
		return Object.assign({}, state, action);
	default:
		return state;
	}
}


const initialLandscapeState = {
	type: SET_LANDSCAPE_PROPS,	// This will be set to the last action type
	xCoordinate: "_tSNE1",
	xGene: "",
	yCoordinate: "_tSNE2",
	yGene: "",
	colorAttr: "CellID",
	colorMode: "Heatmap",
	colorGene: "",
};

function landscapeState(state = initialLandscapeState, action) {
	switch (action.type) {
	case SET_LANDSCAPE_PROPS:
		return Object.assign({}, state, action);
	default:
		return state;
	}
}

const initialGenescapeState = {
	type: SET_GENESCAPE_PROPS,	// This will be set to the last action type
	xCoordinate: "",
	yCoordinate: "",
	colorAttr: "",
	colorMode: "Heatmap",
};

function genescapeState(state = initialGenescapeState, action) {
	switch (action.type) {
	case SET_GENESCAPE_PROPS:
		return Object.assign({}, state, action);
	default:
		return state;
	}
}

const initialHeatmapState = {
	type: SET_HEATMAP_PROPS,	// This prop gets set by the reducer below, but we should ignore it
	screenBounds: (0, 0, 0, 0),	// Screen pixel coordinates of the dataset in the current view
	dataBounds: (0, 0, 0, 0),		// Data coordinates of the current view
	center: L.latLng(0, 0),
	zoom: 8,
	rowAttr: "",
	rowMode: 'Text',
	rowGenes: '',
	colAttr: "",
	colMode: 'Text',
	colGene: '',
};

function heatmapState(state = initialHeatmapState, action) {
	switch (action.type) {
	case SET_HEATMAP_PROPS:
		return Object.assign({}, state, action);
	default:
		return state;
	}
}

// Keeps track of projects and datasets, including managing asynchronous fetching
const initialData = {
	isFetchingData: false,
	errorFetchingData: false,

	// dict like
	//	{
	//		"Midbrain": [{ "dataset": "mouse_midbrain.loom", "isCached": false}, ... ],
	// 	"Cortex": ...
	//	}
	projects: undefined,

	// dataSets object will store fetched datasets for caching purposes.
	dataSets: {},

	// contains row data by gene, i.e. {"Actb": [1,2,1,3,42,4,...]}
	genes: undefined,
};

function data(state = initialData, action) {
	switch (action.type) {
		//===PROJECT ACTIONS===
	case REQUEST_PROJECTS:
		return Object.assign({}, state, { isFetchingData: true, errorFetchingData: false });

	case RECEIVE_PROJECTS:
		return Object.assign({}, state, {
			isFetchingData: false,
			projects: action.projects,
		});

	case REQUEST_PROJECTS_FAILED:
		return Object.assign({}, state, { isFetchingData: false, errorFetchingData: true });

		//===DATASET ACTIONS===
	case REQUEST_DATASET:
		return Object.assign({}, state, { isFetchingData: true, errorFetchingData: false });

	case RECEIVE_DATASET:
		return Object.assign({}, state, {
			isFetchingData: false,
			hasDataset: true,
			genes: {},
			dataSets: Object.assign({}, state.dataSets, action.dataset),
		});

	case REQUEST_DATASET_FAILED:
		return Object.assign({}, state, { isFetchingData: false, errorFetchingData: true });

		//===GENE ACTIONS===
	case REQUEST_GENE:
		return Object.assign({}, state, { isFetchingData: true, errorFetchingData: false });

	case RECEIVE_GENE:
		return Object.assign({}, state, {
			isFetchingData: false,
			genes: Object.assign({}, state.genes, {
				[action.gene]: action.data,
			}),
		});

	case REQUEST_GENE_FAILED:
		return Object.assign({}, state, { isFetchingData: false, errorFetchingData: true });
	default:
		return state;
	}
}

const loomAppReducer = combineReducers({
	heatmapState,
	landscapeState,
	genescapeState,
	sparklineState,
	data,
	routing: routerReducer,
});

export default loomAppReducer;