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
			state: {
				projects: {
					search: {
						[field]: searchVal,
					},
				},
			},
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
			headers: ['PROJECT', projectSearch],
			key: 'project',
			mergeRows: true,
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '16%', fontSize: '16px', fontWeight: 'bold', fontStyle: 'normal' },
			onHeaderClick: () => { dispatch({ type: SORT_DATASETS, key: 'project' });},
		},
		{
			headers: ['TITLE', titleSearch],
			key: 'title',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '30%', fontWeight: 'bold' },
			onHeaderClick: () => { dispatch({ type: SORT_DATASETS, key: 'title' });},
		},
		{
			headers: ['DESCRIPTION', descriptionSearch],
			key: 'description',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '32%', fontStyle: 'italic' },
			onHeaderClick: () => { dispatch({ type: SORT_DATASETS, key: 'description' });},
		},
		{
			headers: ['DATE', dateSearch],
			key: 'lastModified',
			sortIcon: 'sort-by-order',
			headerStyles,
			dataStyle: { width: '4%', fontSize: '10px' },
			onHeaderClick: () => { dispatch({ type: SORT_DATASETS, key: 'lastModified' });},
		},
		{
			headers: ['FILE', datasetSearch],
			key: 'dataset',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '8%', fontSize: '10px' },
			onHeaderClick: () => { dispatch({ type: SORT_DATASETS, key: 'dataset' });},
		},
		{
			headers: ['SIZE'],
			key: 'totalCells',
			sortIcon: 'sort-by-attributes',
			headerStyles,
			dataStyle: { width: '2%', fontSize: '10px' },
			onHeaderClick: () => { dispatch({ type: SORT_DATASETS, key: 'totalCells' });},
		},
		{
			headers: [(
				<div style={{ textAlign: 'center' }}>
					<Glyphicon glyph='file' title={'Original Reference'} />
					<Glyphicon glyph='globe' title={'External Webpage'} />
					<Glyphicon glyph='cloud-download' title={'Download Loom File'} />
				</div>
			)],
			key: 'buttons',
			headerStyles: [{ border: 'none 0px', padding: '8px 0px' }, { padding: '0px' }],
			dataStyle: { width: '8%', padding: '8px 0px' },
		},
	];

	if (datasets) {
		for (let i = 0; i < datasets.length; i++) {
			let proj = datasets[i];
			const {project, title, dataset, url, doi } = proj;
			let path = project + '/' + dataset;
			const titleURL = (
				<Link
					to={'dataset/cellmetadata/' + path}
					title={'Open ' + path}>
					{title}
				</Link>

			);
			const downloadURL = '/clone/' + path;
			const downloadButton = (
				<Button
					bsSize='xsmall'
					bsStyle='link'
					href={downloadURL}
					title={'Download ' + path}
					style={{ padding: 0 }}
					>
					<Glyphicon glyph='cloud-download' style={{ fontSize: '14px' }} />
				</Button>
			);
			const paperButton = doi === '' ? (
				<Glyphicon glyph='file' style={{ fontSize: '14px', color: 'lightgrey' }} />
			) : (
					<Button
						bsSize='xsmall'
						bsStyle='link'
						href={'http://dx.doi.org/' + doi}
						title={'Original reference: http://dx.doi.org/' + doi}
						style={{ padding: 0 }}
						>
						<Glyphicon glyph='file' style={{ fontSize: '14px' }} />
					</Button>
				);
			const urlButton = url === '' ? (
				<Glyphicon glyph='globe' style={{ fontSize: '14px', color: 'lightgrey' }} />
			) : (
					<Button
						bsSize='xsmall'
						bsStyle='link'
						href={url}
						title={'External web page: ' + url}
						style={{ padding: 0 }}
						>
						<Glyphicon glyph='globe' style={{ fontSize: '14px' }} />
					</Button>
				);
			// create new datasets object with proper tags
			// strip '.loom' ending
			let fileName = dataset.substr(0, dataset.length - 5);
			if (fileName.length > 8) {
				fileName = fileName.substr(0, 7) + '…';
			}
			datasets[i] = merge(
				datasets[i],
				{
					title: titleURL,
					dataset: (<code title={dataset}>{fileName}</code>),
					doi: paperButton,
					url: urlButton,
					download: downloadButton,
					buttons: (
						<div style={{ textAlign: 'center' }}>
							{[paperButton, urlButton, downloadButton]}
						</div>
					),
				}
			);
		}

		return (
			<SortableTable
				data={datasets}
				columns={columns}
				dispatch={dispatch}
				sortedKey={sortKey}
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
					<Col
						xs={12}
						md={12}
						lg={12}>
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
		projects: state.data.projects.list,
		search: state.data.projects.search,
		sortKey: state.data.projects.sortKey,
	};
};
export const SearchDataSetView = connect(mapStateToProps)(SearchDataSetViewComponent);