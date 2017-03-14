import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col, Button, Glyphicon } from 'react-bootstrap';
import { Link } from 'react-router';

import { SortableTable } from './sortabletable';
import { DebouncedFormcontrol } from './debounced-formcontrol';

import { SEARCH_DATASETS, SORT_DATASETS } from '../actions/actionTypes';
import { fetchProjects } from '../actions/actions';
import { stableSortInPlace } from '../js/util';


import Fuse from 'fuse.js';

function handleChangeFactory(field, dispatch) {
	return (event) => {
		let val = event.target.value ? event.target.value : '';
		dispatch({
			type: SEARCH_DATASETS,
			state: {
				search: {
					[field]: val,
				},
			},
		});
	};
}


// Generates tabular list of datasets
const DatasetList = function (props) {
	const {datasets, dispatch, search, order } = props;

	const dateSearch = (<DebouncedFormcontrol type='text' value={search.lastModified}
		onChange={handleChangeFactory('lastModified', dispatch)} time={500} />);

	const projectSearch = (<DebouncedFormcontrol type='text' value={search.project}
		onChange={handleChangeFactory('project', dispatch)} time={500} />);

	const titleSearch = (<DebouncedFormcontrol type='text' value={search.title}
		onChange={handleChangeFactory('title', dispatch)} time={500} />);

	const descriptionSearch = (<DebouncedFormcontrol type='text' value={search.description}
		onChange={handleChangeFactory('description', dispatch)} time={500} />);

	const headerStyles = [{ border: 'none 0px' }, { padding: '4px' }];

	const columns = [
		{
			headers: ['PROJECT', projectSearch],
			key: 'project',
			mergeRows: true,
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '16%', fontSize: '16px', fontWeight: 'bold', fontStyle: 'normal' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'project' }); }, null],
		},
		{
			headers: ['TITLE', titleSearch],
			key: 'title',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '30%', fontWeight: 'bold' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'title' }); }, null],
		},
		{
			headers: ['DESCRIPTION', descriptionSearch],
			key: 'description',
			sortIcon: 'sort-by-alphabet',
			headerStyles,
			dataStyle: { width: '32%', fontStyle: 'italic' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'description' }); }, null],
		},
		{
			headers: ['DATE', dateSearch],
			key: 'lastModified',
			sortIcon: 'sort-by-order',
			headerStyles,
			dataStyle: { width: '10%', fontSize: '12px' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'lastModified' }); }, null],
		},
		{
			headers: ['SIZE'],
			key: 'totalCells',
			sortIcon: 'sort-by-attributes',
			headerStyles,
			dataStyle: { width: '4%', fontSize: '12px' },
			onHeaderClick: [() => { dispatch({ type: SORT_DATASETS, key: 'totalCells' }); }, null],
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
			const { path, project, title, description, lastModified, totalCells, dataset, url, doi } = datasets[i];
			// create new datasets object with proper tags
			// strip '.loom' ending
			const titleURL = (
				<div key={path + '_title'}>
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
					key={path + '_download'}
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
				<Glyphicon
					key={path + '_doi'}
					glyph='file'
					style={{ fontSize: '14px', color: 'lightgrey' }} />
			) : (
					<Button
						key={path + '_doi'}
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
				<Glyphicon
					key={path + '_url'}
					glyph='globe'
					style={{ fontSize: '14px', color: 'lightgrey' }} />
			) : (
					<Button
						key={path + '_url'}
						bsSize='xsmall'
						bsStyle='link'
						href={url}
						title={'External web page: ' + url}
						style={{ padding: 0 }}
					>
						<Glyphicon glyph='globe' style={{ fontSize: '14px' }} />
					</Button>
				);
			// merge() does not play nicely with JSX
			datasets[i] = {
				rowKey: path,
				path, project, description, lastModified, totalCells,
				title: titleURL,
				buttons: (
					<div style={{ textAlign: 'center' }}>
						{[paperButton, urlButton, downloadButton]}
					</div>
				),
			};
		}

		return (
			<SortableTable
				data={datasets}
				columns={columns}
				dispatch={dispatch}
				order={order}
				bordered condensed
			/>
		);
	} else {
		return (<div className='view centered'><h2>Downloading list of available datasets...</h2></div>
		);
	}
};

