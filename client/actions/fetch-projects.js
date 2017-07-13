import 'whatwg-fetch';

import localforage from 'localforage';
localforage.config({
	name: 'Loom',
	storeName: 'datasets',
});

import { addFunctions, reduxToJSON } from './fetch-dataset';

import {
	//REQUEST_PROJECTS,
	REQUEST_PROJECTS_FETCH,
	//REQUEST_PROJECTS_CACHED,
	REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	LOAD_CACHED_PROJECTS,
} from './actionTypes';

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
		state: {
			fetchProjectsSucceeded: false,
		},
	};
}

function loadOfflineProjects(list) {
	return {
		type: LOAD_CACHED_PROJECTS,
		state: {
			list,
			order: {
				key: 'creationDate',
				asc: false,
			},
			fetchProjectsSucceeded: false,
		},
	};
}

function receiveProjects(json, prevList) {

	// convert json array to dictionary
	let order = prevList ? prevList.order : (
		{
			key: 'creationDate',
			asc: false,
		}
	);
	let list = {};
	let i = json.length;
	while (i--) {
		let ds = json[i];
		ds.path = ds.project + '/' + ds.filename;
		// don't overwrite existing datasets
		if (prevList && prevList[ds.path]) {
			ds = prevList[ds.path];
		} else {
			ds.viewState = {};
			ds.fetchedGenes = {};
			ds.fetchingGenes = {};
			ds.col = null;
			ds.row = null;
		}
		list[ds.path] = ds;
	}

	return {
		type: RECEIVE_PROJECTS,
		state: {
			list,
			order,
			fetchProjectsSucceeded: true,
		},
	};
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchProjects(...))

export function fetchProjects(list, fetchProjectsSucceeded) {
	return (dispatch) => {
		// Check if projects already exists in the store,
		// and if we weren't offline last time we tried
		// to fetch the projects
		if (list && fetchProjectsSucceeded) { // we retrieve from store cache
			return;
		} else { // Announce we are fetching from server
			dispatch(requestProjectsFetch());
			return (
				fetch('/loom')
				.then((response) => { return response.json(); })
				.then((json) => {
					dispatch(receiveProjects(json, list));
				})
				.catch((err) => {
					console.log('fetching projects failed with following error:');
					console.log(err);
					// Try loading the offline datasets,
					// if we have not done so before
					if (!list) {
						console.log('attempting to load cached datasets');
						list = {};
						localforage.iterate((dataset, path) => {
							addFunctions(dataset);
							list[path] = dataset;
						})
							.then(() => {
								if (Object.keys(list).length) {
									dispatch(loadOfflineProjects(list));
								} else {
								// if list is empty, we have no
								// cached datasets and fetching
								// effectively failed.
									throw 'no cached datasets';
								}
							})
							.catch((err) => {
								console.log(err);
								dispatch(requestProjectsFailed());
							});
					}
				})
			);
		}
	};
}