import 'whatwg-fetch';

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
				fetch(`/loom`)
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

function requestDataSetFailed() {
	return {
		type: REQUEST_DATASET_FAILED,
	};
}

function receiveDataSet(receivedDataSet) {
	return {
		type: RECEIVE_DATASET,
		receivedDataSet,
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchDataSet(data) {
	const { dataSetName, dataSets } = data;
	return (dispatch) => {
		// First, make known the fact that the request has been started
		dispatch(requestDataSet(dataSetName));
		// Second, see if the dataset already exists in the store
		// If not, perform the request (async)
		return dataSets[dataSetName] === undefined ? (
			fetch(`/loom/${dataSetName}/fileinfo.json`)
				.then((response) => { return response.json(); })
				.then((ds) => {
					// Once the response comes in, dispatch an action to provide the data
					// Also, dispatch some actions to set required properties on the subviews
					// TODO: move to react-router state and
					// replace with necessary router.push() logic
					const ra = ds.rowAttrs[0];
					const ca = ds.colAttrs[0];
					dispatch({ type: 'SET_GENESCAPE_PROPS', xCoordinate: ra, yCoordinate: ra, colorAttr: ra });
					dispatch({ type: 'SET_HEATMAP_PROPS', rowAttr: ra, colAttr: ca });

					// This goes last, to ensure the above defaults are set when the views are rendered
					let receivedDataSet = {};
					receivedDataSet[dataSetName] = ds;
					dispatch(receiveDataSet(receivedDataSet));
				})
				// Or, if it failed, dispatch an action to set the error flag
				.catch((err) => {
					console.log(err);
					dispatch(requestDataSetFailed(dataSetName));
				})
		) : dispatch(receiveDataSet(
			{ dataSet: dataSets[dataSetName], dataSetName: dataSetName }
		));
	};
}


///////////////////////////////////////////////////////////////////////////////////////////
//
// Fetch a row of values for a single gene
//
///////////////////////////////////////////////////////////////////////////////////////////


function requestGene(gene) {
	return {
		type: REQUEST_GENE,
		gene: gene,
	};
}

function requestGeneFailed() {
	return {
		type: REQUEST_GENE_FAILED,
	};
}

function receiveGene(gene, list) {
	return {
		type: RECEIVE_GENE,
		gene: gene,
		data: list,
		receivedAt: Date.now(),
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(dataSet, gene, cache) {
	const rowAttrs = dataSet.rowAttrs;
	return (dispatch) => {
		if (!rowAttrs.hasOwnProperty("GeneName")) {
			return;
		}
		const row = rowAttrs["GeneName"].indexOf(gene);
		if (cache.hasOwnProperty(gene)) {
			return;
		}
		// First, make known the fact that the request has been started
		dispatch(requestGene(gene));
		// Second, perform the request (async)
		return fetch(`/loom/${dataSet.name}/row/${row}`)
			.then((response) => { return response.json(); })
			.then((json) => {
				// Third, once the response comes in, dispatch an action to provide the data
				dispatch(receiveGene(gene, json));
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch((err) => {
				console.log(err);
				dispatch(requestGeneFailed());
			});
	};
}