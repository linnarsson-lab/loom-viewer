import 'whatwg-fetch';

import {
	REQUEST_PROJECTS,
	REQUEST_PROJECTS_FETCH,
	REQUEST_PROJECTS_CACHED,
	REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	REQUEST_DATASET,
	REQUEST_DATASET_FETCH,
	REQUEST_DATASET_CACHED,
	REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	REQUEST_GENE,
	REQUEST_GENE_FETCH,
	REQUEST_GENE_CACHED,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
} from './actionTypes';

import { merge } from '../js/util';
import { groupBy } from 'lodash';


///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch the list of projects
//
///////////////////////////////////////////////////////////////////////////////////////////


function requestProjects() {
	return {
		type: REQUEST_PROJECTS,
	};
}

function requestProjectsFetch() {
	return {
		type: REQUEST_PROJECTS_FETCH,
	};
}

function requestProjectsCached() {
	return {
		type: REQUEST_PROJECTS_CACHED,
	};
}

function requestProjectsFailed() {
	return {
		type: REQUEST_PROJECTS_FAILED,
	};
}

function receiveProjects(projects) {
	return {
		type: RECEIVE_PROJECTS,
		state: { projects },
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchProjects(projects) {
	return (dispatch) => {
		// Announce that the request has been started
		dispatch(requestProjects());
		// Second, check if projects already exists in the store
		// If so, notify it is cached and return.
		// If not, perform a fetch request (async)
		if (projects) {
			// Announce we are retrieving from cache
			return dispatch(requestProjectsCached());
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
						console.log({err});
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

function requestDataSetFetch(datasetName) {
	return {
		type: REQUEST_DATASET_FETCH,
		datasetName: datasetName,
	};
}


function requestDataSetCached(datasetName) {
	return {
		type: REQUEST_DATASET_CACHED,
		datasetName: datasetName,
	};

}

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
				[dataSet.dataset]: merge(
					dataSet, { fetchedGenes: {}, fetchingGenes: {} }
				),
			},
		},
	};
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
			dispatch(requestDataSetCached(dataset));
		} else {
			//Announce that we are fetching from server
			dispatch(requestDataSetFetch(dataset));
			return (fetch(`/loom/${project}/${dataset}`)
				.then((response) => { return response.json(); })
				.then((ds) => {
					// This goes last, to ensure the above defaults
					// are set when the views are rendered
					dispatch(receiveDataSet(ds));
				})
				.catch((err) => {
					// Or, if fetch request failed, dispatch
					// an action to set the error flag
					console.log({err});
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

function receiveGene(gene, datasetName, list) {
	return {
		type: RECEIVE_GENE,
		gene,
		datasetName,
		receivedAt: Date.now(),
		state: {
			dataSets: {
				[datasetName]: {
					fetchedGenes: { [gene]: list },
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
			const row = rowAttrs.Gene.indexOf(gene);
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
					dispatch(receiveGene(gene, dataSet.dataset, json));
				})
				// Or, if it failed, dispatch an action to set the error flag
				.catch((err) => {
					console.log({err});
					dispatch(requestGeneFailed(gene, dataSet.dataset));
				});
		}
	};
}