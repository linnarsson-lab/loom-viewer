import React, { Component, PropTypes } from 'react';
import { Grid, Col, Row, ListGroup, ListGroupItem, Panel, PanelGroup } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { groupBy } from 'lodash';

//import { fetchProjects } from '../actions/actions.js';
// import connect from 'react-redux';
// import * as actionCreators from '../actions/actions.js';


class DataSetListItem extends Component {
	render() {
		const { dataSet, message, dataSetPath } = this.props;

		return (
			<LinkContainer to={dataSetPath}>
				<ListGroupItem key={dataSet}>
					{dataSet}
					<div className='pull-right'>
						{message}
					</div>
				</ListGroupItem>
			</LinkContainer>
		);
	}
}

class DataSetList extends Component {

	// Takes the metadata of the dataset
	// and returns a DataSetListItem
	createListItem(dataSetMetaData) {
		const { transcriptome, project, dataset, status, message} = dataSetMetaData;
		const dataSetPath = '/dataset/' +
			transcriptome + '/' +
			project + '/' +
			dataset;

		return (
			<DataSetListItem
				dataSetPath={dataSetPath}
				dataSet={dataset}
				message={message}
				/>
		);
	}

	render() {
		const { project, projectState } = this.props;
		const totalDatasets = ', ' + projectState.length.toString() + ' dataset' + (projectState.length !== 1 ? 's' : '');
		const datasets = projectState.map(this.createListItem);
		return (
			<Panel key={project} header={project + totalDatasets} bsStyle='primary'>
				<ListGroup fill>
					{datasets}
				</ListGroup>
			</Panel>
		);
	}
}

// Generates a list of projects, each with a list
// of datasets associated with the project.
class ProjectList extends Component {
	render() {
		const { projects } = this.props;

		const panels = Object.keys(projects).map(
			(project) => {
				return (
					<DataSetList
						project={project}
						projectState={projects[project]}
						/>
				);
			}
		);

		return panels.length > 0 ? <div>{panels}</div> : (
			<Panel
				header={'Downloading list of available datasets...'}
				bsStyle='primary'
				/>
		);
	}
}

export class DataSetView extends Component {

	// componentDidMount() {
	// 	this.props.dispatch(fetchProjects());
	// }

	render() {

		// Manually inserted data for debuggin while the connect call doesn't work
		// .. and I suspect it doesn't work BECAUSE the components are broken atm
		// data that would be returned by ./loom/
		const dataSets = [
			{
				"project": "midbrain",
				"status": "created",
				"cluster_method": "AP",
				"transcriptome": "hg19_sUCSC",
				"message": "Ready to browse.",
				"regression_label": "_Cluster",
				"n_features": 1000,
				"dataset": "human_sten_May29",
			},
			{
				"project": "Published",
				"status": "willcreate",
				"cluster_method": "AP",
				"transcriptome": "mm10_sUCSC",
				"message": "Waiting for dataset to be generated.",
				"regression_label": "CellType",
				"n_features": 1000,
				"dataset": "Oligodendrocytes_Science_2016",
			}];
		// TODO: change fetchProjects() to reflect the change from
		// { projects: { projectA: [...], projectB: [...] }} to
		// { projectA: [...], projectB: [...] }
		const projects = groupBy(dataSets, (item) => { return item.project; });
		return (
			<Grid>
				<Row>
					<Col xs={12} md={8}>
						<hr />
						<h1>Linnarsson Lab single-cell data repository</h1>
						<br />
						<h2>Available datasets</h2>
						<div>
							<ProjectList projects={projects} />
						</div>
					</Col>
				</Row>
			</Grid>
		);
	}
}

// DataSetViewComponent.propTypes = {
// 	dataState: PropTypes.object.isRequired,
// };

// function mapStateToProps(state) {
// 	return { dataState: state.dataState };
// }

//export const DataSetView = DataSetViewComponent;//connect(mapStateToProps)(DataSetViewComponent);