DatasetList.propTypes = {
	dispatch: PropTypes.func.isRequired,
	datasets: PropTypes.array,
	search: PropTypes.object,
	order: PropTypes.shape({
		key: PropTypes.string,
		asc: PropTypes.bool,
	}),
};


class SearchDataSetViewComponent extends Component {
	constructor(props) {
		super(props);

		this.filterProjects = this.filterProjects.bind(this);
		this.state = { list: undefined, filtered: undefined };
	}

	componentWillMount() {
		let { dispatch, list, order, search } = this.props;
		if (!list) {
			dispatch(fetchProjects());
		} else {
			// convert to array
			list = Object.keys(list).map((key) => { return list[key]; });
			this.filterProjects(list, order, search);
		}
	}

	componentWillReceiveProps(nextProps) {
		let { list } = this.state;

		if (!list && nextProps.list) {
			// convert to array
			list = Object.keys(nextProps.list).map((key) => { return nextProps.list[key]; });
		}

		if (list) {
			const { order, search } = nextProps;
			if (JSON.stringify(order) !== JSON.stringify(this.props.order) ||
				JSON.stringify(search) !== JSON.stringify(this.props.search)) {
				this.filterProjects(list, order, search);
			}
			this.setState({ list });
		}
	}


	filterProjects(list, order, search) {
		let filtered = undefined;

		const retVal = order.asc ? 1 : -1;
		const compareKey = order.key;
		const comparator = (i, j) => {
			let vi = list[i][compareKey];
			let vj = list[j][compareKey];
			if (typeof vi === 'string') {
				vi = vi.toLowerCase();
				vj = vj.toLowerCase();
			}

			return (
				vi < vj ? -retVal :
					vi > vj ? retVal :
						i - j
			);
		};
		stableSortInPlace(list, comparator);
		if (!search) {
			// if there is no search, filtered is
			// just a sorted version of list.
			filtered = list.slice(0);
		} else {	// search/filter projects

			// give date special (exact) treatment
			// and sort list in the process
			const date = search.lastModified;
			if (date) {
				filtered = [];
				for (let i = 0; i < list.length; i++) {
					const entry = list[i];
					if (entry.lastModified.indexOf(date) !== -1) {
						filtered.push(entry);
					}
				}
			} else {
				filtered = list.slice(0);
			}

			// fuzzy text search per field
			const keys = ['project', 'title', 'dataset', 'description'];

			// it's very possible filtered is empty after a few searches,
			// so abort early if that happens
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

		this.setState({ filtered });
	}



	render() {
		const {filtered} = this.state;
		let { dispatch, search, order } = this.props;
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
							<DebouncedFormcontrol
								type='text'
								placeholder='All fields..'
								value={search.all}
								onChange={handleChangeFactory('all', dispatch)}
								style={{ width: '100%' }}
								time={500} />
							<br />
							<h1>Results</h1>
							<DatasetList
								dispatch={dispatch}
								datasets={filtered}
								search={search}
								order={order} />
						</div>
					</Col>
				</Row>
			</Grid>
		);
	}
}

SearchDataSetViewComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	list: PropTypes.object,
	search: PropTypes.object,
	order: PropTypes.shape({
		key: PropTypes.string,
		asc: PropTypes.bool,
	}),
};

//connect SearchDataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	return state.datasets.list ? {
		list: state.datasets.list,
		search: state.datasets.search,
		order: state.datasets.order,
	} : {};
};
export const DataSetList = connect(mapStateToProps)(SearchDataSetViewComponent);