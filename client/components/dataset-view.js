import React, { Component, PropTypes } from 'react';
import { Grid, Col, Row, ListGroup, ListGroupItem, Panel, PanelGroup } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { fetchProjects } from '../actions/actions';


class DataSetViewComponent extends Component {

	componentDidMount() {
		const { dispatch, projects } = this.props;
		dispatch(fetchProjects(projects));
	}

	render() {
		return (
			<Grid>
				<Row>
					<Col xs={12} md={8}>
						<hr />
						<h1>Linnarsson Lab single-cell data repository</h1>
						<br />
						<h2>Available datasets</h2>
						<div>
							<ProjectList projects={this.props.projects} />
						</div>
					</Col>
				</Row>
			</Grid>
		);
	}
}

DataSetViewComponent.propTypes = {
	projects: PropTypes.object.isRequired,
};

//connect DataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	return { projects: state.data.projects };
};
export const DataSetView = connect(mapStateToProps)(DataSetViewComponent);


// Generates a list of projects, each with a list
// of datasets associated with the project.
class ProjectList extends Component {
	render() {
		const { projects } = this.props;
		if (projects) {
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

			return <div>{panels}</div>
		} else {
			return (
				<Panel
					header={'Downloading list of available datasets...'}
					bsStyle='primary'
					/>
			);
		}
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