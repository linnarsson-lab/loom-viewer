import React, { Component, PropTypes } from 'react';
import { fetchDataset } from '../actions/actions.js';
import * as _ from 'lodash';
import { CreateDataset } from './dataset-upload.js';

export class DatasetView extends Component {

	render() {
		// unused at the moment: this.props.viewState
		const { dispatch, dataState } = this.props;

		const panels = Object.keys(dataState.projects).map((proj) => {
			const datasets = dataState.projects[proj].map((state) => {
				return (
					<DataSetListItem
						key={state.dataset}
						isCurrent={state.dataset === dataState.currentDataset.dataset}
						state={state}
						proj={proj}
						dispatch={dispatch}
						/>
				);
			});
			return (
				<div key={proj} className='panel panel-primary'>
					<div className='panel-heading'>
						{proj}
						<div className='pull-right'>
							<span>
								{
									dataState.projects[proj].length.toString() +
									' dataset' +
									(dataState.projects[proj].length > 1 ? 's' : '')
								}
							</span>
						</div>
					</div>
					<div className='list-group'>
						{datasets}
					</div>
				</div>
			);
		});

		return (
			<div className='container'>
				<div className='row'>
					<div className='view col-md-8'>
						<hr />
						<h1>Linnarsson lab single-cell data repository</h1>
						<hr />
						<h2>Available datasets</h2>
						<div>
							{ panels.length === 0 ?
								<div className='panel panel-primary'>
									<div className='panel-heading'>
										Downloading list of available datasets...
									</div>
								</div>
								:
								panels
							}
						</div>
						<hr />
						<CreateDataset />
					</div>
				</div>
			</div>
		);
	}
}

DatasetView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};



class DataSetListItem extends Component {
	render() {
		const { key, isCurrent, state, proj, dispatch } = this.props;
		return (
			<div
				key={key}
				className={'list-group-item' + (isCurrent ? ' list-group-item-info' : '') }>
				<a onClick={
					() => {
						const ds = state.transcriptome + '__' + proj + '__' + state.dataset;
						dispatch(fetchDataset(ds));
					}
				}>
					{state.dataset}
				</a>
				<span>{' ' + state.message}</span>
				<div className='pull-right'>
					<a>Delete</a> / <a>Duplicate</a> / <a>Edit</a>
				</div>
			</div>
		);
	}
}

