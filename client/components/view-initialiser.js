import React, { Component, PropTypes } from 'react';
import { FetchDatasetComponent } from './fetch-dataset';
import JSURL from 'jsurl';
import { SET_VIEW_PROPS } from '../actions/actionTypes';

class ViewStateInitialiser extends Component {

	componentWillMount() {
		const { dispatch, dataSet, viewsettings, viewStateName, initialState } = this.props;

		const viewState = viewsettings ? JSURL.parse(viewsettings) : (
			dataSet[viewStateName] ? dataSet[viewStateName] : initialState
		);

		// We dispatch even in case of existing state,
		// to synchronise the view-settings URL
		dispatch({
			type: SET_VIEW_PROPS,
			fieldName: viewStateName,
			datasetName: dataSet.dataset,
			[viewStateName]: viewState,
		});
	}

	render() {
		const { dispatch, dataSet, View, viewStateName } = this.props;
		return dataSet[viewStateName] ? (
			<View
				dispatch={dispatch}
				dataSet={dataSet}
				/>
		) : <div className='view'>Initialising View Settings - {viewStateName}</div>;
	}
}

ViewStateInitialiser.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	viewStateName: PropTypes.string.isRequired,
	viewsettings: PropTypes.string,
	initialState: PropTypes.object.isRequired,
};

export const ViewInitialiser = function (props) {
	const {
		View, viewStateName, initialState,
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
			dataSet={dataSet}
			dispatch={dispatch}
			viewsettings={viewsettings}
			View={View}
			viewStateName={viewStateName}
			initialState={initialState} />
	);
};

ViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	viewStateName: PropTypes.string.isRequired,
	initialState: PropTypes.object.isRequired,
};