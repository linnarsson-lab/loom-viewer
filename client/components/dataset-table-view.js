import React, { Component, PropTypes } from 'react';
import {
	Grid, Col, Row,
	Button, Glyphicon,
	FormGroup, FormControl, InputGroup,
} from 'react-bootstrap';
import { Link } from 'react-router';

import { SEARCH_PROJECTS } from '../actions/actionTypes';
import { fetchProjects } from '../actions/actions';
import { merge } from '../js/util';

import SortableTable from 'react-sortable-table';
import Fuse from 'fuse.js';

// needed for SortableTable
window.React = React;

const columns = [
	{ header: 'PROJECT', key: 'project', defaultSorting: 'ASC' },
	{ header: 'TITLE', key: 'title', defaultSorting: 'ASC' },
	{ header: 'DATASET', key: 'dataset' },
	{ header: 'DATE', key: 'lastModified' },
	{ header: 'DESCRIPTION', key: 'description' },
	{ header: <Glyphicon glyph='file' />, key: 'doi', sortable: false },
	{ header: <Glyphicon glyph='globe' />, key: 'url', sortable: false },
	{ header: <Glyphicon glyph='cloud-download' />, key: 'download', sortable: false },
];


// Generates a list of projects, each with a list
// of datasets associated with the project.
const ProjectList = function (props) {
	const { projects } = props;
	if (projects) {
		for (let i = 0; i < projects.length; i++) {
			let proj = projects[i];
			const { project, title, dataset, url, doi } = proj;
			let path = project + '/' + dataset;
			const titleURL = (
				<Link to={'dataset/genes/' + path} title={'Open ' + path}>
					{title}
				</Link>

			);
			const downloadURL = '/clone/' + path;
			const downloadButton = (
				<Button
					className='pull-right'
					bsSize='xsmall'
					bsStyle='link'
					href={downloadURL}
					title={'Download ' + path}
					>
					<Glyphicon glyph='cloud-download' />
				</Button>
			);
			const paperButton = doi === '' ? null : (
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
			const urlButton = url === '' ? null : (
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
			// create new projects object with proper tags
			projects[i] = merge(
				projects[i],
				{
					title: titleURL,
					doi: paperButton,
					url: urlButton,
					download: downloadButton,
				}
			);
		}
		return (
			<div>
				<h2>Available Datasets</h2>
				<SortableTable
					data={projects}
					columns={columns}
					/>
			</div>
		);
	} else {
		return (<h2>'Downloading list of available datasets...'</h2>
		);
	}
};

ProjectList.propTypes = {
	projects: PropTypes.array,
};


class DataSetViewComponent extends Component {

	componentDidMount() {
		const { dispatch, projects } = this.props;
		dispatch(fetchProjects(projects));
	}

	render() {
		const { projects, search } = this.props;
		let allProjects = [];
		if (projects) {

			// merge all projects into one list
			Object.keys(projects).map(
				(p) => { allProjects = allProjects.concat(projects[p]); }
			);

			if (search) {
				// apply fuzzy search
				let keys = ['project', 'title', 'dataset', 'description'];
				for (let i = 0; i < keys.length; i++) {
					let key = keys[i];
					let query = search[key];
					if (query) {
						let fuse = new Fuse(allProjects, { keys: [key] });
						allProjects = fuse.search(query);
					}
				}
				// give date a special (exact) treatment
				let date = search.lastModified;
				if (date){
					let filtered = [];
					for (let i = 0; i < allProjects.length; i++){
						if (allProjects[i].lastModified.indexOf(date) !== -1){
							filtered.push(allProjects[i]);
						}
					}
					allProjects = filtered;
				}
			}
		}
		const handleChangeFactory = (field) => {
			return (event) => {
				let searchVal = event.target.value ? event.target.value : '';
				this.props.dispatch({
					type: SEARCH_PROJECTS,
					field,
					search: searchVal,
				});
			};
		};

		return (
			<Grid>
				<Row>
					<Col>
						<h1>Datasets</h1>
						<h2>Search Dataset List</h2>
						<FormGroup>
							<InputGroup>
								<InputGroup.Addon>Project</InputGroup.Addon>
								<FormControl
									type='text'
									placeholder='..'
									onChange={handleChangeFactory('project')} />
								<InputGroup.Addon>Title</InputGroup.Addon>
								<FormControl
									type='text'
									placeholder='..'
									onChange={handleChangeFactory('title')} />
								<InputGroup.Addon>Dataset</InputGroup.Addon>
								<FormControl
									type='text'
									placeholder='..'
									onChange={handleChangeFactory('dataset')} />
								<InputGroup.Addon>Date</InputGroup.Addon>
								<FormControl
									type='text'
									placeholder='..'
									onChange={handleChangeFactory('lastModified')} />
								<InputGroup.Addon>Description</InputGroup.Addon>
								<FormControl
									type='text'
									placeholder='..'
									onChange={handleChangeFactory('description')} />
								<InputGroup.Addon><Glyphicon glyph='file' /></InputGroup.Addon>
								<InputGroup.Addon><Glyphicon glyph='globe' /></InputGroup.Addon>
								<InputGroup.Addon><Glyphicon glyph='cloud-download' /></InputGroup.Addon>
							</InputGroup>
						</FormGroup>
						<ProjectList projects={allProjects} />
					</Col>
				</Row>
			</Grid>
		);
	}
}

DataSetViewComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	projects: PropTypes.object,
	search: PropTypes.object,
};

//connect DataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	return {
		projects: state.data.projects,
		search: state.data.search,
	};
};
export const DataSetView = connect(mapStateToProps)(DataSetViewComponent);