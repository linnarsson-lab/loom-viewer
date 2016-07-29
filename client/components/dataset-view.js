import React, { Component, PropTypes } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import {
	Grid, Col, Row,
	ListGroup, ListGroupItem,
	Panel, PanelGroup,
	ButtonGroup, DropdownButton, MenuItem,
} from 'react-bootstrap';
import { fetchProjects } from '../actions/actions';


class DataSetListItem extends Component {

	constructor(props, context) {
		super(props, context);
		this.renderDropdownLink = this.renderDropdownLink.bind(this);
		this.renderDropdown = this.renderDropdown.bind(this);
	}

	renderDropdownLink(view) {
		const path = 'view/' + view + '/' + this.props.dataSetPath;
		return (
			<LinkContainer to={path} key={path}>
				<MenuItem
					eventKey={path}>
					{view}
				</MenuItem>
			</LinkContainer>
		);
	}

	renderDropdown() {
		const { dataset, status, message } = this.props.dataSetMetaData;
		const disabled = status !== 'created';
		const views = ['heatmap', 'sparkline', 'landscape', 'genescape'];
		const links = views.map(this.renderDropdownLink);
		return (
			<ButtonGroup key={dataset} >
				<DropdownButton
					title={dataset + '. ' + message}
					bsStyle='link'
					disabled={disabled}>
					{links}
				</DropdownButton>
			</ButtonGroup>
		);
	}

	render() {
		const { dataSetMetaData } = this.props;
		const { dataset } = dataSetMetaData;

		const viewLinksDropdown = this.renderDropdown();
		return (
			<div>
				<ListGroupItem key={dataset}>
					{viewLinksDropdown}
				</ListGroupItem>
			</div>
		);
	}
}

DataSetListItem.propTypes = {
	dataSetPath: PropTypes.string.isRequired,
	dataSetMetaData: PropTypes.object.isRequired,
};


class DataSetList extends Component {

	// Takes the metadata of the dataset
	// and returns a DataSetListItem
	createListItem(dataSetMetaData) {
		const { transcriptome, project, dataset} = dataSetMetaData;
		const dataSetPath =  transcriptome + '/' +
			project + '/' +
			dataset;

		return (
			<DataSetListItem
				key={dataSetPath}
				dataSetPath={dataSetPath}
				dataSetMetaData={dataSetMetaData}
				/>
		);
	}

	render() {
		const { project, projectState } = this.props;
		const totalDatasets = projectState.length.toString() + ' dataset' + (projectState.length !== 1 ? 's' : '');
		const datasets = projectState.map(this.createListItem);
		return (
			<Panel
				key={project}
				header={`${project}, ${totalDatasets}`}
				bsStyle='primary'>
				<ListGroup fill>
					{datasets}
				</ListGroup>
			</Panel>
		);
	}
}

DataSetList.propTypes = {
	project: PropTypes.string.isRequired,
	projectState: PropTypes.array.isRequired,
};


// Generates a list of projects, each with a list
// of datasets associated with the project.
const  ProjectList = function(props) {
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
						<hr />
						<h1>Linnarsson Lab single-cell data repository</h1>
						<br />
						<h2>Available datasets</h2>
						<PanelGroup>
							<ProjectList projects={this.props.projects} />
						</PanelGroup>
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