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

function receiveProjects(json) {
	
	// initialise sorting order
	let order = { key: 'lastModified', ascending: true };
	// convert json array to hashmap
	let list = {};
	for (let i = 0; i < json.length; i++){
		let ds = json[i];
		ds.path = ds.project + '/' + ds.filename;
		ds.viewState = {};
		list[ds.path] = ds;
	}

	return {
		type: RECEIVE_PROJECTS,
		state: { order, list },
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchProjects(list) {
	return (dispatch) => {
		// Announce that the request has been started
		//dispatch(requestProjects());
		// Second, check if projects already exists in the store
		if (list) { // we retrieve from store cache
			return;
		} else { // Announce we are fetching from server
			dispatch(requestProjectsFetch());
			return (
				fetch('/loom')
					.then((response) => { return response.json(); })
					.then((json) => {
						dispatch(receiveProjects(json));
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

function requestDataSetFailed(path) {
	return {
		type: REQUEST_DATASET_FAILED,
		path,
	};
}


function receiveDataSet(data, path) {
	let row = prepData(data.rowAttrs);
	let geneKeys = [];
	if (data.colAttrs['Gene']){
		geneKeys = data.colAttrs['Gene'].slice;
	}
	let col = prepData(data.colAttrs);
	col.geneKeys = geneKeys;
	return {
		type: RECEIVE_DATASET,
		state: {
			list: {
				[path]: { data: { row, col } },
			},
		},
	};
}

function prepData(attrs){
	let data = {};
	data.keys = Object.keys(attrs).sort();
	// store original order attrs
	let origOrderKey = '(original order)';
	attrs[origOrderKey] = originalOrder(attrs[data.keys[0]]);
	// Store all the keys
	data.keys.unshift(origOrderKey);
	// Initial sort order
	data.order = data.keys.map((key) => { return { key, ascending: true }; });
	// convert attribute arrays to objects with summary
	// metadata (most frequent, filtered/visible)
	// '(original order)' isn't part of the regular
	// meta-data so we have to add it first
	let newAttrs = convertArrays(attrs);
	data.attrs = newAttrs;
	// Add zero-initialised filter counting arrays, assumes
	// that we will never have more than 65,535 attributes
	data.filtedataount = new Uint16Array(attrs[origOrderKey].data.length);
	return data;
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
		const k = keys[i];
		newAttrs[k] = convertArray(attrs[k], k);
	}
	return newAttrs;
}



// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchDataSet(datasets, path) {
	return (dispatch) => {
		// Announce that the request has been started
		dispatch(requestDataSet(path));
		// See if the dataset already exists in the store
		// If so, we use cached version.
		// If not, perform the request (async)
		if (!datasets.list[path].data) {
			return (fetch(`/loom/${path}`)
				.then((response) => {
					// convert the JSON to a JS object, and
					// do some prep-work
					return response.json();
				})
				.then((data) => {
					// This goes last, to ensure the above defaults
					// are set when the views are rendered
					dispatch(receiveDataSet(data, path));
				})
				.catch((err) => {
					// Or, if fetch request failed, dispatch
					// an action to set the error flag
					console.log({ err });
					dispatch(requestDataSetFailed(path));
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
	let convertedData = convertArray(data, gene);
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