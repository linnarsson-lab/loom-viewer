import React, { Component, PropTypes } from 'react';
import {
	Button, Glyphicon,
	Form, FormGroup, FormControl, InputGroup, ControlLabel
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
	{
		header: 'DATE ',
		key: 'lastModified',
		headerStyle: { fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
		dataStyle: { width: '8%', fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
		defaultSorting: 'DESC',
	},
	{
		header: 'TITLE ',
		key: 'title',
		headerStyle: { fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
		dataStyle: { width: '18%', fontSize: '12px', padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' },
	},
	{
		header: 'DESCRIPTION ',
		key: 'description',
		headerStyle: { fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
		dataStyle: { width: '28%', fontSize: '12px', padding: '8px', fontStyle: 'italic', verticalAlign: 'middle' },
	},
	{
		header: 'PROJECT ',
		key: 'project',
		headerStyle: { fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
		dataStyle: { width: '18%', fontSize: '12px', padding: '8px', verticalAlign: 'middle' },
	},
	{
		header: 'DATASET ',
		key: 'dataset',
		headerStyle: { fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
		dataStyle: { width: '16%', fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
	},
	{
		header: 'CELL SAMPLE SIZE ',
		key: 'totalCells',
		headerStyle: { fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
		dataStyle: { width: '6%', fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
	},
	{
		header: (
			<div
				style={{ textAlign: 'center' }}
				title={'Original Reference'} >
				<Glyphicon glyph='file' />
			</div>
		),
		key: 'doi',
		headerStyle: { margin: 0, padding: 0, fontSize: '12px', verticalAlign: 'middle' },
		dataStyle: { margin: 0, padding: 0, width: '2%', verticalAlign: 'middle' },
		sortable: false,
	},
	{
		header: (
			<div
				style={{ textAlign: 'center' }}
				title={'External Webpage'} >
				<Glyphicon glyph='globe' />
			</div>
		),
		key: 'url',
		headerStyle: { margin: 0, padding: 0, fontSize: '12px', verticalAlign: 'middle' },
		dataStyle: { margin: 0, padding: 0, width: '2%', verticalAlign: 'middle' },
		sortable: false,
	},
	{
		header: (
			<div
				style={{ textAlign: 'center' }}
				title={'Download Loom File'} >
				<Glyphicon glyph='cloud-download' />
			</div>
		),
		key: 'download',
		headerStyle: { margin: 0, padding: 0, fontSize: '12px', verticalAlign: 'middle' },
		dataStyle: { margin: 0, padding: 0, width: '2%', verticalAlign: 'middle' },
		sortable: false,
	},
];


// Generates a list of datasets
const DatasetList = function (props) {
	const { datasets } = props;
	if (datasets) {
		for (let i = 0; i < datasets.length; i++) {
			let proj = datasets[i];
			const { project, title, dataset, url, doi } = proj;
			let path = project + '/' + dataset;
			const titleURL = (
				<Link
					to={'dataset/genes/' + path}
					title={'Open ' + path}>
					{title}
				</Link>

			);
			const downloadURL = '/clone/' + path;
			const downloadButton = (
				<div style={{ textAlign: 'center' }}>
					<Button
						bsSize='xsmall'
						bsStyle='link'
						href={downloadURL}
						title={'Download ' + path}
						>
						<Glyphicon style={{ fontSize: '12px' }} glyph='cloud-download' />
					</Button>
				</div>
			);
			const paperButton = doi === '' ? null : (
				<div style={{ textAlign: 'center' }}>
					<Button
						bsSize='xsmall'
						bsStyle='link'
						href={'http://dx.doi.org/' + doi}
						title={'Original reference: http://dx.doi.org/' + doi}
						>
						<Glyphicon style={{ fontSize: '12px' }} glyph='file' />
					</Button>
				</div>
			);
			const urlButton = url === '' ? null : (
				<div style={{ textAlign: 'center' }}>
					<Button
						bsSize='xsmall'
						bsStyle='link'
						href={url}
						title={'External web page: ' + url}
						>
						<Glyphicon style={{ fontSize: '12px' }} glyph='globe' />
					</Button>
				</div>
			);
			// create new datasets object with proper tags
			datasets[i] = merge(
				datasets[i],
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
				<SortableTable
					data={datasets}
					columns={columns}
					/>
			</div>
		);
	} else {
		return (<h2>'Downloading list of available datasets...'</h2>
		);
	}
};

DatasetList.propTypes = {
	datasets: PropTypes.array,
};


class DataSetViewComponent extends Component {

	componentDidMount() {
		const { dispatch, projects } = this.props;
		dispatch(fetchProjects(projects));
	}

	handleChangeFactory(field) {
		return (event) => {
			let searchVal = event.target.value ? event.target.value : '';
			this.props.dispatch({
				type: SEARCH_PROJECTS,
				field,
				search: searchVal,
			});
		};
	}

	render() {
		const { projects, search } = this.props;

		let allDatasets = null;

		if (projects) {
			// merge all projects
			allDatasets = [];
			for (let keys = Object.keys(projects), i = 0; i < keys.length; i++) {
				allDatasets = allDatasets.concat(projects[keys[i]]);
			}

			if (search) {
				// give date a special (exact) treatment
				let date = search.lastModified;
				if (date) {
					let filtered = [];
					for (let i = 0; i < allDatasets.length; i++) {
						if (allDatasets[i].lastModified.indexOf(date) !== -1) {
							filtered.push(allDatasets[i]);
						}
					}
					allDatasets = filtered;
				}

				// fuzzy text search per field
				let keys = ['project', 'title', 'dataset', 'description'];
				for (let i = 0; allDatasets.length && i < keys.length; i++) {
					let key = keys[i];
					let query = search[key];
					if (query) {
						let fuse = new Fuse(allDatasets, { keys: [key], treshold: 0.1 });
						allDatasets = fuse.search(query);
					}
				}
				// generic search on whatever remains
				if (search.all && allDatasets.length) {
					let fuse = new Fuse(allDatasets, { keys: ['project', 'title', 'dataset', 'description'], treshold: 0.1 });
					allDatasets = fuse.search(search.all);
				}
			}
		}

		return (
			<div className='view-vertical' style={{ margin: '2em' }}>
				<h1>Available Datasets</h1>
				<Form inline>
					<FormGroup style={{ width: '100%' }}>
						<ControlLabel style={{ width: '8%', paddingRight: '12px', verticalAlign: 'middle', textAlign: 'right' }}>SEARCH</ControlLabel>
						<FormControl
							type='text'
							placeholder='All fields..'
							style={{ width: '80%', fontSize: '12px', paddingLeft: '8px' }}
							onChange={this.handleChangeFactory('all')} />
					</FormGroup>
				</Form>
				<Form inline>
					<FormGroup style={{ width: '100%' }}>
						<InputGroup style={{ width: '100%' }}>
							<FormControl
								type='text'
								placeholder='Date..'
								style={{ width: '8%', fontSize: '12px', padding: '8px' }}
								onChange={this.handleChangeFactory('lastModified')} />
							<FormControl
								type='text'
								placeholder='Title..'
								style={{ width: '18%', fontSize: '12px', padding: '8px' }}
								onChange={this.handleChangeFactory('title')} />
							<FormControl
								type='text'
								placeholder='Descriptions..'
								style={{ width: '28%', fontSize: '12px', padding: '8px' }}
								onChange={this.handleChangeFactory('description')} />
							<FormControl
								type='text'
								placeholder='Projects..'
								style={{ width: '18%', fontSize: '12px', padding: '8px' }}
								onChange={this.handleChangeFactory('project')} />
							<FormControl
								type='text'
								placeholder='Datasets..'
								style={{ width: '16%', fontSize: '12px', padding: '8px' }}
								onChange={this.handleChangeFactory('dataset')} />
						</InputGroup>
					</FormGroup>
				</Form>
				<DatasetList datasets={allDatasets} />
			</div>
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