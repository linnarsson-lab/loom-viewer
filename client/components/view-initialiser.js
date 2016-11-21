import React, { Component, PropTypes } from 'react';
import { FetchDatasetComponent } from './fetch-dataset';
import { merge } from '../js/util';
import JSURL from 'jsurl';
import { SET_VIEW_PROPS } from '../actions/actionTypes';

class ViewStateInitialiser extends Component {

	componentWillMount() {
		const { dispatch, dataSet,
			viewsettings, stateName,
			initialState } = this.props;

		// URL-encoded state >> existing state >> initial state
		let viewState = viewsettings ? JSURL.parse(viewsettings) : dataSet.viewState;
		viewState = viewState[stateName] ? viewState : merge(viewState, { [stateName]: initialState });

		// We dispatch even in case of existing state,
		// to synchronise the view-settings URL
		let datasetName = dataSet.dataset;
		dispatch({
			type: SET_VIEW_PROPS,
			stateName,
			datasetName,
			viewState,
		});
	}

	render() {
		const { dispatch, dataSet, View, stateName } = this.props;
		return dataSet.viewState && dataSet.viewState[stateName] ? (
			<View
				dispatch={dispatch}
				dataSet={dataSet}
				/>
		) : <div className='view'>Initialising View Settings - {stateName}</div>;
	}
}

ViewStateInitialiser.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	stateName: PropTypes.string.isRequired,
	viewsettings: PropTypes.string,
	initialState: PropTypes.object.isRequired,
};

export const ViewInitialiser = function (props) {
	const {
		View, stateName, initialState,
		dispatch, data, params,
	} = props;
	const { dataset, project, viewsettings } = params;
	const dataSet = data.dataSets[dataset];
	return (dataSet === undefined ?
		<FetchDatasetComponent
			dispatch={dispatch}
			dataSets={data.dataSets}
			dataset={dataset}
			project={project} />
		:
		<ViewStateInitialiser
			View={View}
			stateName={stateName}
			initialState={initialState}
			dataSet={dataSet}
			dispatch={dispatch}
			viewsettings={viewsettings} />
	);
};

ViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	stateName: PropTypes.string.isRequired,
	initialState: PropTypes.object.isRequired,
};