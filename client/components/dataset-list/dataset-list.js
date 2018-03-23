import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Link } from 'react-router';
import {
	Grid,
	Row, Col,
	Button,
	Glyphicon,
} from 'react-bootstrap';

import { SortableTable } from 'components/sortabletable';

import {
	DebouncedFormControl,
	CollapsibleSettings,
} from 'components/settings';

import { SEARCH_DATASETS, SORT_DATASETS } from 'actions/action-types';
import {
	requestProjects,
	OFFLINE,
	UNKNOWN,
} from 'actions/request-projects';

import Fuse from 'fuse.js';
import { sortInPlace } from 'js/util';

const centerTextStyle = {
	textAlign: 'center',
};

const buttonStyle = {
	padding: 0,
};
const glyphStyle = {
	fontSize: '14px',
};

const lightGlyphStyle = {
	fontSize: '14px',
	color: 'lightgrey',
};

const componentStyle = {
	justifyContent: 'center',
	overflowX: 'hidden',
	overflowY: 'scroll',
};

function handleSearchChangeFactory(field, dispatch) {
	return (event) => {
		let val = event.target.value ?
			event.target.value :
			'';
		dispatch({
			type: SEARCH_DATASETS,
			state: { search: { [field]: val } },
		});
	};
}


// Generates tabular list of datasets

class DatasetList extends Component {

