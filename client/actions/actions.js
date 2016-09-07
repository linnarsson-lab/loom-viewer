import 'whatwg-fetch';

import {
	REQUEST_PROJECTS,
	REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	REQUEST_DATASET,
	REQUEST_DATASET_CACHED,
	REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	REQUEST_GENE,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
} from './actionTypes';

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

function requestProjectsFailed() {
	return {
		type: REQUEST_PROJECTS_FAILED,
	};
}

function receiveProjects(projects) {
	return {
		type: RECEIVE_PROJECTS,
		projects: projects,
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchProjects(projects) {
	return (dispatch) => {
		// First, make known the fact that the request has been started
		dispatch(requestProjects());
		// Second, check if projects already exists in the store.
		// If not, perform a fetch request (async)
		if (projects === undefined) {
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
						console.log(err);
						dispatch(requestProjectsFailed());
					})
			);
		} else {
			return dispatch(receiveProjects(projects));
		}
	};
}

///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch metadata for a dataSet
//
///////////////////////////////////////////////////////////////////////////////////////////


function requestDataSet(dataSet) {
	return {
		type: REQUEST_DATASET,
		dataSet: dataSet,
	};
}

function requestDataSetCached(dataSet) {
	return {
		type: REQUEST_DATASET_CACHED,
		dataSet: dataSet,
	};
}

function requestDataSetFailed() {
	return {
		type: REQUEST_DATASET_FAILED,
	};
}

function receiveDataSet(dataSet) {
	return {
		type: RECEIVE_DATASET,
		dataSet,
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchDataSet(data) {
	const { project, dataset, dataSets } = data;
	// no need to fetch a cached dataset
	if (dataSets[dataset] !== undefined) {
		return (dispatch) => {
			dispatch(requestDataSetCached(dataset));
		};
	} else {
		return (dispatch) => {
			// First, make known the fact that the request has been started
			dispatch(requestDataSet(dataset));
			// Second, see if the dataset already exists in the store
			// If so, return it. If not, perform the request (async)
			return (fetch(`/loom/${project}/${dataset}`)
				.then((response) => { return response.json(); })
				.then((ds) => {
					// This goes last, to ensure the above defaults are set when the views are rendered
					dispatch(receiveDataSet(ds, dataset));
				})
				.catch((err) => {
					// Or, if it failed, dispatch an action to set the error flag
					console.log(err);
					dispatch(requestDataSetFailed(dataset));
				}));
		};
	}
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
		fetchedGenes: { [gene]: list },
		datasetName,
		receivedAt: Date.now(),
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(dataSet, genes) {
	const rowAttrs = dataSet.rowAttrs;
	return (dispatch) => {
		if (rowAttrs.Gene === undefined) { return; }
		for (let i = 0; i < genes.length; i++) {
			const gene = genes[i];
			const row = rowAttrs.Gene.indexOf(gene);
			// If gene is already cached or not part of the dataset, skip
			if (dataSet.fetchedGenes.hasOwnProperty(gene) || row === -1) { continue; }
			// First, make known the fact that the request has been started
			dispatch(requestGene(gene, dataSet.dataset));
			// Second, perform the request (async)
			fetch(`/loom/${dataSet.project}/${dataSet.filename}/row/${row}`)
				.then((response) => { return response.json(); })
				.then((json) => {
					// Third, once the response comes in, dispatch an action to provide the data
					dispatch(receiveGene(gene, dataSet.dataset, json));
				})
				// Or, if it failed, dispatch an action to set the error flag
				.catch((err) => {
					console.log(err);
					dispatch(requestGeneFailed(gene, dataSet.dataset));
				});
		}
	};
}