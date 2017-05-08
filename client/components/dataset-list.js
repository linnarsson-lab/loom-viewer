import React, { Component, PropTypes } from 'react';
import { Grid, Row, Col, Button, Glyphicon } from 'react-bootstrap';
import { Link } from 'react-router';

import { SortableTable } from './sortabletable';
import { DebouncedFormcontrol } from './debounced-formcontrol';
import { CollapsibleSettings } from './collapsible.js';

import { SEARCH_DATASETS, SORT_DATASETS } from '../actions/actionTypes';
import { fetchProjects } from '../actions/actions';
import { stableSortInPlace } from '../js/util';


import Fuse from 'fuse.js';

function handleSearchChangeFactory(field, dispatch) {
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

class DatasetList extends Component {

	componentWillMount() {
		const { dispatch } = this.props;

		const sortByProject = () => {
			dispatch({ type: SORT_DATASETS, key: 'project' });
		};
		const sortByTitle = () => {
			dispatch({ type: SORT_DATASETS, key: 'title' });
		};
		const sortByDescription = () => {
			dispatch({ type: SORT_DATASETS, key: 'description' });
		};
		const sortByCreationDate = () => {
			dispatch({ type: SORT_DATASETS, key: 'creationDate' });
		};
		const sortByTotalCells = () => {
			dispatch({ type: SORT_DATASETS, key: 'totalCells' });
		};

		const headerStyles = [{ border: 'none 0px' }, { padding: '4px' }];

		const columns = [
			{
				headers: ['Title'],
				key: 'title',
				sortIcon: 'sort-by-alphabet',
				headerStyles,
				dataStyle: { width: '34%', fontWeight: 'bold' },
				onHeaderClick: [sortByTitle],
			},
			{
				headers: ['Description'],
				key: 'description',
				sortIcon: 'sort-by-alphabet',
				headerStyles,
				dataStyle: { width: '36%', fontStyle: 'italic' },
				onHeaderClick: [sortByDescription],
			},
			{
				headers: ['Date'],
				key: 'creationDate',
				sortIcon: 'sort-by-order',
				headerStyles,
				dataStyle: { width: '14%', fontSize: '12px' },
				onHeaderClick: [sortByCreationDate],
			},
			{
				headers: ['Size'],
				key: 'totalCells',
				sortIcon: 'sort-by-attributes',
				headerStyles,
				dataStyle: { width: '6%', fontSize: '12px' },
				onHeaderClick: [sortByTotalCells],
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
				dataStyle: { width: '10%', padding: '8px 0px' },
			},
		];

		this.setState({
			sortByProject,
			sortByTitle,
			sortByDescription,
			sortByCreationDate,
			sortByTotalCells,
			headerStyles,
			columns,
		});
	}

	render() {

		const {
			dispatch,
			project,
			fullDatasetList,
			filteredList,
			order,
			mountClosed,
		} = this.props;

		const {
			columns,
		} = this.state;

		if (filteredList) {
			let tableData = [];
			for (let i = 0; i < filteredList.length; i++) {
				const { path, project, title, description, creationDate, totalCells, dataset, url, doi } = filteredList[i];
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
						style={{ padding: 0 }} >
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

				tableData.push({
					rowKey: path,
					path, project, description, creationDate, totalCells,
					title: titleURL,
					buttons: (
						<div style={{ textAlign: 'center' }}>
							{[paperButton, urlButton, downloadButton]}
						</div>
					),
				});
			}

			let projectLabel = `${project} (${filteredList.length}/${fullDatasetList.length} ${fullDatasetList.length === 1 ? 'dataset' : 'datasets'})`;
			return (
				<CollapsibleSettings
					key={project}
					label={projectLabel}
					size={'large'}
					mountClosed={mountClosed}
					unmountOnExit>
					<div>
						{
							filteredList.length ? (
								<SortableTable
									data={tableData}
									columns={columns}
									dispatch={dispatch}
									order={order}
									condensed
									responsive
								/>

							) : null
						}
					</div>
				</CollapsibleSettings>
			);

		} else {
			return null;
		}
	}
}

DatasetList.propTypes = {
	dispatch: PropTypes.func.isRequired,
	project: PropTypes.string,
	fullDatasetList: PropTypes.array,
	filteredList: PropTypes.array,
	search: PropTypes.object,
	order: PropTypes.shape({
		key: PropTypes.string,
		asc: PropTypes.bool,
	}),
	mountClosed: PropTypes.bool,
};

function SearchField(props) {
	return (
		<CollapsibleSettings
			label={props.label}
			tooltip={props.tooltip}
			tooltipId={props.tooltipId}
			size={'large'}
			mountClosed={props.mountClosed}>
			<div>
				<DebouncedFormcontrol
					type='text'
					value={props.value}
					onChange={props.onChange}
					time={500} />
			</div>
		</CollapsibleSettings>
	);
}

SearchField.propTypes = {
	label: PropTypes.string.isRequired,
	tooltip: PropTypes.string.isRequired,
	tooltipId: PropTypes.string.isRequired,
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	mountClosed: PropTypes.bool,
};

class SearchDataSetViewComponent extends Component {
	constructor(props) {
		super(props);
		this.filterProjects = this.filterProjects.bind(this);
		this.prepareProjects = this.prepareProjects.bind(this);

	}

	componentWillMount() {
		let {
			dispatch,
			list,
		} = this.props;

		const searchAll = handleSearchChangeFactory('all', dispatch);
		const searchByCreationDate = handleSearchChangeFactory('creationDate', dispatch);
		const searchByProject = handleSearchChangeFactory('project', dispatch);
		const searchByTitle = handleSearchChangeFactory('title', dispatch);
		const searchByDescription = handleSearchChangeFactory('description', dispatch);

		let state = {
			projectLists: null,
			projectNames: null,
			searchAll,
			searchByCreationDate,
			searchByProject,
			searchByTitle,
			searchByDescription,
		};

		if (!list) {
			dispatch(fetchProjects());
		} else {
			const { projectNames, projectLists, projectListsFiltered } = this.prepareProjects(list);
			state.projectNames = projectNames;
			state.projectLists = projectLists;
			state.projectListsFiltered = projectListsFiltered;
		}
		this.setState(state);
	}

	componentWillReceiveProps(nextProps) {
		let {
			projectNames,
			projectLists,
			projectListsFiltered,
		} = this.state;

		if (!projectNames && nextProps.list) {
			let t = this.prepareProjects(nextProps.list);
			projectLists = t.projectLists;
			projectNames = t.projectNames;
		}

		if (projectNames) {
			const { order, search } = nextProps;
			if (JSON.stringify(order) !== JSON.stringify(this.props.order) ||
				JSON.stringify(search) !== JSON.stringify(this.props.search)) {
				let i = projectNames.length;
				projectListsFiltered = new Array(i);
				while (i--) {
					projectListsFiltered[i] = this.filterProjects(projectLists[i], order, search);
				}
			}
			this.setState({ projectNames, projectLists, projectListsFiltered });
		}
	}

	prepareProjects(list) {
		// Convert to array sorted by dataset creation date
		list = Object.keys(list).map((key) => { return list[key]; });
		stableSortInPlace(list, (i, j) => {
			let vi = list[i].creationDate;
			let vj = list[j].creationDate;
			return (
				vi < vj ? 1 :
					vi > vj ? -1 :
						i - j
			);
		});


		let projectNames = [], projectLists = [], projectListsFiltered = [];
		let i = list.length;
		while (i--) {
			const dataset = list[i];
			const { project } = dataset;
			let j = projectNames.indexOf(project);
			if (j === -1) {
				j = projectNames.length;
				projectNames.push(project);
				projectLists.push([]);
				projectListsFiltered.push([]);
			}
			projectLists[j].push(dataset);
		}
		return { projectNames, projectLists, projectListsFiltered };
	}

	filterProjects(list, order, search) {
		let filtered;

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

			// give date special (exact stringmatch) treatment
			const date = search.creationDate;
			if (date) {
				filtered = [];
				for (let i = 0; i < list.length; i++) {
					const entry = list[i];
					if (entry.creationDate.indexOf(date) !== -1) {
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
						treshold: 0.05,
						shouldSort: true,
					});
					filtered = fuse.search(query);
				}
			}
			// generic search on whatever remains
			if (search.all && filtered.length) {
				const options = {
					keys,
					treshold: 0.05,
					shouldSort: true,
				};
				const fuse = new Fuse(filtered, options);
				filtered = fuse.search(search.all);
			}
		}

		return filtered;
	}



	render() {
		const {
			projectNames,
			projectLists,
			projectListsFiltered,
			searchAll,
			searchByCreationDate,
			searchByProject,
			searchByTitle,
			searchByDescription,
		} = this.state;

		let {
			dispatch,
			search,
			order,
		} = this.props;

		search = search ? search : {};
		let datasetList = null;
		if (projectNames && projectNames.length) {
			let i = projectNames.length;
			datasetList = new Array(i);
			while (i--) {
				let project = projectNames[i];
				datasetList[i] = (
					<DatasetList
						key={project}
						dispatch={dispatch}
						project={projectNames[i]}
						fullDatasetList={projectLists[i]}
						filteredList={projectListsFiltered[i]}
						search={search}
						order={order}
						mountClosed={i > 1} />
				);
			}
		} else {
			datasetList = (
				<div className='view centered'>
					<h2>Downloading list of available datasets...</h2>
				</div>
			);
		}

		return (
			<Grid>
				<Row>
					<Col xs={12} md={12} lg={12}>
						<div className='view-vertical'>
							<h1>Data Sets</h1>
							<h1><i>Search</i></h1>
							<SearchField
								label={'Search all metadata'}
								tooltip={'Filter using fuzzy string matching on project, title or description'}
								tooltipId={'allsearch-tltp'}
								value={search.all}
								onChange={searchAll}
							/>
							<Row>
								<Col xs={3} md={3} lg={3}>
									<SearchField
										label={'Project'}
										tooltip={'Filter by project (fuzzy substring match)'}
										tooltipId={'projectsearch-tltp'}
										value={search.project}
										onChange={searchByProject}
										mountClosed
									/>
								</Col>
								<Col xs={3} md={3} lg={3}>
									<SearchField
										label={'Title'}
										tooltip={'Filter by title (fuzzy substring match)'}
										tooltipId={'titlesearch-tltp'}
										value={search.title}
										onChange={searchByTitle}
										mountClosed
									/>
								</Col>
								<Col xs={3} md={3} lg={3}>
									<SearchField
										label={'Description'}
										tooltip={'Filter by description (fuzzy substring match)'}
										tooltipId={'descriptionsearch-tltp'}
										value={search.description}
										onChange={searchByDescription}
										mountClosed
									/>
								</Col>
								<Col xs={3} md={3} lg={3}>
									<SearchField
										label={'Date'}
										tooltip={'Filter by date (exact substring match)'}
										tooltipId={'datesearch-tltp'}
										value={search.creationDate}
										onChange={searchByCreationDate}
										mountClosed
									/>
								</Col>
							</Row>
							<h1><i>Results</i></h1>
							{datasetList}
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
	page: PropTypes.number,
};

//connect SearchDataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	return state.datasets.list ? {
		list: state.datasets.list,
		page: state.datasets.page,
		search: state.datasets.search,
		order: state.datasets.order,
	} : {};
};
export const DataSetList = connect(mapStateToProps)(SearchDataSetViewComponent);