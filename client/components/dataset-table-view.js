import React, { Component, PropTypes } from 'react';
import {
	Button, Glyphicon,
	Form, FormGroup, FormControl,
	InputGroup, ControlLabel,
} from 'react-bootstrap';
import { Link } from 'react-router';

import { SEARCH_DATASETS, SORT_DATASETS } from '../actions/actionTypes';
import { fetchProjects } from '../actions/actions';
import { merge } from '../js/util';

import Fuse from 'fuse.js';

const columns = [
	{
		header: 'DATE ',
		key: 'lastModified',
		headerStyle: { fontSize: '10px' },
		dataStyle: { width: '8%', fontSize: '10px' },
		defaultSorting: 'DESC',
	},
	{
		header: 'TITLE ',
		key: 'title',
		headerStyle: { fontSize: '10px' },
		dataStyle: { width: '18%', fontWeight: 'bold' },
	},
	{
		header: 'DESCRIPTION ',
		key: 'description',
		headerStyle: { fontSize: '10px' },
		dataStyle: { width: '28%', fontStyle: 'italic' },
	},
	{
		header: 'PROJECT ',
		key: 'project',
		headerStyle: { fontSize: '10px' },
		dataStyle: { width: '18%' },
	},
	{
		header: 'DATASET ',
		key: 'dataset',
		headerStyle: { fontSize: '10px' },
		dataStyle: { width: '16%', fontSize: '10px' },
	},
	{
		header: 'CELL SAMPLE SIZE ',
		key: 'totalCells',
		headerStyle: { fontSize: '10px' },
		dataStyle: { width: '6%', fontSize: '10px' },
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
		headerStyle: { padding: 0 },
		dataStyle: { padding: 0, width: '2%' },
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
		headerStyle: { padding: 0 },
		dataStyle: { padding: 0, width: '2%' },
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
		headerStyle: { padding: 0 },
		dataStyle: { padding: 0, width: '2%' },
		sortable: false,
	},
];

const Table = function (props) {
	const { data, columns, dispatch, sortKey } = props;


	const headerCells = [];
	for (let i = 0; i < columns.length; i++) {
		const column = columns[i];
		const { key } = column;
		const handleClick = () => {
			dispatch({ type: SORT_DATASETS, key });
		};
		const sortIcon = sortKey && key === sortKey.key ? (
			<Glyphicon
				glyph={
					sortKey.ascending ?
						'sort-by-attributes' :
						'sort-by-attributes-alt'
				} />
		) : undefined;
		headerCells.push(
			<th
				key={key}
				style={column.headerStyle}
				onClick={handleClick} >
				{sortIcon}{column.header}
			</th>
		);
	}

	const sortedData = data.slice(0);
	let dataRows = [];
	for (let i = 0; i < sortedData.length; i++) {
		const row = sortedData[i];
		let rowCells = [];
		for (let j = 0; j < columns.length; j++) {
			const { dataStyle, key } = columns[j];
			rowCells.push(<td style={dataStyle} key={key} >{row[key]}</td>);
		}
		dataRows.push(<tr key={i} >{rowCells}</tr>);
	}
	return (
		<table style={{ width: '100%' }}>
			<thead>
				<tr>
					{headerCells}
				</tr>
			</thead>
			<tbody>
				{dataRows}
			</tbody>
		</table>
	);
};

Table.propTypes = {
	data: PropTypes.array,
	columns: PropTypes.array,
	dispatch: PropTypes.func.isRequired,
	sortKey: PropTypes.shape({
		key: PropTypes.string,
		ascending: PropTypes.bool,
	}),
};

// Generates tabular list of datasets
const DatasetList = function (props) {
	const { datasets, dispatch, sortKey } = props;

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
			<Table
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


class DataSetViewComponent extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		const { dispatch, projects } = this.props;
		dispatch(fetchProjects(projects));
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

		let filtered = undefined;
		if (projects) {

			const { sortKey, search } = nextProps;

			// (stable!) sort projects if we have a new key to sort by
			// nasty object comparison hack, but it works.
			if (sortKey &&
				JSON.stringify(sortKey) !== JSON.stringify(this.props.sortKey)) {

				// store original positions
				let indices = new Array(projects.length);
				for (let i = 0; i < indices.length; i++) {
					indices[i] = i;
				}

				const v = sortKey.ascending ? 1 : -1;
				const k = sortKey.key;
				indices.sort((a, b) => {
					let pa = projects[a][k];
					let pb = projects[b][k];
					return pa < pb ? -v :
						pa > pb ? v :
							indices[a] < indices[b] ? -1 : 1;
				});

				// re-arrange projects
				let t = new Array(projects.length);
				for (let i = 0; i < projects.length; i++) {
					t[i] = projects[indices[i]];
				}
				for (let i = 0; i < projects.length; i++) {
					projects[i] = t[i];
				}
			}

			// filter projects
			if (!search) {
				filtered = projects.slice(0);
			} else {
				// give date a special (exact) treatment
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
				const fields = ['project', 'title', 'dataset', 'description'];
				for (let i = 0; filtered.length && i < fields.length; i++) {
					const key = fields[i];
					const query = search[key];
					if (query) {
						const fuse = new Fuse(filtered, { keys: [key], treshold: 0.1 });
						filtered = fuse.search(query);
					}
				}
				// generic search on whatever remains
				if (search.all && filtered.length) {
					const options = {
						keys: ['project', 'title', 'dataset', 'description'],
						treshold: 0.1,
					};
					const fuse = new Fuse(filtered, options);
					filtered = fuse.search(search.all);
				}
			}
		}

		this.setState({ projects, filtered });
	}


	handleChangeFactory(field) {
		return (event) => {
			let searchVal = event.target.value ? event.target.value : '';
			this.props.dispatch({
				type: SEARCH_DATASETS,
				field,
				search: searchVal,
			});
		};
	}

	render() {
		const { filtered } = this.state;
		const { dispatch, sortKey } = this.props;

		const searchAll = (
			<Form inline>
				<FormGroup style={{ width: '100%' }}>
					<ControlLabel
						style={{
							width: '8%', paddingRight: '12px',
							verticalAlign: 'middle', textAlign: 'right',
						}}>
						SEARCH
					</ControlLabel>
					<FormControl
						type='text'
						placeholder='All fields..'
						style={{ width: '80%', fontSize: '12px', paddingLeft: '8px' }}
						onChange={this.handleChangeFactory('all')} />
				</FormGroup>
			</Form>
		);

		const searchFields = (
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
		);

		return (
			<div className='view-vertical' style={{ margin: '3em' }}>
				<h1>Datasets</h1>
				{searchAll}
				{searchFields}
				{filtered ? (
					<DatasetList
						dispatch={dispatch}
						datasets={filtered}
						sortKey={sortKey} />
				) : null}
			</div>
		);
	}
}

DataSetViewComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	projects: PropTypes.object,
	search: PropTypes.object,
	sortKey: PropTypes.shape({
		key: PropTypes.string,
		ascending: PropTypes.bool,
	}),
};

//connect DataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	return {
		projects: state.data.projects,
		search: state.data.search,
		sortKey: state.data.sortKey,
	};
};
export const DataSetView = connect(mapStateToProps)(DataSetViewComponent);