import React, { Component, PropTypes } from 'react';
import { FetchDatasetComponent } from './fetch-dataset';

import { fetchProjects } from '../actions/actions';
import { merge } from '../js/util';
import JSURL from 'jsurl';
import { SET_VIEW_PROPS } from '../actions/actionTypes';

class ViewStateInitialiser extends Component {

	componentWillMount() {
		const { dispatch, dataset,
			viewsettings, initialState,
			path, stateName } = this.props;

		// URL-encoded state >> existing state >> initial state
		const viewState = merge(
			{ [stateName]: initialState },
			(viewsettings ?
				JSURL.parse(viewsettings) : dataset.viewState)
		);

		// We dispatch even in case of existing state,
		// to synchronise the view-settings URL
		dispatch({
			type: SET_VIEW_PROPS,
			viewState,
			stateName,
			path,
		});
	}

	render() {
		const { dispatch, dataset, View, stateName } = this.props;
		return dataset.viewState[stateName] ? (
			<View
				dispatch={dispatch}
				dataset={dataset}
				/>
		) : <div className='view centered'><h1>Initialising View Settings - {stateName}</h1></div>;
	}
}

ViewStateInitialiser.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	stateName: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired,
	initialState: PropTypes.object.isRequired,
	viewsettings: PropTypes.string,
};

export const ViewInitialiser = function (props) {
	const {
		View, stateName, initialState,
		dispatch, datasets, params,
	} = props;
	const { project, filename, viewsettings } = params;
	const path = `${project}/${filename}`;
	if (datasets === undefined) {
		dispatch(fetchProjects());
		return (
			<div className='view centered' ><h1>Fetching projects list</h1></div>
		);
	} else {
		const dataset = datasets[path];
		if (dataset) {
			return (!(dataset.col && dataset.row) ?
				<FetchDatasetComponent
					dispatch={dispatch}
					datasets={datasets}
					path={path}
					/>
				:
				<ViewStateInitialiser
					View={View}
					stateName={stateName}
					initialState={initialState}
					dataset={dataset}
					path={path}
					dispatch={dispatch}
					viewsettings={viewsettings} />
			);
		} else {
			// likely a mangled path URL
			return (
				<div className='view centered' ><h1>Error: <i>{path}</i> not found in datasets</h1></div>
			);
		}
	}
};

ViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	stateName: PropTypes.string.isRequired,
	initialState: PropTypes.object.isRequired,
	datasets: PropTypes.object,
};