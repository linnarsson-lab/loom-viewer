import createFilterOptions from 'react-select-fast-filter-options';
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
	//REQUEST_GENE,
	REQUEST_GENE_FETCH,
	//REQUEST_GENE_CACHED,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
} from './actionTypes';

import { convertArray } from '../js/util';


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
	for (let i = 0; i < json.length; i++) {
		let ds = json[i];
		ds.path = ds.project + '/' + ds.filename;
		ds.viewState = {};
		ds.fetchedGenes = {};
		ds.col = null;
		ds.row = null;
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

function requestDataSetFailed(path) {
	return {
		type: REQUEST_DATASET_FAILED,
		path,
	};
}


function receiveDataSet(data, path) {
	let prepRows = prepData(data.rowAttrs), prepCols = prepData(data.colAttrs);
	let rows = prepRows.data, cols = prepCols.data;

	rows.cellKeys = cols.attrs.CellID ? cols.attrs.CellID.data.slice() : cols.attrs.Cell_ID ? cols.attrs.Cell_ID.data.slice() : [];
	rows.allKeys = rows.keys.concat(rows.cellKeys);
	rows.allKeysNoUniques = rows.keysNoUniques.concat(rows.cellKeys);

	cols.geneKeys = rows.attrs.Gene ? rows.attrs.Gene.data.slice() : [];
	cols.geneKeysLowerCase = cols.geneKeys.map((gene) => { return gene.toLowerCase(); });
	cols.allKeys = cols.keys.concat(rows.geneKeys);
	cols.allKeysNoUniques = cols.keysNoUniques.concat(cols.geneKeys);

	// Creating fastFilterOptions is a very slow operation,
	// which is why we do it once and re-use the results.
	// Also, I've commented out the filters that aren't being used
	// right now to save some time
	rows.dropdownOptions = {};
	//rows.dropdownOptions.attrs = prepFilter(rows.keys);
	rows.dropdownOptions.attrsNoUniques = prepFilter(rows.keysNoUniques);
	// // fastFilterOptions doesn't scale for tens of thousands of cells :/
	//	//rows.dropdownOptions.keyAttr = prepFilter(rows.cellKeys);
	// //rows.dropdownOptions.all = prepFilter(rows.allKeys);
	// //rows.dropdownOptions.allNoUniques = prepFilter(rows.allKeysNoUiques);
	//rows.dropdownOptions.all = rows.dropdownOptions.attrs;
	rows.dropdownOptions.allNoUniques = rows.dropdownOptions.attrsNoUniques; //prepFilter(rows.allKeysNoUniques);

	cols.dropdownOptions = {};
	//cols.dropdownOptions.attrs = prepFilter(cols.keys);
	//cols.dropdownOptions.attrsNoUniques = prepFilter(cols.keysNoUniques);
	cols.dropdownOptions.keyAttr = prepFilter(cols.geneKeys);
	//cols.dropdownOptions.all = prepFilter(cols.allKeys);
	cols.dropdownOptions.allNoUniques = prepFilter(cols.allKeysNoUniques);

	let viewState = {
		row: { order: prepRows.order },
		col: { order: prepCols.order },
		heatmap: {
			zoomRange: data.zoomRange,
			fullZoomHeight: data.fullZoomHeight,
			fullZoomWidth: data.fullZoomWidth,
			shape: data.shape,
		},
	};

	return {
		type: RECEIVE_DATASET,
		state: {
			list: {
				[path]: { viewState, col: cols, row: rows },
			},
		},
	};
}

function prepData(attrs) {
	let keys = Object.keys(attrs).sort();

	// store original attribute order
	let originalOrder = new Uint32Array(attrs[keys[0]].length), i = originalOrder.length;
	while (i--) {
		originalOrder[i] = i;
	}
	let origOrderKey = '(original order)';
	attrs[origOrderKey] = originalOrder;
	// Store all the keys
	keys.unshift(origOrderKey);
	// Initial sort order
	let order = [];
	for (let i = 0; i < Math.min(4, keys.length); i++) {
		order.push({ key: keys[i], ascending: true });
	}
	// convert attribute arrays to objects with summary
	// metadata (most frequent, filtered/visible)
	// '(original order)' isn't part of the regular
	// meta-data so we have to add it first
	let newAttrs = convertArrays(attrs);

	// Add the set of keys for non-unique values (unique values are
	// ignored in scatterplot and sparkline views)
	let keysNoUniques = [];
	i = keys.length;
	while (i--) {
		let key = keys[i];
		if (!newAttrs[key].uniqueVal) {
			keysNoUniques.push(key);
		}
	}

	// Add zero-initialised filter counting arrays, assumes
	// that we will never have more than 65,535 attributes
	const filterCount = new Uint16Array(newAttrs[origOrderKey].data.length);
	const sortedFilterIndices = originalOrder.slice();

	return {
		data: {
			keys,
			keysNoUniques,
			attrs: newAttrs,
			filterCount,
			sortedFilterIndices,
		},
		order,
	};
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

function prepFilter(options) {
	let newOptions = new Array(options.length);
	for (let i = 0; i < newOptions.length; i++) {
		newOptions[i] = {
			value: options[i],
			label: options[i],
		};
	}
	return createFilterOptions({ options: newOptions });
}


// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchDataSet(datasets, path) {
	return (dispatch) => {
		// Announce that the request has been started
		dispatch(requestDataSet(path));
		// See if the dataset already exists in the store
		// If so, we can use cached version.
		// If not, perform the actual fetch request (async)
		if (!datasets[path].col) {
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
					console.log({ err }, err);
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


function requestGenesFetch(genes, path) {
	let fetchedGenes = {};
	for (let i = 0; i < genes.length; i++) {
		fetchedGenes[genes[i]] = true;
	}
	return {
		type: REQUEST_GENE_FETCH,
		state: {
			list: {
				[path]: {
					fetchedGenes,
				},
			},
		},
	};
}

function requestGenesFailed(genes, path) {
	let fetchedGenes = {};
	for (let i = 0; i < genes.length; i++) {
		fetchedGenes[genes[i]] = false;
	}
	return {
		type: REQUEST_GENE_FAILED,
		genes,
		state: {
			list: {
				[path]: {
					fetchedGenes,
				},
			},
		},
	};
}

function receiveGenes(attrs, path) {
	return {
		type: RECEIVE_GENE,
		path,
		receivedAt: Date.now(),
		state: {
			list: {
				[path]: {
					col: {
						attrs,
					},
				},
			},
		},
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(dataset, genes) {
	const { title, path, col, fetchedGenes } = dataset;
	const { geneKeys } = col;
	if (geneKeys === undefined) {
		return () => { };
	} else {
		// `genes` can be either a string or an array of strings
		genes = typeof genes === 'string' ? [genes] : genes;
		return (dispatch) => {

			let fetchGeneNames = [], fetchRows = [];
			for (let i = 0; i < genes.length; i++) {
				const gene = genes[i];
				const row = geneKeys.indexOf(gene);
				// If gene is already cached, being fetched or
				// not part of the dataset, skip fetching.
				if (!fetchedGenes[gene] && row !== -1) {
					fetchGeneNames.push(gene);
					fetchRows.push(row);
				}
			}

			if (fetchRows.length > 0) {
				// Announce gene request from server, add to geneKeys
				// to indicate it is being fetched
				dispatch(requestGenesFetch(fetchGeneNames, path, title));
				// Second, perform the request (async)
				fetch(`/loom/${path}/row/${fetchRows.join('+')}`)
					// Third, once the response comes in, dispatch an action to provide the data
					.then((response) => { return response.json(); })
					.then((data) => {
						// Genes are appended to the attrs object
						let attrs = {};
						for (let i = 0; i < data.length; i++) {
							let row = data[i];
							attrs[geneKeys[row.idx]] = convertArray(row.data);
						}

						dispatch(receiveGenes(attrs, dataset.path));
					})
					// Or, if it failed, dispatch an action to set the error flag
					.catch((err) => {
						console.log({ err }, err);
						dispatch(requestGenesFailed(fetchGeneNames, path, title));
					});
			}
		};
	}
}
