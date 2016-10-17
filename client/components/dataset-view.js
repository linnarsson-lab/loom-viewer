import React, { Component, PropTypes } from 'react';
import {
	Grid, Col, Row,
	ListGroup, ListGroupItem,
	Panel, PanelGroup,
	Button, Glyphicon,
} from 'react-bootstrap';
import { Link } from 'react-router';
import { fetchProjects } from '../actions/actions';

const DataSetListItem = function (props) {
	const { dataset, title, description, url, doi } = props.dataSetMetaData;

	const downloadURL = '/clone/' + props.dataSetPath;
	const downloadButton = (
		<Button
			className='pull-right'
			bsSize='xsmall'
			bsStyle='link'
			href={downloadURL}
			title={'Download ' + props.dataSetPath}
			>
			<Glyphicon glyph='cloud-download' />
		</Button>
	);
	const paperButton = doi === '' ? (<span></span>) : (
		<Button
			className='pull-right'
			bsSize='xsmall'
			bsStyle='link'
			href={'http://dx.doi.org/' + doi}
			title='Original reference'
			>
			<Glyphicon glyph='file' />
		</Button>
	);
	const urlButton = url === '' ? (<span></span>) : (
		<Button
			className='pull-right'
			bsSize='xsmall'
			bsStyle='link'
			href={url}
			title='External web page'
			>
			<Glyphicon glyph='globe' />
		</Button>
	);

	const path = 'dataset/genes/' + props.dataSetPath;

	return (
		<ListGroupItem key={dataset + '_buttons'}>
			<div>
				<strong><Link to={path} title={'Open ' + props.dataSetPath}>{title}</Link></strong>
			</div>
			<div><code>{dataset}</code> {downloadButton}{urlButton}{paperButton}</div>
			<div><em>{description}</em></div>
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
		const keys = Object.keys(projects);
		keys.sort();
		const panels = keys.map(
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
				header={<h3>'Downloading list of available datasets...'</h3>}
				bsStyle='default'
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
					<Col xs={12} md={12} lg={12}>
						<h1>Datasets (<Link to='/dataset/search' title={'Search Datasets...'}>search</Link>)</h1>
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