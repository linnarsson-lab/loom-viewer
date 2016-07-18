import React, { Component, PropTypes } from 'react';
import { Grid, Col, Row, ListGroup, ListGroupItem, Panel, PanelGroup, Button, ButtonToolbar } from 'react-bootstrap';
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
	projects: PropTypes.object,
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
							key={project}
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
		const { transcriptome, project, dataset} = dataSetMetaData;
		const dataSetPath = '/dataset/' +
			transcriptome + '/' +
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
			<Panel key={project} header={`${project}, ${totalDatasets}`} bsStyle='primary'>
				<ListGroup fill>
					{datasets}
				</ListGroup>
			</Panel>
		);
	}
}

class DataSetListItem extends Component {

	constructor(props, context) {
		super(props, context);

		this.state = { open: false };

		this.renderViewLinks = this.renderViewLinks.bind(this);
	}

	renderViewLinks() {
		const views = ['heatmap', 'sparkline', 'landscape', 'geneset'];
		const links = views.map((view) => {
			const path = this.props.dataSetPath + '/' + view;
			const disabled = this.props.dataSetMetaData.status !== 'created';
			return (
				<LinkContainer to={path} >
					<Button
						key={path}
						bsStyle='primary'
						disabled={disabled}
						>
						{view}
					</Button>
				</LinkContainer>
			);
		});
		return (
			<ButtonToolbar>
				{links}
			</ButtonToolbar>
		);
	}

	render() {
		const { dataSetMetaData } = this.props;
		const {
			cluster_method,
			transcriptome,
			regression_label,
			n_features,
			message,
			dataset,
		} = dataSetMetaData;

		const showLinks = this.state.open ? this.renderViewLinks() : undefined;
		const metadata = !this.state.open ? (<div className='pull-right'>{message}</div>) : (
			<div className='pull-right'>
				{message}<br />
				Transcriptome: {transcriptome}<br />
				Regression Label: {regression_label}<br />
				Cluster Method: {cluster_method}<br />
				# features: {n_features}<br />
			</div>
		);

		return (
			<div>
				<ListGroupItem
					key={dataset}
					onClick={ () => { this.setState({ open: !this.state.open }); } }
					>
					{dataset}
					{metadata}
					{showLinks}
				</ListGroupItem>
			</div>
		);
	}
}