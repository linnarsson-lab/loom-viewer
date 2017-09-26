import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { requestProjects } from 'actions/request-projects';
import { requestDataset } from 'actions/request-dataset';
import { setViewProps } from 'actions/set-viewprops';
import { SET_VIEW_PROPS } from 'actions/actionTypes';

import { decompressFromEncodedURIComponent } from 'js/lz-string';
import { mergeInPlace } from 'js/util';
import { viewStateInitialiser } from 'js/viewstate-initialiser';

import { asyncPainterQueue } from 'plotters/async-painter';

function generateViewState(dispatch, dataset, path, viewStateURI){
	// Generate default initial state
	let viewState = viewStateInitialiser(dataset);
	// If there is any encoded state, decode and overwrite
	// initialstate with it.
	if (viewStateURI){
		const decompressed = decompressFromEncodedURIComponent(viewStateURI);
		const parsedJSON = JSON.parse(decompressed);
		const decode = dataset.viewStateConverter.decode;
		const decodedViewState = decode(parsedJSON, dataset);
		viewState = mergeInPlace(viewState, decodedViewState);
	}
	// Synchronise the view-settings URI
	dispatch(setViewProps(dataset, {
		type: SET_VIEW_PROPS,
		viewState,
		path,
	}));
}

const NO_DATASETS = 0;
const NO_ATTRIBUTES = 1;
const NO_VIEWSTATE = 2;
const READY = 3;
const MANGLED_PATH = -1;

function currentInitialisation(dispatch, datasets, path, viewStateURI, prevInitialisationState) {
	const dataset = datasets ? datasets[path] : null;

	const initialisationState = !datasets ? NO_DATASETS : (
		!dataset ? MANGLED_PATH : (
			!(dataset.col || dataset.row) ? NO_ATTRIBUTES : (
				!dataset.viewState ? NO_VIEWSTATE : READY
			)
		)
	);

	if (initialisationState !== prevInitialisationState) {
		switch (initialisationState) {
			case NO_DATASETS:
				dispatch(requestProjects());
				break;
			case NO_ATTRIBUTES:
				dispatch(requestDataset(datasets, path));
				break;
			case NO_VIEWSTATE:
				generateViewState(dispatch, dataset, path, viewStateURI);
				break;
			default:
		}
	}
	return initialisationState;
}

export class ViewInitialiser extends PureComponent {
	componentWillMount() {

		const {
			dispatch,
			datasets,
			params,
		} = this.props;

		const {
			project,
			filename,
			viewStateURI,
		} = params;

		const path = `${project}/${filename}`;

		const fetchingProjects = (
			<div className='view centred' >
				<h1>Fetching projects list</h1>
			</div>
		);
		const fetchingDatasets = (
			<div className='view centred'>
				<h1>Fetching dataset: {path}</h1>
			</div>
		);
		const initialisingViewState = (
			<div className='view centred'>
				<h1>Initialising View Settings</h1>
			</div>
		);
		const mangledPath = (
			<div className='view centred' >
				<h1>Error: <i>{path}</i> not found in list of datasets</h1>
			</div>
		);

		const initialisationState = currentInitialisation(dispatch, datasets, path, viewStateURI, MANGLED_PATH);

		this.setState({
			path,
			fetchingProjects,
			fetchingDatasets,
			initialisingViewState,
			mangledPath,
			initialisationState,
		});
	}

	componentWillReceiveProps(nextProps) {
		const { dispatch, datasets, params } = nextProps;
		const { path, initialisationState } = this.state;
		const newInitialisationState = currentInitialisation(dispatch, datasets, path, params.viewStateURI, initialisationState);
		if (initialisationState !== newInitialisationState){
			this.setState({ initialisationState: newInitialisationState });
		}
	}

	componentWillUnmount(){
		asyncPainterQueue.clear();
	}

	render() {
		const {
			View,
			dispatch,
			datasets,
		} = this.props;

		const {
			path,
			fetchingProjects,
			fetchingDatasets,
			initialisingViewState,
			mangledPath,
			initialisationState,
		} = this.state;

		switch (initialisationState) {
			case MANGLED_PATH:
				return mangledPath;
			case NO_DATASETS:
				return fetchingProjects;
			case NO_ATTRIBUTES:
				return fetchingDatasets;
			case NO_VIEWSTATE:
				return initialisingViewState;
			case READY:
				// datasets is guaranteed to be defined
				// if initialisationState === READY
				return (
					<View
						dispatch={dispatch}
						dataset={datasets[path]} />
				);
		}
	}
}

ViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	datasets: PropTypes.object,
};