import React, { Component, PropTypes } from 'react';
import { ListGroup, ListGroupItem, Panel, PanelGroup } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

class DataSetListItem extends Component {
	render() {
		const { key, isCurrent, project, state } = this.props;

		const datasetpath = '/dataset/' +
			state.transcriptome + '/' +
			project + '/' +
			state.dataset;

		return (
			<ListGroupItem active={isCurrent} key={key}>
				<LinkContainer to={datasetpath}>
					{state.dataset}
				</LinkContainer>
			</ListGroupItem>
		);

		// Fetch logic from this needs to move to Router, commented
		// out for reference for now.
		// <div
		// 	key={key}
		// 	className={'list-group-item' + (isCurrent ? ' list-group-item-info' : '') }>
		// 	<a onClick={
		// 		() => {
		// 			const ds = state.transcriptome + '__' + state.proj + '__' + state.dataset;
		// 			dispatch(fetchDataset(ds));
		// 		}
		// 	}>
		// 		{state.dataset}
		// 	</a>
		// 	<span>{' ' + state.message}</span>
		// </div>
	}
}

class DataSetList extends Component {
	createListItem(state) {
		return (
			<DataSetListItem
				key={state.dataset}
				isCurrent={state.dataset === this.props.dataState.currentDataset.dataset}
				state={state}
				project={this.props.project}
				/>
		);
	}

	render() {
		const { dataState, project } = this.props;
		const projectState = dataState.projects[project];
		const datasets = projectState.map(this.createListItem);
		const totalDatasets = projectState.length.toString() + ' dataset' + (projectState.length > 1 ? 's' : '');
		return (
			<Panel key={project} header={project} bsStyle='primary'>
				<div className='pull-right'>
					<span>
						{ totalDatasets }
					</span>
				</div>
				{datasets}
			</Panel>
		);
	}
}

export class DataSetView extends Component {

	render() {
		// 	const { dataState } = this.props;

		// 	const panels = dataState.projects ? Object.keys(dataState.projects).map(
		// 		(project) => {
		// 			return (
		// 				<DataSetList
		// 					dataState={dataState}
		// 					project={project}
		// 					/>
		// 			);
		// 		}
		// 	) : [];
		// 	const datasets = panels.length > 0 ? panels : (
		// 		<Panel
		// 			header={'Downloading list of available datasets...'}
		// 			bsStyle='primary'
		// 			/>
		// 	);
		const datasets = "Placeholder until redux is connected again"

		return (
			<div>
				<hr />
				<h1>Linnarsson Lab single-cell data repository</h1>
				<br />
				<h2>Available datasets</h2>
				<div>
					{ datasets }
				</div>
				<hr />
			</div >
		);
	}
}

DataSetView.propTypes = {
	//dataState: PropTypes.object.isRequired,
};