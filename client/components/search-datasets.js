import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col, Button, Glyphicon, FormControl } from 'react-bootstrap';
import { Link } from 'react-router';

import { SortableTable } from './sortabletable';

import { SEARCH_DATASETS, SORT_DATASETS } from '../actions/actionTypes';
import { fetchProjects } from '../actions/actions';
import { merge } from '../js/util';

import Fuse from 'fuse.js';

function handleChangeFactory(field, dispatch) {
	return (event) => {
		let searchVal = event.target.value ? event.target.value : '';
		dispatch({
			type: SEARCH_DATASETS,
			field,
			search: searchVal,
		});
	};
}

// Generates tabular list of datasets
const DatasetList = function (props) {
	const {datasets, dispatch, sortKey } = props;

	const dateSearch = (<FormControl type='text'
		onChange={handleChangeFactory('lastModified', dispatch)} />);

	const projectSearch = (<FormControl type='text'
		onChange={handleChangeFactory('project', dispatch)} />);

	const titleSearch = (<FormControl type='text'
		onChange={handleChangeFactory('title', dispatch)} />);

	const descriptionSearch = (<FormControl type='text'
		onChange={handleChangeFactory('description', dispatch)} />);

	const datasetSearch = (<FormControl type='text'
		onChange={handleChangeFactory('dataset', dispatch)} />);

	const headerStyles = [{ border: 'none 0px' }, { padding: '4px' }];

	const columns = [
		{
			headers: ['DATE', dateSearch],
			key: 'lastModified',
			sortIcon: 'sort-by-order',
			headerStyles,
			dataStyle: { width: '6%', fontSize: '10px' },
			onDispatch: { type: SORT_DATASETS, key: 'lastModified' },
		},
		{
			headers: ['PROJECT', projectSearch],
			key: 'project',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '16%' },
			onDispatch: { type: SORT_DATASETS, key: 'project' },
		},
		{
			headers: ['TITLE', titleSearch],
			key: 'title',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '30%', fontWeight: 'bold' },
			onDispatch: { type: SORT_DATASETS, key: 'title' },
		},
		{
			headers: ['DESCRIPTION', descriptionSearch],
			key: 'description',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '30%', fontStyle: 'italic' },
			onDispatch: { type: SORT_DATASETS, key: 'description' },
		},
		{
			headers: ['DATASET', datasetSearch],
			key: 'dataset',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '12%', fontSize: '10px' },
			onDispatch: { type: SORT_DATASETS, key: 'dataset' },
		},
		{
			headers: ['SAMPLES'],
			key: 'totalCells',
			sortIcon: 'sort-by-attributes',
			headerStyles,
			dataStyle: { width: '3%', fontSize: '10px' },
			onDispatch: { type: SORT_DATASETS, key: 'totalCells' },
		},
		{
			headers: [<div style={{ textAlign: 'center' }}><Glyphicon glyph='file' title={'Original Reference'} /></div>],
			key: 'doi',
			headerStyles: [{ border: 'none 0px', padding: '8px 0px 8px 0px' }, { padding: '0px' }],
			dataStyle: { width: '1%', padding: '0px' },
		},
		{
			headers: [<div style={{ textAlign: 'center' }}><Glyphicon glyph='globe' title={'External Webpage'} /></div>],
			key: 'url',
			headerStyles: [{ border: 'none 0px', padding: '8px 0px 8px 0px' }, { padding: '0px' }],
			dataStyle: { width: '1%', padding: '0px' },
		},
		{
			headers: [<div style={{ textAlign: 'center' }}><Glyphicon glyph='cloud-download' title={'Download Loom File'} /></div>],
			key: 'download',
			headerStyles: [{ border: 'none 0px', padding: '8px 0px 8px 0px' }, { padding: '0px' }],
			dataStyle: { width: '1%', padding: '0px' },
		},
	];

	if (datasets) {
		for (let i = 0; i < datasets.length; i++) {
			let proj = datasets[i];
			const {project, title, dataset, url, doi } = proj;
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
						<Glyphicon glyph='cloud-download' style={{ fontSize: '14px' }} />
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
						<Glyphicon glyph='file' style={{ fontSize: '14px' }} />
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
						<Glyphicon glyph='globe' style={{ fontSize: '14px' }} />
					</Button>
				</div>
			);
			// create new datasets object with proper tags
			datasets[i] = merge(
				datasets[i],
				{
					title: titleURL,
					dataset: (<code>{dataset}</code>),
					doi: paperButton,
					url: urlButton,
					download: downloadButton,
				}
			);
		}

		return (
			<SortableTable
				data={datasets}
				columns={columns}
				dispatch={dispatch}
				sortKey={sortKey}
				/>
		);
	} else {
		return (<h2>'Downloading list of available datasets...'</h2>
		);
	}
};

DatasetList.propTypes = {
	dispatch: PropTypes.func.isRequired,
	datasets: PropTypes.array,
	sortKey: PropTypes.shape({
		key: PropTypes.string,
		ascending: PropTypes.bool,
	}),
};


