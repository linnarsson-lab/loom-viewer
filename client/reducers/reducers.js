// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';
// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import JSURL from 'jsurl';
import { arrayConstr, prune, merge } from '../js/util';


import {
	// REQUEST_PROJECTS,
	// REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	// REQUEST_DATASET,
	// REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	SEARCH_DATASETS,
	SORT_DATASETS,
	SEARCH_METADATA,
	FILTER_METADATA,
	SORT_GENE_METADATA,
	SORT_CELL_METADATA,
	REQUEST_GENE,
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
	let newState = action.prune ? prune(state, action.prune) : state;
	newState = action.state ? merge(newState, action.state) : newState;
	return newState;
}

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
	return merge(state,
		{
			dataSets: {
				[datasetName]: { [viewStateName]: newViewState },
			},
		}
	);
}

function updateFilter(state, action) {

	// first toggle filter in metadata & update
	// relevant (row|col)Filtered array
	let newState = updateMostFrequent(state, action);

	// update indices - pre-calc filtered data
	const { dataset, attr } = action;
	let { newAttrs, filteredGenes } = updateFilterIndices(newState.dataSets[dataset], attr);
	// Check which attributes are invisible due to other attribute filters
	// turned off because it slowed things down too much
	// newAttrs = updateVisible(newAttrs);
	const dataSetUpdate = filteredGenes ?
		{ [attr]: newAttrs, fetchedGenes: filteredGenes } : { [attr]: newAttrs };
	let attrIndicesTree = {
		dataSets: {
			[dataset]: dataSetUpdate,
		},
	};
	newState = merge(newState, attrIndicesTree);
	return newState;
}

function updateMostFrequent(state, action) {
	const { dataset, attr, key, val } = action;
	const ds = state.dataSets[dataset];
	let attrData = ds[attr][key];
	let mostFrequent = attrData.mostFrequent.slice(0);
	// update filtered in metadata
	let filtered;
	for (let i = 0; i < mostFrequent.length; i++) {
		let mf = mostFrequent[i];
		if (val === mf.val) {
			filtered = !mf.filtered;
			mostFrequent[i] = merge(mf, { filtered });
			break;
		}
	}
	// update filtered array;
	let filteredArray = attr === 'colAttrs' ? ds.colFiltered.slice(0) : ds.rowFiltered.slice(0);
	if (filtered){
		for (let i = 0, data = attrData.data; i < filteredArray.length; i++){
			if (data[i] === val){ filteredArray[i]++; }
		}
	} else {
		for (let i = 0, data = attrData.data; i < filteredArray.length; i++){
			if (data[i] === val){ filteredArray[i]--; }
		}
	}
	filtered = attr === 'colAttrs' ? 'colFiltered' : 'rowFiltered';
	let filterTree = {
		dataSets: {
			[dataset]: {
				[filtered]: filteredArray,
				[attr]: {
					[key]: merge(attrData, { mostFrequent }),
				},
			},
		},
	};
	return merge(state, filterTree);
}

function updateFilterIndices(ds, attr) {
	const attributes = ds[attr];
	const isColAttrs = attr === 'colAttrs';

	const [filtered, order, attrKeys] = isColAttrs ?
	[ds.colFiltered, ds.colOrder, ds.colKeys] :
	[ds.rowFiltered, ds.rowOrder, ds.rowKeys];

	// filter indices
	//let indices = attributes['(original order)'].data.slice(0);
	let indices = filterIndices(filtered);
	// Sort indices according to sort settings
	indices = sortAttrIndices(indices, order, attributes);
	// Update newly data according to new filter/sort settings
	let newAttrs = updateAttrs(indices, attrKeys, attributes);

	let filteredGenes;
	if (isColAttrs) {
		filteredGenes = updateFilteredGenes(ds.fetchedGenes, indices);
	}
	return { newAttrs, filteredGenes };
}

function filterIndices(filtered) {
	let indices = [];
	let maxVal = 0;
	for (let i = 0; i < filtered.length; i++) {
		if (!filtered[i]){
			indices.push(i);
			maxVal = i;
		}
	}

	// convert to typed arrays for indexing speed.
	if (maxVal < 256) {
		return Uint8Array.from(indices);
	} else if (maxVal < 65536) {
		return Uint16Array.from(indices);
	} if (maxVal < 4294967296) {
		return Uint32Array.from(indices);
	}
	return Float64Array.from(indices);
}

function sortAttrIndices(indices, order, attributes) {

	let retVal = new Int8Array(order.length);
	for (let i = 0; i < order.length; i++) {
		retVal[i] = order[i].ascending ? 1 : -1;
	}
	const comparator = (a, b) => {
		for (let i = 0; i < order.length; i++) {
			let data = attributes[order[i].key].data;
			if (data[a] < data[b]) {
				return -retVal[i];
			} else if (data[a] > data[b]) {
				return retVal[i];
			}
		}
		return 0;
	};
	return indices.sort(comparator);
}

