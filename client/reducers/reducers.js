// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';
import { merge } from '../js/util';

import {
	// REQUEST_PROJECTS,
	// REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	// REQUEST_DATASET,
	// REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	SEARCH_DATASETS,
	SORT_DATASETS,
	REQUEST_GENE_FETCH,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
	SET_VIEW_PROPS,
} from '../actions/actionTypes';

import { updateDatasetSortOrder, maybeSortIndices } from './sort-dataset';
import { setViewStateURL, updateViewState } from './viewstate';

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

function datasets(state = {}, action) {
	let newState = null;
	switch (action.type) {
		case RECEIVE_PROJECTS:
		case RECEIVE_DATASET:
		case SEARCH_DATASETS:
		case REQUEST_GENE_FETCH:
		case REQUEST_GENE_FAILED:
			return update(state, action);

		case RECEIVE_GENE:
			newState = update(state, action);
			return maybeSortIndices(state, newState, action);


		//===VIEW ACTIONS===
		case SET_VIEW_PROPS:
			newState = updateViewState(state, action);
			return setViewStateURL(newState, action);

		case SORT_DATASETS:
			return updateDatasetSortOrder(state, action.key);

		default:
			return state;
	}
}

const loomAppReducer = combineReducers({ datasets });
export default loomAppReducer;