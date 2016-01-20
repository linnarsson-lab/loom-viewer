// See http://rackt.org/redux/docs/basics/Reducers.html
import L from "leaflet";
import { combineReducers } from 'redux'

const initialViewState = {
	view: 'Heatmap'
}
function viewState(state=initialViewState, action) {
	switch (action.type) {
		case 'SET_VIEW_STATE':
			return Object.assign({}, state,	{view: action.state });	// NOTE: must start with an empty object {} to ensure we don't mutate state
		default:
			return state
	}
}


const initialSparklineState = {
	colAttr: "Tissue",
	colMode: "Categorical",
	orderByAttr: "(unordered)",	// meaning, original order
	colorByAttr: "Tissue",
	colorByMode: "Categorical",
	genesToFind: ""
}

function sparklineState(state=initialSparklineState, action) {
	switch (action.type) {
		case 'SPARKLINE_SET_GENES_TO_FIND':
			return Object.assign({}, state,	{genesToFind: action.genes});
		case 'SPARKLINE_SET_COL_ATTR':
			return Object.assign({}, state,	{colAttr: action.attr});
		case 'SPARKLINE_SET_COL_MODE':
			return Object.assign({}, state,	{colMode: action.mode});
		case 'SPARKLINE_SET_COLOR_ATTR':
			return Object.assign({}, state,	{colorByAttr: action.attr});
		case 'SPARKLINE_SET_COLOR_MODE':
			return Object.assign({}, state,	{colorByMode: action.mode});
		case 'SPARKLINE_SET_ORDER_ATTR':
			return Object.assign({}, state,	{orderByAttr: action.attr});
		default:
			return state
	}
}


const initialLandscapeState = {
	xCoordinate: "_tSNE1",
	xGene: "",
	yCoordinate: "_tSNE2",
	yGene: "",
	colorAttr: "Tissue",
	colorMode: "Categorical",
	colorGene: ""
}

function landscapeState(state=initialLandscapeState, action) {
	switch (action.type) {
		case 'SET_LANDSCAPE_X':
			return Object.assign({}, state,	{xCoordinate: action.xCoordinate});
		case 'SET_LANDSCAPE_Y':
			return Object.assign({}, state,	{yCoordinate: action.yCoordinate});
		case 'SET_LANDSCAPE_COLOR_ATTR':
			return Object.assign({}, state,	{colorAttr: action.color});
		case 'SET_LANDSCAPE_COLOR_MODE':
			return Object.assign({}, state,	{colorMode: action.mode});
		case 'SET_LANDSCAPE_X_GENE':
			return Object.assign({}, state,	{xGene: action.gene});
		case 'SET_LANDSCAPE_Y_GENE':
			return Object.assign({}, state,	{yGene: action.gene});
		case 'SET_LANDSCAPE_COLOR_GENE':
			return Object.assign({}, state,	{colorGene: action.gene});
		default:
			return state
	}
}

const initialHeatmapState = {
	screenBounds: (0,0,0,0),	// Screen pixel coordinates of the dataset in the current view
	dataBounds: (0,0,0,0),		// Data coordinates of the current view
	center: L.latLng(0,0),
	zoom: 8,
	genesToFind: "Actb",
	selectedRowAttr: Object.keys(window.fileinfo.rowAttrs)[0],
	selectedRowMode: 'Text',
	selectedColAttr: Object.keys(window.fileinfo.colAttrs)[0],
	selectedColMode: 'Text'
}

function heatmapState(state=initialHeatmapState, action) {
	switch (action.type) {
		case 'SET_HEATMAP_BOUNDS':
			return Object.assign({}, state,	{dataBounds: action.dataBounds, screenBounds: action.screenBounds, center: action.center, zoom: action.zoom});	// NOTE: must start with an empty object {} to ensure we don't mutate state
		case 'SET_GENES_TO_FIND':
			return Object.assign({}, state,	{genesToFind: action.genes});
		case 'SET_SELECTED_ROW_ATTR':
			return Object.assign({}, state,	{selectedRowAttr: action.attr});
		case 'SET_SELECTED_COL_ATTR':
			return Object.assign({}, state,	{selectedColAttr: action.attr});
		case 'SET_SELECTED_ROW_MODE':
			return Object.assign({}, state,	{selectedRowMode: action.mode});
		case 'SET_SELECTED_COL_MODE':
			return Object.assign({}, state,	{selectedColMode: action.mode});
		default:
			return state
	}
}


const initialDataState = {
	isFetchingData: false,
	errorFetchingData: false,

	genes: {},		// contains row data by gene, i.e. {"Actb": [1,2,1,3,42,4,...]}
}

function dataState(state=initialDataState, action) {
	switch (action.type) {
		case 'REQUEST_GENE':
			return Object.assign({}, state,	{isFetchingData: true});
		case 'RECEIVE_GENE':
			return Object.assign({}, state,	{
				isFetchingData: false, 
				genes: Object.assign({}, state.genes, {
					[action.gene]: action.data
				})
			});
		case 'REQUEST_GENE_FAILED':
			return Object.assign({}, state,	{isFetchingData: false, errorFetchingData: true});
		default:
			return state
	}
}


// window.fileinfo is loaded in a <script> tag in index.html
const initialFileInfo = window.fileinfo;
//console.log(initialFileInfo);

function fileInfo(state=initialFileInfo, action) {
	switch (action.type) {
		default:
			return state
	}
}


const loomAppReducer = combineReducers({
	viewState,
	heatmapState,
	landscapeState,
	sparklineState,
	fileInfo,
	dataState
})

export default loomAppReducer