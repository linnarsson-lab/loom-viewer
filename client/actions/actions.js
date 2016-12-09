import 'whatwg-fetch';

import {
	//REQUEST_PROJECTS,
	REQUEST_PROJECTS_FETCH,
	//REQUEST_PROJECTS_CACHED,
	REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	REQUEST_DATASET,
	// REQUEST_DATASET_FETCH,
	// REQUEST_DATASET_CACHED,
	REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	REQUEST_GENE,
	REQUEST_GENE_FETCH,
	REQUEST_GENE_CACHED,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
} from './actionTypes';

import { groupBy } from 'lodash';
import { convertArray, arrayConstr } from '../js/util';


///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch the list of projects
//
///////////////////////////////////////////////////////////////////////////////////////////


// function requestProjects() {
// 	return {
// 		type: REQUEST_PROJECTS,
// 	};
// }

function requestProjectsFetch() {
	return {
		type: REQUEST_PROJECTS_FETCH,
	};
}

// function requestProjectsCached() {
// 	return {
// 		type: REQUEST_PROJECTS_CACHED,
// 	};
// }

function requestProjectsFailed() {
	return {
		type: REQUEST_PROJECTS_FAILED,
	};
}

function receiveProjects(list) {
	// Initialise sorting order state
	let keys = Object.keys(list);
	// we actually need the metadata keys of a project,
	// since that's what we're sorting the list by
	keys = Object.keys(list[keys[0]][0]);
	let sortKeys = [];
	for (let i = 0; i < keys.length; i++) {
		sortKeys.push({ key: keys[i], ascending: true });
	}
	// sort by date by default
	for (let i = 0; i < keys.length; i++) {
		if (sortKeys[i].key === 'lastModified') {
			let date = sortKeys[i];
			date.ascending = false; //show newest first
			for (let j = i; j > 0; j--) {
				sortKeys[j] = sortKeys[j - 1];
			}
			sortKeys[0] = date;
			break;
		}
	}

	return {
		type: RECEIVE_PROJECTS,
		state: { projects: { list, sortKeys } },
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchProjects(projects) {
	return (dispatch) => {
		// Announce that the request has been started
		//dispatch(requestProjects());
		// Second, check if projects already exists in the store
		// If so, notify it is cached and return.
		// If not, perform a fetch request (async)
		if (projects) {
			// Announce we are retrieving from cache
			// return dispatch(requestProjectsCached());
			return;
		} else {
			// Announce we are fetching from server
			dispatch(requestProjectsFetch());
			return (
				fetch('/loom')
					.then((response) => { return response.json(); })
					.then((json) => {
						// Grouping by project must be done here, instead of in
						// the reducer, because if it is already in the store we
						// want to pass it back unmodified (see else branch below)
						const fetchedProjects = groupBy(json, (item) => { return item.project; });
						dispatch(receiveProjects(fetchedProjects));
					})
					// Or, if it failed, dispatch an action to set the error flag
					.catch((err) => {
						console.log({ err });
						dispatch(requestProjectsFailed());
					})
			);
		}
	};
}

///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch metadata for a dataSet
//
///////////////////////////////////////////////////////////////////////////////////////////


function requestDataSet(datasetName) {
	return {
		type: REQUEST_DATASET,
		datasetName: datasetName,
	};
}

// function requestDataSetFetch(datasetName) {
// 	return {
// 		type: REQUEST_DATASET_FETCH,
// 		datasetName: datasetName,
// 	};
// }


// function requestDataSetCached(datasetName) {
// 	return {
// 		type: REQUEST_DATASET_CACHED,
// 		datasetName: datasetName,
// 	};

// }

function requestDataSetFailed(datasetName) {
	return {
		type: REQUEST_DATASET_FAILED,
		datasetName: datasetName,
	};
}


function receiveDataSet(dataSet) {
	return {
		type: RECEIVE_DATASET,
		state: {
			dataSets: {
				[dataSet.dataset]: prepData(dataSet),
			},
		},
	};
}

// prep received dataset for actual usage.
function prepData(dataSet) {
	// store original order of rowAttrs and colAttrs,
	let origOrderKey = '(original order)';
	let rowKeys = Object.keys(dataSet.rowAttrs).sort();
	let colKeys = Object.keys(dataSet.colAttrs).sort();
	dataSet.rowAttrs[origOrderKey] = originalOrder(dataSet.rowAttrs[rowKeys[0]]);
	dataSet.colAttrs[origOrderKey] = originalOrder(dataSet.colAttrs[colKeys[0]]);
	// Store all the keys
	rowKeys.unshift(origOrderKey);
	colKeys.unshift(origOrderKey);
	dataSet.rowKeys = rowKeys;
	dataSet.colKeys = colKeys;
	// Initial sort order
	dataSet.rowOrder = rowKeys.map((key) => { return { key, ascending: true }; });
	dataSet.colOrder = colKeys.map((key) => { return { key, ascending: true }; });
	// convert attribute arrays to objects with summary
	// metadata (most frequent, filtered/visible)
	// '(original order)' isn't part of the regular
	// meta-data so we have to add it first
	let newRowAttrs = convertArrays(dataSet.rowAttrs);
	let newColAttrs = convertArrays(dataSet.colAttrs);
	dataSet.rowAttrs = newRowAttrs;
	dataSet.colAttrs = newColAttrs;
	// Add zero-initialised filter counting arrays, assumes
	// that we will never have more than 65,535 attributes
	dataSet.rowFiltered = new Uint16Array(dataSet.rowAttrs[origOrderKey].data.length);
	dataSet.colFiltered = new Uint16Array(dataSet.colAttrs[origOrderKey].data.length);
	// add empty fields for fetched genes
	dataSet.fetchedGenes = {};
	dataSet.fetchingGenes = {};
	dataSet.viewState = {};
	return dataSet;
}

function originalOrder(array) {
	let indices = new Int32Array(array.length);
	for (let i = 0; i < array.length; i++) {
		indices[i] = i;
	}
	return indices;
}


function convertArrays(attrs) {
	let keys = Object.keys(attrs);
	let newAttrs = {};
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i];
		newAttrs[key] = convertArray(attrs[key]);
	}
	return newAttrs;
}



// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchDataSet(data) {
	const { project, dataset, dataSets } = data;
	return (dispatch) => {
		// Announce that the request has been started
		dispatch(requestDataSet(dataset));
		// See if the dataset already exists in the store
		// If so, signal we use cached version.
		// If not, perform the request (async)
		if (dataSets[dataset]) {
			// Announce that the we are retrieving from cache
			// dispatch(requestDataSetCached(dataset));
		} else {
			//Announce that we are fetching from server
			// dispatch(requestDataSetFetch(dataset));
			return (fetch(`/loom/${project}/${dataset}`)
				.then((response) => {
					// convert the JSON to a JS object, and
					// do some prep-work
					return response.json();
				})
				.then((ds) => {
					// This goes last, to ensure the above defaults
					// are set when the views are rendered
					dispatch(receiveDataSet(ds));
				})
				.catch((err) => {
					// Or, if fetch request failed, dispatch
					// an action to set the error flag
					console.log({ err });
					dispatch(requestDataSetFailed(dataset));
				}));
		}
	};
}


///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch a row of values for a single gene for a dataset
//
///////////////////////////////////////////////////////////////////////////////////////////


function requestGene(gene, datasetName) {
	return {
		type: REQUEST_GENE,
		gene,
		datasetName,
	};
}

function requestGeneFetch(gene, datasetName) {
	return {
		type: REQUEST_GENE_FETCH,
		gene,
		datasetName,
	};
}

function requestGeneCached(gene, datasetName) {
	return {
		type: REQUEST_GENE_CACHED,
		gene,
		datasetName,
	};
}

function requestGeneFailed(gene, datasetName) {
	return {
		type: REQUEST_GENE_FAILED,
		gene,
		datasetName,
	};
}

function receiveGene(gene, datasetName, indices, data) {
	let convertedData = convertArray(data, 'number');
	const constr = arrayConstr(data.arrayType);
	convertedData.filteredData = new constr(indices.length);
	for (let i = 0; i < indices.length; i++) {
		convertedData.filteredData[i] = convertedData.data[indices[i]];
	}
	return {
		type: RECEIVE_GENE,
		gene,
		datasetName,
		receivedAt: Date.now(),
		state: {
			dataSets: {
				[datasetName]: {
					fetchedGenes: { [gene]: convertedData },
				},
			},
		},
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(dataSet, genes) {
	const { rowAttrs } = dataSet;
	return (dispatch) => {
		if (rowAttrs.Gene === undefined) { return; }
		for (let i = 0; i < genes.length; i++) {
			const gene = genes[i];
			const row = rowAttrs.Gene.data.indexOf(gene);
			dispatch(requestGene(gene, dataSet.dataset));
			// If gene is already cached, being fetched or
			// not part of the dataset, skip fetching.
			if (dataSet.fetchedGenes[gene] ||
				dataSet.fetchingGenes[gene] ||
				row === -1) {
				// Announce gene retrieved from cache
				dispatch(requestGeneCached(gene, dataSet.dataset));
				continue;
			}
			// Announce gene request from server
			dispatch(requestGeneFetch(gene, dataSet.dataset));
			// Second, perform the request (async)
			fetch(`/loom/${dataSet.project}/${dataSet.filename}/row/${row}`)
				.then((response) => { return response.json(); })
				.then((json) => {
					// Third, once the response comes in, dispatch an action to provide the data
					const indices = dataSet.colAttrs['(original order)'].filteredData;
					dispatch(receiveGene(gene, dataSet.dataset, indices, json));
				})
				// Or, if it failed, dispatch an action to set the error flag
				.catch((err) => {
					console.log({ err });
					dispatch(requestGeneFailed(gene, dataSet.dataset));
				});
		}
	};
}