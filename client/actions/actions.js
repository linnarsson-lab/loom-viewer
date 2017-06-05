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
	//REQUEST_GENE,
	REQUEST_GENE_FETCH,
	//REQUEST_GENE_CACHED,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
} from './actionTypes';

import { convertJSONarray } from '../js/util';

import { receiveDataSet } from './receive-dataset';

////////////////////////////////////////////////////////////////////////////////
//
// Fetch the list of projects
//
////////////////////////////////////////////////////////////////////////////////


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
	let order = { key: 'creationDate', asc: false };
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

////////////////////////////////////////////////////////////////////////////////
//
// Fetch metadata for a dataSet
//
////////////////////////////////////////////////////////////////////////////////


// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchDataSet(datasets, path) {
	return (dispatch) => {
		// Announce that the request has been started
		dispatch({
			type: REQUEST_DATASET,
			datasetName: path,
		});
		// See if the dataset already exists in the store
		// If so, we can use cached version.
		// If not, perform the actual fetch request (async)
		if (!datasets[path].col) {
			return (
				fetch(`/loom/${path}`)
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
						dispatch({
							type: REQUEST_DATASET_FAILED,
							datasetName: path,
						});
					})
			);
		}
	};
}


////////////////////////////////////////////////////////////////////////////////
//
// Fetch a row of values for a single gene for a dataset
//
////////////////////////////////////////////////////////////////////////////////


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
	const { geneToRow, rowToGenes } = col;
	if (geneToRow === undefined) {
		return () => { };
	} else {
		// `genes` can be either a string or an array of strings
		genes = typeof genes === 'string' ? [genes] : genes;

		// To avoid memory overhead issues (this has crashed
		// the browser in testing), we shouldn't make the
		// individual fetches *too* big. After a bit of testing
		// I guesstimate that for 50k cells, we want to fetch
		// at most 10 rows at once.
		const rowsPerFetch = (1000000 / dataset.totalCols) | 0;
		let fetchGeneNames = [], fetchRows = [];
		for (let i = 0; i < genes.length; i++) {
			const gene = genes[i];
			const row = geneToRow[gene];
			// If gene is already cached, being fetched or
			// not part of the dataset, skip fetching.
			if (!fetchedGenes[gene] && row !== undefined) {
				fetchGeneNames.push(gene);
				fetchRows.push(row);
			}
		}
		if (fetchRows.length > 0) {
			return (dispatch) => {
				_fetchGenes(dispatch, fetchGeneNames, fetchRows, rowsPerFetch, path, title, rowToGenes);
			};
		} else {
			return () => { };
		}
	}
}

function _fetchGenes(dispatch, fetchGeneNames, fetchRows, rowsPerFetch, path, title, rowToGenes) {
	for (let i = 0; i < fetchGeneNames.length; i += rowsPerFetch) {
		let i1 = Math.min(i + rowsPerFetch, fetchGeneNames.length);
		const _fetchGeneNames = fetchGeneNames.slice(i, i1),
			_fetchRows = fetchRows.slice(i, i1);

		// Announce gene request from server, add to geneKeys
		// to indicate it is being fetched
		dispatch(requestGenesFetch(_fetchGeneNames, path, title));
		// Second, perform the request (async)
		fetch(`/loom/${path}/row/${_fetchRows.join('+')}`)
			// Third, once the response comes in,
			// dispatch an action to provide the data
			.then((response) => { return response.json(); })
			.then((data) => {
				// Genes are appended to the attrs object
				let attrs = {};
				let i = data.length;
				while (i--) {
					// we set data[i] to null as early as possible, so JS can
					// GC the rows after converting them to TypedArrays.
					// I actually had an allocation failure so this is a real risk when fetching large amounts of data.
					let geneName = rowToGenes[data[i].idx],
						geneData = data[i].data;
					data[i] = null;
					attrs[geneName] = convertJSONarray(geneData, geneName);
				}
				dispatch(receiveGenes(attrs, path));
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch((err) => {
				console.log({ err }, err);
				dispatch(requestGenesFailed(_fetchGeneNames, path, title));
			});
	}
}