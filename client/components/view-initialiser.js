import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { requestProjects } from 'actions/request-projects';
import { requestDataset } from 'actions/request-dataset';

import { asyncPainterQueue } from 'plotters/async-painter';

const NO_DATASETS = 0;
const NO_ATTRIBUTES = 1;
const READY = 2;
const MANGLED_PATH = -1;

function currentInitialisation(dispatch, datasets, path, viewStateURI, prevInitialisationState) {
	const dataset = datasets ? datasets[path] : null;

	const initialisationState = !datasets ? NO_DATASETS : (
		!dataset ? MANGLED_PATH : (
			!(dataset.col || dataset.row) ? NO_ATTRIBUTES : READY
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
			default:
		}
	}
	return initialisationState;
}

export class ViewInitialiser extends Component {
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
				<h1>Fetching and preparing dataset: {path}</h1>
			</div>
		);
		const mangledPath = (
			<div className='view centred' >
				<h1>Error: <i>{path}</i> not found in list of datasets</h1>
			</div>
		);

		const initialisationState = currentInitialisation(dispatch, datasets, path, viewStateURI, MANGLED_PATH);

		this.setState(() => {
			return {
				path,
				fetchingProjects,
				fetchingDatasets,
				mangledPath,
				initialisationState,
			};
		});
	}

	componentWillReceiveProps(nextProps) {

		const {
			dispatch,
			datasets,
			params,
		} = nextProps;

		const {
			path,
			initialisationState,
		} = this.state;

		const newInitialisationState = currentInitialisation(dispatch, datasets, path, params.viewStateURI, initialisationState);

		if (initialisationState !== newInitialisationState){
			this.setState(() => { return { initialisationState: newInitialisationState }; });
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
			case READY:
				// datasets is guaranteed to be defined
				// if initialisationState === READY
				return (
					<View
						dispatch={dispatch}
						dataset={datasets[path]} />
				);
		}
		return '';
	}
}

ViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	View: PropTypes.func.isRequired,
	datasets: PropTypes.object,
};