	constructor(...args) {
		super(...args);

		const { dispatch } = this.props;

		const sortByProject = () => {
			dispatch({
				type: SORT_DATASETS,
				key: 'project',
			});
		};
		const sortByTitle = () => {
			dispatch({
				type: SORT_DATASETS,
				key: 'title',
			});
		};
		const sortByDescription = () => {
			dispatch({
				type: SORT_DATASETS,
				key: 'description',
			});
		};
		const sortByLastModified = () => {
			dispatch({
				type: SORT_DATASETS,
				key: 'lastModified',
			});
		};
		const sortByTotalCells = () => {
			dispatch({
				type: SORT_DATASETS,
				key: 'totalCells',
			});
		};

		const headerStyles = [{ border: 'none 0px' }, { padding: '4px' }];

		const columns = [
			{
				headers: ['Title'],
				key: 'title',
				sortIcon: 'sort-by-alphabet',
				headerStyles,
				dataStyle: {
					width: '34%',
					fontWeight: 'bold',
				},
				onHeaderClick: [sortByTitle],
			},
			{
				headers: ['Description'],
				key: 'description',
				sortIcon: 'sort-by-alphabet',
				headerStyles,
				dataStyle: {
					width: '36%',
					fontStyle: 'italic',
				},
				onHeaderClick: [sortByDescription],
			},
			{
				headers: ['Date'],
				key: 'lastModified',
				sortIcon: 'sort-by-order',
				headerStyles,
				dataStyle: {
					width: '14%',
					fontSize: '12px',
				},
				onHeaderClick: [sortByLastModified],
			},
			{
				headers: ['Size'],
				key: 'totalCells',
				sortIcon: 'sort-by-attributes',
				headerStyles,
				dataStyle: {
					width: '6%',
					fontSize: '12px',
				},
				onHeaderClick: [sortByTotalCells],
			},
			{
				headers: [(
					<div style={centerTextStyle}>
						<Glyphicon glyph='file' title={'Original Reference'} />
						<Glyphicon glyph='globe' title={'External Webpage'} />
						<Glyphicon glyph='cloud-download' title={'Download Loom File'} />
					</div>
				)],
				key: 'buttons',
				headerStyles: [{
					border: 'none 0px', padding: '8px 0px',
				}, { padding: '0px' }],
				dataStyle: {
					width: '10%', padding: '8px 0px',
				},
			},
		];
		this.state = {
			sortByProject,
			sortByTitle,
			sortByDescription,
			sortByLastModified,
			sortByTotalCells,
			headerStyles,
			columns,
		};
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

		const { columns } = this.state;

		if (filteredList) {
			let tableData = [];
			for (let i = 0; i < filteredList.length; i++) {
				const {
					path,
					title,
					description,
					lastModified,
					totalCells,
					dataset,
					url,
					doi,
				} = filteredList[i];
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
						style={buttonStyle}
					>
						<Glyphicon
							glyph='cloud-download'
							style={glyphStyle} />
					</Button>
				);
				const paperButton = (
					<Button
						key={path + '_doi'}
						bsSize='xsmall'
						bsStyle='link'
						href={'http://dx.doi.org/' + doi}
						title={doi === '' ?
							'No reference info in metadata' :
							'Original reference: http://dx.doi.org/' + doi
						}
						style={buttonStyle}
						disabled={doi === ''}>
						<Glyphicon
							glyph='file'
							style={doi === '' ?
								lightGlyphStyle :
								glyphStyle
							} />
					</Button>
				);
				const urlButton = (
					<Button
						key={path + '_url'}
						bsSize='xsmall'
						bsStyle='link'
						href={url}
						title={url === '' ?
							'No external webpage in metadata' :
							'External web page: ' + url}
						style={buttonStyle}
						disabled={url === ''}
					>
						<Glyphicon
							glyph='globe'
							style={url === '' ?
								lightGlyphStyle :
								glyphStyle
							} />
					</Button>
				);

				tableData.push({
					rowKey: path,
					path, project, description, lastModified, totalCells,
					title: titleURL,
					buttons: (
						<div style={centerTextStyle}>
							{[paperButton, urlButton, downloadButton]}
						</div>
					),
				});
			}

			const fullLength = fullDatasetList.length;
			let projectLabel = `${project} (${filteredList.length}/` +
				`${fullLength} dataset${fullLength === 1 ? '' : 's'})`;
			return (
				<CollapsibleSettings
					key={project}
					label={projectLabel}
					size={filteredList.length ?
						'large' :
						'xsmall'}
					mountClosed={mountClosed}
					unmountOnExit>
					<div>
						{filteredList.length ?
							(
								<SortableTable
									data={tableData}
									columns={columns}
									dispatch={dispatch}
									order={order}
									condensed
									responsive
								/>

							) :
							null
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
				<DebouncedFormControl
					type='text'
					value={props.value || ''}
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
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	mountClosed: PropTypes.bool,
};

class SearchDataSetViewComponent extends Component {
	constructor(...args) {
		super(...args);
		this.filterProjects = this.filterProjects.bind(this);
		this.prepareProjects = this.prepareProjects.bind(this);

		const {
			dispatch,
			list,
			order,
			search,
		} = this.props;

		const searchAll = handleSearchChangeFactory('all', dispatch);
		const searchBylastModified = handleSearchChangeFactory('lastModified', dispatch);
		const searchByProject = handleSearchChangeFactory('project', dispatch);
		const searchByTitle = handleSearchChangeFactory('title', dispatch);
		const searchByDescription = handleSearchChangeFactory('description', dispatch);

		this.state = {
			projectLists: null,
			projectNames: null,
			searchAll,
			searchBylastModified,
			searchByProject,
			searchByTitle,
			searchByDescription,
		};

		if (list) {

			let {
				projectNames,
				projectLists,
				projectListsFiltered,
			} = this.prepareProjects(list);

			projectListsFiltered = new Array(projectNames.length);
			for (let i = 0; i < projectNames.length; i++) {
				projectListsFiltered[i] = this.filterProjects(projectLists[i], order, search);
			}
			this.state.projectNames = projectNames;
			this.state.projectLists = projectLists;
			this.state.projectListsFiltered = projectListsFiltered;
		}
	}

	componentWillMount() {
		const {
			dispatch,
			list,
			fetchProjectsStatus,
		} = this.props;
		dispatch(requestProjects(list, fetchProjectsStatus));
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
			const {
				order, search,
			} = nextProps;
			if (JSON.stringify(order) !== JSON.stringify(this.props.order) ||
				JSON.stringify(search) !== JSON.stringify(this.props.search)) {
				projectListsFiltered = new Array(projectNames.length);
				for (let i = 0; i < projectNames.length; i++) {
					projectListsFiltered[i] = this.filterProjects(projectLists[i], order, search);
				}
			}
			this.setState(() => {
				return {
					projectNames,
					projectLists,
					projectListsFiltered,
				};
			});
		}
	}

	prepareProjects(list) {
		// Convert to array sorted by dataset creation date
		let arrayList = Object.values(list);
		let lastModifieds = arrayList.map((dataset) => {
			return dataset.lastModified;
		});
		const comparator = (i, j) => {
			let vi = lastModifieds[i];
			let vj = lastModifieds[j];
			return (
				vi < vj ?
					-1 :
					vi > vj ?
						1 :
						i - j
			);
		};

		sortInPlace(arrayList, comparator);


		let projectNames = [],
			projectLists = [],
			projectListsFiltered = [];
		for(let i = 0; i < arrayList.length; i++) {
			const dataset = arrayList[i];
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
		return {
			projectNames,
			projectLists,
			projectListsFiltered,
		};
	}

	filterProjects(list, order, search) {
		let filtered;

		const retVal = order.asc ?
			1 :
			-1;
		const compareKey = order.key;
		const comparator = (i, j) => {
			let vi = list[i][compareKey];
			let vj = list[j][compareKey];
			if (typeof vi === 'string') {
				vi = vi.toLowerCase();
				vj = vj.toLowerCase();
			}

			return (
				vi < vj ?
					-retVal :
					vi > vj ?
						retVal :
						i - j
			);
		};
		sortInPlace(list, comparator);
		if (!search) {
			// if there is no search, filtered is
			// just a sorted version of list.
			filtered = list.slice(0);
		} else {	// search/filter projects

			// give date special (exact stringmatch) treatment
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
						threshold: 0.05,
						shouldSort: true,
					});
					filtered = fuse.search(query);
				}
			}
			// generic search on whatever remains
			if (search.all && filtered.length) {
				const options = {
					keys,
					threshold: 0.05,
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
			searchBylastModified,
			searchByProject,
			searchByTitle,
			searchByDescription,
		} = this.state;

		let {
			dispatch,
			search,
			order,
			fetchProjectsStatus,
		} = this.props;

		search = search ?
			search :
			{};
		let datasetList = null;
		if (projectNames && projectNames.length) {
			let _datasetList = new Array(projectNames.length);
			for(let i = 0; i < projectNames.length; i++) {
				let project = projectNames[i];
				_datasetList[i] = (
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
			datasetList = (
				<React.Fragment>
					{fetchProjectsStatus === OFFLINE ?
						<h2>Currently offline, showing cached datasets</h2> : null}
					{_datasetList}
				</React.Fragment>
			);
		} else {
			datasetList = fetchProjectsStatus === UNKNOWN ?
				(
					<div className='view-vertical'>
						<div className='view centred'>
							<h2>Downloading list of available datasets...</h2>
						</div>
						<div className='view centred'>
							<h3>Note: fetching is currently broken on Safari, use Chrome or Firefox instead</h3>
						</div>
					</div>
				) :
				(
					<div className='view-vertical'>
						<div className='view centred'>
							<h2>Fetch failed, checking IndexedDB cache</h2>
						</div>
						<div className='view centred'>
							<h3>(If you see this while running the viewer locally, the loom-viewer probably failed to find any loom files in the loom dataset folder)
							</h3>
						</div>
					</div>
				);
		}

		return (
			<div
				className='view'
				style={componentStyle}>
				<Grid>
					<Row>
						<Col xs={12} md={12}
							lg={12}>
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
									<Col xs={3} md={3}
										lg={3}>
										<SearchField
											label={'Project'}
											tooltip={'Filter by project (fuzzy substring match)'}
											tooltipId={'projectsearch-tltp'}
											value={search.project}
											onChange={searchByProject}
											mountClosed
										/>
									</Col>
									<Col xs={3} md={3}
										lg={3}>
										<SearchField
											label={'Title'}
											tooltip={'Filter by title (fuzzy substring match)'}
											tooltipId={'titlesearch-tltp'}
											value={search.title}
											onChange={searchByTitle}
											mountClosed
										/>
									</Col>
									<Col xs={3} md={3}
										lg={3}>
										<SearchField
											label={'Description'}
											tooltip={'Filter by description (fuzzy substring match)'}
											tooltipId={'descriptionsearch-tltp'}
											value={search.description}
											onChange={searchByDescription}
											mountClosed
										/>
									</Col>
									<Col xs={3} md={3}
										lg={3}>
										<SearchField
											label={'Date'}
											tooltip={'Filter by last modification date (exact substring match)'}
											tooltipId={'datesearch-tltp'}
											value={search.lastModified}
											onChange={searchBylastModified}
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
			</div>
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
	fetchProjectsStatus: PropTypes.number,
};

// connect SearchDataSetViewComponent to store
import { connect } from 'react-redux';

const mapStateToProps = (state) => {
	if (state.datasets.list) {
		const {
			list,
			page,
			search,
			order,
			fetchProjectsStatus,
		} = state.datasets;
		return {
			list,
			page,
			search,
			order,
			fetchProjectsStatus,
		};
	}
	return {};
};
export const DataSetList = connect(mapStateToProps)(SearchDataSetViewComponent);