function updateAttrs(indices, attrKeys, attributes) {
	let newAttrs = {};
	for (let i = 0; i < attrKeys.length; i++) {
		const key = attrKeys[i];
		const { data, arrayType } = attributes[key];
		const constr = arrayConstr(arrayType);
		let filteredData = new constr(indices.length);
		for (let j = 0; j < indices.length; j++) {
			filteredData[j] = data[indices[j]];
		}
		newAttrs[key] = merge(attributes[key], { filteredData });
	}
	return newAttrs;
}

function updateFilteredGenes(fetchedGenes, indices) {
	let newGenes = {};
	for (let i = 0, keys = Object.keys(fetchedGenes); i < keys.length; i++) {
		const key = keys[i];
		const {data, arrayType } = fetchedGenes[key];
		const constr = arrayConstr(arrayType);
		let filteredData = new constr(indices.length);
		for (let j = 0; j < indices.length; j++) {
			filteredData[j] = data[indices[j]];
		}
		newGenes[key] = merge(fetchedGenes[key], { filteredData });
	}
	return newGenes;
}

function updateAttrOrder(order, key) {
	let newOrder = Array.from(order);
	let idx = newOrder.length;
	while (idx--) {
		if (key === newOrder[idx].key) {
			break;
		}
	}
	let t = newOrder[idx];
	if (idx) { // if idx > 0
		while (idx--) {
			newOrder[idx + 1] = newOrder[idx];
		}
		newOrder[0] = t;
	} else {
		// Already in front of array, toggle ascending
		newOrder[0] = { key: t.key, ascending: !t.ascending };
	}
	return newOrder;
}

function updateGeneSortOrder(state, action) {
	const { key, dataset } = action;
	const ds = state.dataSets[dataset];
	const { rowAttrs, rowKeys } = ds;
	// set new sort order
	let rowOrder = updateAttrOrder(ds.rowOrder, key);
	let indices = rowAttrs['(original order)'].filteredData;

	// Sort indices according to new sort settings
	indices = sortAttrIndices(indices, rowOrder, rowAttrs);

	// Update newly data according to new filter/sort settings
	let newAttrs = updateAttrs(indices, rowKeys, rowAttrs);
	return merge(state, {
		dataSets: {
			[dataset]: { rowAttrs: newAttrs, rowOrder },
		},
	});
}

function updateCellSortOrder(state, action) {
	const { key, dataset } = action;
	const ds = state.dataSets[dataset];
	const { colAttrs, colKeys, fetchedGenes } = ds;
	// set new sort order
	let colOrder = updateAttrOrder(ds.colOrder, key);
	let indices = colAttrs['(original order)'].filteredData;

	// Sort indices according to new sort settings
	indices = sortAttrIndices(indices, colOrder, colAttrs);

	// Update newly data according to new filter/sort settings
	let newAttrs = updateAttrs(indices, colKeys, colAttrs);
	let newGenes = updateFilteredGenes(fetchedGenes, indices);
	return merge(state, {
		dataSets: {
			[dataset]: { colAttrs: newAttrs, colOrder, fetchedGenes: newGenes },
		},
	});
}

function receivedGene(state, action) {
	const {gene, datasetName} = action;
	const indices = state.dataSets[datasetName].colAttrs['(original order)'].filteredData;
	let filteredData = new Float64Array(indices.length);
	const {data} = action.state.dataSets[datasetName].fetchedGenes[gene];
	for (let i = 0; i < indices.length; i++) {
		filteredData[i] = data[indices[i]];
	}
	action.state.dataSets[datasetName].fetchedGenes[gene].filteredData = filteredData;
	return update(state, action);
}

function updateDatasetSortOrder(state, key) {
	const sortKeys = state.projects.sortKeys.slice(0);
	let keyIdx = sortKeys.length;
	while (keyIdx--) {
		if (sortKeys[keyIdx].key === key) { break; }
	}
	if (keyIdx === -1) { // invalid key
		return state;
	} else if (keyIdx) {
		while (keyIdx--) {
			sortKeys[keyIdx + 1] = sortKeys[keyIdx];
		}
		sortKeys[0] = { key, ascending: true };
	} else { // sortKey was on top already, toggle ascending
		sortKeys[0] = { key, ascending: !sortKeys[0].ascending };
	}
	return merge(state, { projects: { sortKeys } });
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
	switch (action.type) {
		case RECEIVE_PROJECTS:
		case RECEIVE_DATASET:
		case SEARCH_DATASETS:
		case SEARCH_METADATA:
		case REQUEST_GENE:
		case REQUEST_GENE_FAILED:
			return update(state, action);

		case RECEIVE_GENE:
			return receivedGene(state, action);

		case SORT_DATASETS:
			return updateDatasetSortOrder(state, action.key);

		case SORT_GENE_METADATA:
			return updateGeneSortOrder(state, action);

		case SORT_CELL_METADATA:
			return updateCellSortOrder(state, action);

		case FILTER_METADATA:
			return updateFilter(state, action);

		//===VIEW ACTIONS===
		case SET_VIEW_PROPS:
			return setViewStateURL(state, action);

		default:
			return state;
	}
}

const loomAppReducer = combineReducers({ data });
export default loomAppReducer;