class SearchDataSetViewComponent extends Component {
	constructor(props) {
		super(props);

		this.filterProjects = this.filterProjects.bind(this);
		this.state = { projects: undefined, filtered: undefined };
	}

	componentDidMount() {
		const {dispatch, projects, sortKey, search } = this.props;
		if (projects) {
			let mergedProjects = [];
			for (let keys = Object.keys(projects), i = 0; i < keys.length; i++) {
				mergedProjects = mergedProjects.concat(projects[keys[i]]);
			}
			this.filterProjects(mergedProjects, sortKey, search);
		} else {
			dispatch(fetchProjects());
		}
	}

	componentWillReceiveProps(nextProps) {
		let { projects } = this.state;

		if (!projects && nextProps.projects) {
			// merge all projects. Note that this creates a
			// new array so we don't have to worry about
			// mutating the original projects object, as long
			// as we don't mutate individual project objects.
			projects = [];
			for (let keys = Object.keys(nextProps.projects), i = 0; i < keys.length; i++) {
				projects = projects.concat(nextProps.projects[keys[i]]);
			}
		}

		if (projects) {
			const { sortKey, search } = nextProps;
			this.filterProjects(projects, sortKey, search);
		}
	}

	filterProjects(projects, sortKey, search) {
		let filtered = undefined;
		// (stable!) sort projects if we have a new key to sort by
		// Also, nasty object comparison hack, but it works here.
		if (sortKey &&
			JSON.stringify(sortKey) !== JSON.stringify(this.props.sortKey)) {

			// store original positions
			let indices = new Array(projects.length);
			for (let i = 0; i < indices.length; i++) {
				indices[i] = i;
			}

			const v = sortKey.ascending ? 1 : -1;
			const k = sortKey.key;
			let compare = (a, b) => {
				let pa = projects[a][k];
				let pb = projects[b][k];
				return pa < pb ? -v :
					pa > pb ? v :
						indices[a] < indices[b] ? -1 : 1;
			};
			if ((typeof projects[0][k]) === 'string') {
				compare = (a, b) => {
					let pa = projects[a][k].toLowerCase();
					let pb = projects[b][k].toLowerCase();
					return pa < pb ? -v :
						pa > pb ? v :
							indices[a] < indices[b] ? -1 : 1;
				};
			}
			indices.sort(compare);

			// re-arrange projects
			let t = new Array(projects.length);
			for (let i = 0; i < projects.length; i++) {
				t[i] = projects[indices[i]];
			}
			for (let i = 0; i < projects.length; i++) {
				projects[i] = t[i];
			}
		}

		if (!search) {
			filtered = projects.slice(0);
		} else {	// search/filter projects

			// give date special (exact) treatment
			const date = search.lastModified;
			if (date) {
				filtered = [];
				for (let i = 0; i < projects.length; i++) {
					if (projects[i].lastModified.indexOf(date) !== -1) {
						filtered.push(projects[i]);
					}
				}
			} else {
				filtered = projects.slice(0);
			}

			// fuzzy text search per field
			const keys = ['project', 'title', 'dataset', 'description'];
			for (let i = 0; filtered.length && i < keys.length; i++) {
				const key = keys[i];
				const query = search[key];
				if (query) {
					const fuse = new Fuse(filtered, {
						keys: [key],
						treshold: 0.4,
						shouldSort: true,
						tokenize: true,
						matchAllTokens: true,
					});
					filtered = fuse.search(query);
				}
			}
			// generic search on whatever remains
			if (search.all && filtered.length) {
				const options = {
					keys,
					treshold: 0.4,
					shouldSort: true,
					tokenize: true,
					matchAllTokens: true,
				};
				const fuse = new Fuse(filtered, options);
				filtered = fuse.search(search.all);
			}
		}

		this.setState({ projects, filtered });
	}



	render() {
		const {filtered} = this.state;
		const {dispatch, sortKey } = this.props;

		return (
			<Grid>
				<Row>
					<Col xs={12} md={12} lg={12}>
						<div className='view-vertical'>
							<h1><Link to='/dataset/' title={'List view'}>Datasets</Link> > Search</h1>
							<FormControl
								type='text'
								placeholder='All fields..'
								onChange={handleChangeFactory('all', dispatch)}
								style={{ width: '100%' }} />
							<br />
							<h1>Results</h1>
							{filtered ? (
								<DatasetList
									dispatch={dispatch}
									datasets={filtered}
									sortKey={sortKey} />
							) : null}
						</div>
					</Col>
				</Row>
			</Grid>
		);
	}
}

SearchDataSetViewComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	projects: PropTypes.object,
	search: PropTypes.object,
	sortKey: PropTypes.shape({
		key: PropTypes.string,
		ascending: PropTypes.bool,
	}),
};

//connect SearchDataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	return {
		projects: state.data.projects,
		search: state.data.search,
		sortKey: state.data.sortKey,
	};
};
export const SearchDataSetView = connect(mapStateToProps)(SearchDataSetViewComponent);