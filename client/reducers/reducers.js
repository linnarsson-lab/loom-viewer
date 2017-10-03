// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';
import { merge } from 'js/util';

import {
	// REQUEST_PROJECTS,
	// REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	LOAD_CACHED_PROJECTS,
	// REQUEST_DATASET,
	// REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	LOAD_DATASET,
	SEARCH_DATASETS,
	SORT_DATASETS,
	REQUEST_GENE_FETCH,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
	UPDATE_VIEWSTATE,
} from 'actions/action-types';

import {	UNKNOWN } from 'actions/request-projects';

import { updateDatasetSortOrder, maybeSortIndices } from 'reducers/sort-dataset';
import { updateViewState } from 'reducers/viewstate';

/**
 * `action` can optionally have "state" trees
 * to "declaratively" modify the old state tree.
 *
 * `action.state` must be a tree of new values to merge into the old
 *   state tree, resulting in the new state.
 * IMPORTANT: use simple, "plain" JS objects only; this borks when
 * passed JSX objects, for example.
 */
function update(state, action) {
	// // We're not using prune for now, so we might as well comment it out
	// let newState = action.prune ? prune(state, action.prune) : state;
	// return action.state ? merge(newState, action.state) : newState;
	return merge(state, action.state);
}

// let filterCount =

const initialState = {
	order: {
		key: 'creationDate',
		asc: false,
	},
	fetchProjectsStatus: UNKNOWN,
};

function datasets(state, action) {
	state = state || initialState;

	switch (action.type) {
		// state changes so simple that a plain
		// merge with the state tree is enough
		case RECEIVE_PROJECTS:
		case LOAD_CACHED_PROJECTS:
		case SEARCH_DATASETS:
		case REQUEST_GENE_FETCH:
		case REQUEST_GENE_FAILED:
			return update(state, action);

		case RECEIVE_GENE:
			return maybeSortIndices(state, action);

		// ===VIEW ACTIONS===
		case RECEIVE_DATASET:
		case LOAD_DATASET:
		case UPDATE_VIEWSTATE:
			return updateViewState(update(state, action), action);

		case SORT_DATASETS:
			return updateDatasetSortOrder(state, action.key);

		default:
			return state;
	}
}

const loomAppReducer = combineReducers({ datasets });
export default loomAppReducer;