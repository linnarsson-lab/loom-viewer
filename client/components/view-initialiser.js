import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { fetchProjects } from '../actions/fetch-projects';
import { fetchDataSet } from '../actions/fetch-dataset';
import { setViewProps } from '../actions/set-viewprops';
import { SET_VIEW_PROPS } from '../actions/actionTypes';

import { decompressFromEncodedURIComponent } from '../js/lz-string';
import { merge } from '../js/util';

class ViewStateInitialiser extends PureComponent {

	componentWillMount() {
		let { dispatch, dataset,
			viewsettings, initialState,
			path, stateName } = this.props;

		let viewState = merge(initialState, dataset.viewState);
		if (viewsettings) {
			viewsettings = dataset.viewStateConverter.decode(JSON.parse(decompressFromEncodedURIComponent(viewsettings)), dataset);
			viewState = merge(viewState, viewsettings);
		}

		// We dispatch even in case of existing state,
		// to synchronise the view-settings URL
		dispatch(setViewProps(dataset, {
			type: SET_VIEW_PROPS,
			viewState,
			stateName,
			path,
		}));
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

const NO_DATASETS = 0;
const NO_ATTRIBUTES = 1;
const READY = 2;
const MANGLED_PATH = -1;

export class ViewInitialiser extends PureComponent {
	componentWillMount() {
		this.updateState = this.updateState.bind(this);

		const {
			datasets,
			params,
		} = this.props;

		const {
			project,
			filename,
		} = params;

		const path = `${project}/${filename}`;

		const fetchingProjects = (
			<div className='view centered' >
				<h1>Fetching projects list</h1>
			</div>
		);
		const fetchingDatasets = (
			<div className='view centered'>
				<h1>Fetching dataset: {path}</h1>
			</div>
		);
		const mangledPath = (
			<div className='view centered' >
				<h1>Error: <i>{path}</i> not found in list of datasets</h1>
			</div>
		);

		let state = {
			path,
			fetchingProjects,
			fetchingDatasets,
			mangledPath,
		};

		let updatedState = this.updateState(datasets, path, MANGLED_PATH);
		if (updatedState){
			state = merge(state, updatedState);
		}

		this.setState(state);
	}

	componentWillReceiveProps(nextProps) {
		const { datasets } = nextProps;
		const { path, initialisationState } = this.state;
		const updatedState = this.updateState(datasets, path, initialisationState);
		if (updatedState){
			this.setState(updatedState);
		}
	}

	updateState(datasets, path, prevInitialisationState) {
		const { dispatch } = this.props;
		const dataset = datasets ? datasets[path] : null;
		let initialState;

		const initialisationState = datasets ? (
			dataset ? (
				(dataset.col && dataset.row) ? READY : NO_ATTRIBUTES
			) : MANGLED_PATH) : NO_DATASETS;

		if (initialisationState !== prevInitialisationState) {
			switch (initialisationState) {
				case NO_DATASETS:
					dispatch(fetchProjects());
					break;
				case NO_ATTRIBUTES:
					dispatch(fetchDataSet(datasets, path));
					break;
				case READY:
					initialState = this.props.stateInitialiser(dataset);
			}
			return {
				initialisationState,
				initialState,
			};
		}
	}

	render() {
		const {
			View,
			stateName,
			dispatch,
			datasets,
			params,
		} = this.props;
		const {
			viewsettings,
		} = params;

		const {
			path,
			fetchingProjects,
			fetchingDatasets,
			mangledPath,
			initialisationState,
			initialState,
		} = this.state;

		switch (initialisationState) {
			case NO_DATASETS:
				return fetchingProjects;
			case NO_ATTRIBUTES:
				return fetchingDatasets;
			case READY:
				// datasets is guaranteed to be defined
				// if initialisationState === READY
				return (
					<ViewStateInitialiser
						View={View}
						stateName={stateName}
						initialState={initialState}
						dataset={datasets[path]}
						path={path}
						dispatch={dispatch}
						viewsettings={viewsettings} />
				);
			case MANGLED_PATH:
				return mangledPath;
		}
	}
}

ViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	stateName: PropTypes.string.isRequired,
	stateInitialiser: PropTypes.func.isRequired,
	datasets: PropTypes.object,
};