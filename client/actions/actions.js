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

import { convertJSONarray, arrayConstr } from '../js/util';
import { createViewStateConverter } from '../js/viewstateEncoder';


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
	let order = { key: 'lastModified', asc: false };
	// convert json array to hashmap
	let list = {};
	let i = json.length;
	while (i--) {
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

	// some old loom files have 'Cell_ID'
	rows.cellKeys = cols.attrs.CellID ? cols.attrs.CellID.data.slice() : cols.attrs.Cell_ID ? cols.attrs.Cell_ID.data.slice() : [];
	rows.cellKeys.sort();
	rows.allKeys = rows.keys.concat(rows.cellKeys);
	rows.allKeysNoUniques = rows.keysNoUniques.concat(rows.cellKeys);

	cols.geneKeys = rows.attrs.Gene ? rows.attrs.Gene.data.slice() : [];
	cols.geneKeys.sort();
	cols.geneKeysLowerCase = cols.geneKeys.map((gene) => { return gene.toLowerCase(); });
	cols.allKeys = cols.keys.concat(cols.geneKeys);
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

	let dataset = { col: cols, row: rows };

	dataset.viewState = {
		row: { order: prepRows.order, filter: [] },
		col: { order: prepCols.order, filter: [] },
		heatmap: {
			zoomRange: data.zoomRange,
			fullZoomHeight: data.fullZoomHeight,
			fullZoomWidth: data.fullZoomWidth,
			shape: data.shape,
		},
	};

	dataset.viewStateConverter = createViewStateConverter(dataset);

	return {
		type: RECEIVE_DATASET,
		state: {
			list: {
				[path]: dataset,
			},
		},
	};
}

function prepData(attrs) {
	let keys = Object.keys(attrs).sort();

	// store original attribute order
	const dataLength = attrs[keys[0]].data.length;
	let originalOrder = originalOrderArray(dataLength);
	attrs[originalOrder.name] = originalOrder;
	keys.unshift(originalOrder.name);

	// Initial sort order
	let order = [];
	for (let i = 0; i < Math.min(5, keys.length); i++) {
		order.push({ key: keys[i], asc: true });
	}

	// convert attribute arrays to objects with summary
	// metadata (most frequent, filtered/visible)
	// '(original order)' isn't part of the regular
	// meta-data so we have to add it first
	let newAttrs = convertArrays(attrs);

	// Add the set of keys for data that excludes data
	// where all values are the same (are useless in scatterplot
	// and sparkline views, so filtered out for convenience).
	let keysNoUniques = [];
	let i = keys.length;
	while (i--) {
		let key = keys[i];
		if (!newAttrs[key].uniqueVal) {
			keysNoUniques.push(key);
		}
	}
	keysNoUniques.sort();

	// Add zero-initialised filter counting arrays, assumes
	// that we will never have more than 65,535 attributes
	const filterCount = new Uint16Array(dataLength);
	const sortedFilterIndices = originalOrder.data.slice();

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

function originalOrderArray(length) {
	let arrayType = length < 256 ? 'uint8' : length < 65535 ? 'uint16' : 'uint32';
	let data = new (arrayConstr(arrayType))(length);
	let i = length;
	while (i--) {
		data[i] = i;
	}

	return {
		name: '(original order)',
		arrayType, data,
		colorIndices: { mostFreq: {} },
		uniques: [],
		allUnique: true,
		min: 0,
		max: data.length-1,
	};
}


function convertArrays(attrs) {
	let keys = Object.keys(attrs);
	let newAttrs = {};
	let i = keys.length;
	while (i--) {
		// Set attrs[k] to null early, so it can be GC'ed if necessary
		// (had an allocation failure of a new typed array for large attrs,
		// so this is a realistic worry)
		const k = keys[i], attr = attrs[k];
		attrs[k] = null;
		newAttrs[k] = convertJSONarray(attr, k);
	}
	return newAttrs;
}

function prepFilter(options) {
	let i = options.length, newOptions = new Array(i);
	while (i--) {
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
	let i = genes.length;
	while (i--) {
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
	let i = genes.length;
	while (i--) {
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
						let i = data.length;
						while (i--) {
							// we set data[i] to null as early as possible, so JS can
							// GC the rows after converting them to TypedArrays.
							// I actually had an allocation failure so this is a real risk when fetching large amounts of data.
							let geneName = geneKeys[data[i].idx],
								geneData = data[i].data;
							data[i] = null;
							attrs[geneName] = convertJSONarray(geneData, geneName);
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
