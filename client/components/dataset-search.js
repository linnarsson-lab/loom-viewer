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
		let val = event.target.value ? event.target.value : '';
		dispatch({
			type: SEARCH_DATASETS,
			state: {
				projects: {
					search: {
						[field]: val,
					},
				},
			},
		});
	};
}


// Generates tabular list of datasets
const DatasetList = function (props) {
	const {datasets, dispatch, search, sortKeys } = props;

	const dateSearch = (<FormControl type='text' value={search.lastModified}
		onChange={handleChangeFactory('lastModified', dispatch)} />);

	const projectSearch = (<FormControl type='text' value={search.project}
		onChange={handleChangeFactory('project', dispatch)} />);

	const titleSearch = (<FormControl type='text' value={search.title}
		onChange={handleChangeFactory('title', dispatch)} />);

	const descriptionSearch = (<FormControl type='text' value={search.description}
		onChange={handleChangeFactory('description', dispatch)} />);

	const headerStyles = [{ border: 'none 0px' }, { padding: '4px' }];

	const columns = [
		{
			headers: ['PROJECT', projectSearch],
			key: 'project',
			mergeRows: true,
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '16%', fontSize: '16px', fontWeight: 'bold', fontStyle: 'normal' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'project' });}, null],
		},
		{
			headers: ['TITLE', titleSearch],
			key: 'title',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '30%', fontWeight: 'bold' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'title' });}, null],
		},
		{
			headers: ['DESCRIPTION', descriptionSearch],
			key: 'description',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '32%', fontStyle: 'italic' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'description' });}, null],
		},
		{
			headers: ['DATE', dateSearch],
			key: 'lastModified',
			sortIcon: 'sort-by-order',
			headerStyles,
			dataStyle: { width: '10%', fontSize: '12px' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'lastModified' });}, null],
		},
		{
			headers: ['SIZE'],
			key: 'totalCells',
			sortIcon: 'sort-by-attributes',
			headerStyles,
			dataStyle: { width: '4%', fontSize: '12px' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'totalCells' });}, null],
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
			// create new datasets object with proper tags
			// strip '.loom' ending
			const titleURL = (
				<div>
					<Link
						to={'dataset/cellmetadata/' + path}
						title={'Open ' + path}>
						{title}
					</Link>
					<br />
					<code title={dataset}>{dataset}</code>
				</div>

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
			datasets[i] = merge(
				datasets[i],
				{
					title: titleURL,
					doi: paperButton,
					url: urlButton,
					download: downloadButton,
				}
			);
			// merge() does not play nicely with JSX
			datasets[i].buttons = (
				<div style={{ textAlign: 'center' }}>
					{[paperButton, urlButton, downloadButton]}
				</div>
			);
		}

		return (
			<SortableTable
				data={datasets}
				columns={columns}
				dispatch={dispatch}
				sortedKey={sortKeys[0]}
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
	search: PropTypes.object,
	sortKeys: PropTypes.arrayOf(
		PropTypes.shape({
			key: PropTypes.string,
			ascending: PropTypes.bool,
		})
	),
};


class SearchDataSetViewComponent extends Component {
	constructor(props) {
		super(props);

		this.filterProjects = this.filterProjects.bind(this);
		this.state = { projects: undefined, filtered: undefined };
	}

	componentWillMount() {
		const {dispatch, projects, sortKeys, search } = this.props;
		if (!projects){
			dispatch(fetchProjects());
		} else {
			// merge all projects. Note that this creates a
			// new array so we don't have to worry about
			// mutating the original projects object, as long
			// as we don't mutate individual project objects.
			let mergedProjects = [];
			for (let keys = Object.keys(projects), i = 0; i < keys.length; i++) {
				mergedProjects = mergedProjects.concat(projects[keys[i]]);
			}
			this.filterProjects(mergedProjects, sortKeys, search);
		}
	}

	componentWillUpdate(nextProps) {
		let { projects } = this.state;

		if (!projects && nextProps.projects) {
			projects = [];
			for (let keys = Object.keys(nextProps.projects), i = 0; i < keys.length; i++) {
				projects = projects.concat(nextProps.projects[keys[i]]);
			}
		}

		if (projects) {
			const { sortKeys, search } = nextProps;
			if (JSON.stringify(sortKeys) !== JSON.stringify(this.props.sortKeys) ||
			JSON.stringify(search) !== JSON.stringify(this.props.search) ) {
				this.filterProjects(projects, sortKeys, search);
			}
		}
	}

	filterProjects(projects, sortKeys, search) {
		let filtered = undefined;
		// Store original positions. If we ever need more than
		// 4 billion indics we have other issues to worry about
		let indices = new Uint32Array(projects.length);
		for (let i = 0; i < indices.length; i++) {
			indices[i] = i;
		}

		let retVal = new Int8Array(sortKeys.length);
		for (let i = 0; i < sortKeys.length; i++) {
			retVal[i] = sortKeys[i].ascending ? 1 : -1;
		}

		const comparator = (a, b) => {
			for (let i = 0; i < sortKeys.length; i++) {
				let pa = projects[a][sortKeys[i].key];
				let pb = projects[b][sortKeys[i].key];
				if (typeof pa === 'string'){
					pa = pa.toLowerCase();
					pb = pb.toLowerCase();
				}
				if (pa < pb) {
					return -retVal[i];
				} else if (pa > pb) {
					return retVal[i];
				}
			}
			return indices[a] < indices[b] ? -1 : 1;
		};

		indices.sort(comparator);

		// re-arrange projects
		let t = new Array(projects.length);
		for (let i = 0; i < projects.length; i++) {
			t[i] = projects[indices[i]];
		}
		projects = t;


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
		let {dispatch, search, sortKeys } = this.props;
		search = search ? search : {};

		return (
			<Grid>
				<Row>
					<Col
						xs={12}
						md={12}
						lg={12}>
						<div className='view-vertical'>
							<h1>Dataset Search</h1>
							<FormControl
								type='text'
								placeholder='All fields..'
								value={search.all}
								onChange={handleChangeFactory('all', dispatch)}
								style={{ width: '100%' }} />
							<br />
							<h1>Results</h1>
							{filtered ? (
								<DatasetList
									dispatch={dispatch}
									datasets={filtered}
									search={search}
									sortKeys={sortKeys} />
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
	sortKeys: PropTypes.arrayOf(
		PropTypes.shape({
			key: PropTypes.string,
			ascending: PropTypes.bool,
		})
	),
};

//connect SearchDataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	return state.data.projects ? {
		projects: state.data.projects.list,
		search: state.data.projects.search,
		sortKeys: state.data.projects.sortKeys,
	} : {};
};
export const SearchDataSetView = connect(mapStateToProps)(SearchDataSetViewComponent);