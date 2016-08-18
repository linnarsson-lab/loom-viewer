import React, { Component, PropTypes } from 'react';
import {
	Grid, Col, Row,
	ListGroup, ListGroupItem,
	Panel, PanelGroup,
	Button, Glyphicon,
} from 'react-bootstrap';
import { fetchProjects } from '../actions/actions';


const DataSetListItem = function (props) {
	const { dataset } = props.dataSetMetaData;

	const downloadURL = '/clone/' + props.dataSetPath;
	const downloadButton = (
		<Button
			className='pull-right'
			bsSize='xsmall'
			bsStyle='link'
			href={downloadURL}
			title={"Download " + props.dataSetPath}
			>
			<Glyphicon glyph='cloud-download' />
		</Button>
	);

	const path = 'dataset/genescape/' + props.dataSetPath;

	const datasetLink = (
		<a href={path} title={"Open " + props.dataSetPath }>{dataset}</a>
	);

	return (
		<ListGroupItem key={dataset + '_buttons'}>
			<div>{datasetLink} {downloadButton}</div>
		</ListGroupItem>
	);
};


DataSetListItem.propTypes = {
	dataSetPath: PropTypes.string.isRequired,
	dataSetMetaData: PropTypes.object.isRequired,
};


const DataSetList = function (props) {

	const { project, projectState } = props;
	const datasets = projectState.map((dataSetMetaData) => {
		// Takes the metadata of the dataset
		// and returns a DataSetListItem
		const { dataset } = dataSetMetaData;
		return (
			<DataSetListItem
				key={dataset}
				dataSetPath={project + '/' + dataset}
				dataSetMetaData={dataSetMetaData}
				/>
		);
	});
	const title = <h3>{project}</h3>;
	return (
		<Panel
			key={project}
			header={title}
			bsStyle='default'>
			<ListGroup fill>
				{datasets}
			</ListGroup>
		</Panel>
	);
};


DataSetList.propTypes = {
	project: PropTypes.string.isRequired,
	projectState: PropTypes.array.isRequired,
};


// Generates a list of projects, each with a list
// of datasets associated with the project.
const ProjectList = function (props) {
	const { projects } = props;
	if (projects) {
		const panels = Object.keys(projects).map(
			(project) => {
				return (
					<DataSetList
						key={project}
						project={project}
						projectState={projects[project]}
						/>
				);
			}
		);

		return <div>{panels}</div>;
	} else {
		return (
			<Panel
				header={'Downloading list of available datasets...'}
				bsStyle='primary'
				/>
		);
	}
};

ProjectList.propTypes = {
	projects: PropTypes.object,
};

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
						<h2>Available datasets</h2>
						<h4>&nbsp;</h4>
						<PanelGroup>
							<ProjectList projects={this.props.projects} />
						</PanelGroup>
						<h4>Debug</h4>
						<a href='/dataset/benchmark'>Canvas Benchmark</a>
					</Col>
				</Row>
			</Grid>
		);
	}
}

DataSetViewComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	projects: PropTypes.object,
};

//connect DataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	return { projects: state.data.projects };
};
export const DataSetView = connect(mapStateToProps)(DataSetViewComponent);