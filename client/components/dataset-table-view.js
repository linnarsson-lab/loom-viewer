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
	{
		header: 'TITLE ',
		key: 'title',
		headerStyle: { fontSize: '10px', verticalAlign: 'middle' },
		dataStyle: { fontWeight: 'bold', width: '35%', verticalAlign: 'middle' },
	},
	{
		header: 'DATASET ',
		key: 'dataset',
		headerStyle: { fontSize: '10px', verticalAlign: 'middle' },
		dataStyle: { width: '14%', fontSize: '10px', verticalAlign: 'middle' },
	},
	{
		header: 'DESCRIPTION ',
		key: 'description',
		headerStyle: { fontSize: '10px', verticalAlign: 'middle' },
		dataStyle: { width: '35%', fontStyle: 'italic', verticalAlign: 'middle' },
	},
	{
		header: 'DATE ',
		key: 'lastModified',
		headerStyle: { fontSize: '10px', verticalAlign: 'middle' },
		dataStyle: { width: '10%', fontSize: '10px', verticalAlign: 'middle' },
		defaultSorting: 'DESC',
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

		let datasetlists = null;

		if (projects) {
			// create an array of search actions to perform
			let searches = [];
			if (search) {
				// generate fuzzy text search
				let keys = ['project', 'title', 'dataset', 'description'];
				for (let i = 0; i < keys.length; i++) {
					let key = keys[i];
					let query = search[key];
					if (query) {
						searches.push((datasets) => {
							let fuse = new Fuse(datasets, { keys: [key], treshold: 0.1 });
							return fuse.search(query);
						});
					}
				}
				// give date a special (exact) treatment
				let date = search.lastModified;
				if (date) {
					searches.push((datasets) => {
						let filtered = [];
						for (let i = 0; i < datasets.length; i++) {
							if (datasets[i].lastModified.indexOf(date) !== -1) {
								filtered.push(datasets[i]);
							}
						}
						return filtered;
					});
				}
			}

			datasetlists = Object.keys(projects).map(
				(project) => {
					let datasets = projects[project].slice(0);
					for (let i = 0; i < searches.length && datasets.length; i++) {
						datasets = searches[i](datasets);
					}
					return datasets.length ? (
						<div>
							<h2>{project}</h2>
							<DatasetList datasets={datasets} />
						</div>
					) : undefined;
				}
			);
		}

		return (
			<Grid>
				<Row>
					<Col>
						<h1>Available Datasets</h1>
						<FormGroup style={{ width: '100%', paddingLeft: '8px' }}>
							<FormControl
								type='text'
								placeholder='Filter Projects..'
								style={{ width: '45%', fontSize: '1.2em', fontStyle: 'italic', paddingLeft: '8px'}}
								onChange={this.handleChangeFactory('project')} />
						</FormGroup>
						<FormGroup style={{ width: '100%' }}>
							<InputGroup style={{ width: '100%' }}>
								<FormControl
									type='text'
									placeholder='FILTER TITLES..'
									style={{ width: '35%', fontSize: '10px', padding: '8px' }}
									onChange={this.handleChangeFactory('title')} />
								<FormControl
									type='text'
									placeholder='FILTER DATASETS..'
									style={{ width: '14%', fontSize: '10px', padding: '8px' }}
									onChange={this.handleChangeFactory('dataset')} />
								<FormControl
									type='text'
									placeholder='FILTER DESCRIPTIONS..'
									style={{ width: '35%', fontSize: '10px', padding: '8px' }}
									onChange={this.handleChangeFactory('description')} />
								<FormControl
									type='text'
									placeholder='FILTER DATE..'
									style={{ width: '10%', fontSize: '10px', padding: '8px' }}
									onChange={this.handleChangeFactory('lastModified')} />
							</InputGroup>
						</FormGroup>
						{datasetlists}
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