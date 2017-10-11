import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from 'js/proptypes-typedarray';

import { Remount } from 'components/remount';

import {
	Glyphicon,
	Button,
} from 'react-bootstrap';

import { SortableTable } from 'components/sortabletable';

import {
	DebouncedFormControl,
	OverlayTooltip,
} from 'components/settings';

import {
	MetadataPlot,
} from 'components/metadata/metadata-plot';

import { asyncPainterQueue } from 'plotters/async-painter';

import { UPDATE_VIEWSTATE } from 'actions/action-types';

import { createComparator } from 'js/state-comparator';

import Fuse from 'fuse.js';

const samePropMetadataTable = createComparator({
	attrKeys: 'array',
	searchVal: 'string',
	indices: 'array',
	filteredAttrs: 'array',
	onClickAttrFactory: 'func',
	onClickFilterFactory: 'func',
});

class MetadataTable extends Component {
	constructor(...args) {
		super(...args);
		this.createTableData = this.createTableData.bind(this);

		// given that this component will only be rendered
		// after the dataset has been fetched, and that the
		// dataset is immutable, we might as well pre-process
		// everything and store it in the state
		const {
			columns,
			tableData,
		} = this.createTableData(this.props);

		this.state = {
			columns,
			tableData,
		};
	}

	componentWillReceiveProps(nextProps) {
		if (!samePropMetadataTable(nextProps, this.props)) {
			const {
				columns,
				tableData,
			} = this.createTableData(nextProps);
			this.setState(() => {
				return {
					columns,
					tableData,
				};
			});
		}
	}

	createTableData(props) {
		const {
			attributes,
			attrKeys,
			searchVal,
			indices,
			filteredAttrs,
			onClickAttrFactory,
			onClickFilterFactory,
		} = props;

		const columns = [
			{
				key: 'name',
				dataStyle: {
					width: '15%',
					fontWeight: 'bold',
				},
			},
			{
				key: 'val',
				dataStyle: {
					width: '85%',
					fontStyle: 'italic',
				},
			},
		];

		let filteredKeys = attrKeys;
		if (searchVal) {
			filteredKeys = attrKeys.map((val) => {
				return { val };
			});
			const fuse = new Fuse(filteredKeys, {
				keys: ['val'],
				threshold: 0.2,
				shouldSort: true,
			});
			filteredKeys = fuse.search(searchVal).map((obj) => { return obj.val; });
		}
		let tableData = [];
		for (let i = 0; i < filteredKeys.length; i++) {
			const key = filteredKeys[i];
			const onClick = onClickAttrFactory(key);
			let tableRow = {
				rowKey: key,
				name: (
					<OverlayTooltip
						tooltip={`Sort attributes by "${key}"`}
						tooltipId={`${key.replace(/\s+/g, '-').toLowerCase()}-sort-tltp`}>
						<Button
							onClick={onClick}
							bsStyle='link'
							style={{
								width: '100%',
								height: '100%',
								whiteSpace: 'normal',
								textAlign: 'left',
							}}>
							{key}
						</Button>
					</OverlayTooltip>),
			};
			const attr = attributes[key];
			const {
				data,
				indexedVal,
				arrayType,
				allUnique,
				uniques,
				uniqueVal,
			} = attr;

			if (uniqueVal !== undefined) { // only one value
				tableRow.val = (
					<span>{indexedVal && indexedVal[uniqueVal] !== undefined ?
						indexedVal[uniqueVal] :
						uniqueVal}
					</span>
				);
			} else if (allUnique && arrayType === 'string') {
				// every value is unique and we're dealing with strings
				let list = data[indices[0]];
				const l = Math.min(data.length, 5);
				if (indexedVal) {
					list = indexedVal[list];
					for (let j = 1; j < l; j++) {
						list += `, ${indexedVal[data[indices[j]]]}`;
					}
				} else {
					for (let j = 1; j < l; j++) {
						list += `, ${data[indices[j]]}`;
					}
				}
				if (l < data.length) {
					list += ', ...';
				}
				tableRow.val = (
					<span>{list}</span>
				);
			} else {
				const filterFunc = (val) => { return onClickFilterFactory(key, val); };
				switch (arrayType) {
					case 'string':
						tableRow.val = (
							<MetadataPlot
								attr={attr}
								modes={['Stacked', 'Categorical']}
								indices={indices}
								filterFunc={filterFunc}
								filteredAttrs={filteredAttrs} />
						);
						break;
					default:
						tableRow.val = (
							<MetadataPlot
								attr={attr}
								mode={
									/* guess default category based
									on nr of unique values */
									!allUnique && uniques.length <= 20 ?
										'Stacked' :
										'Box'
								}
								indices={indices}
								filterFunc={filterFunc}
								filteredAttrs={filteredAttrs} />
						);
				}
			}
			tableData.push(tableRow);
		}
		return {
			columns,
			tableData,
		};
	}

	render() {
		const { dispatch } = this.props;
		const {
			columns,
			tableData,
		} = this.state;
		return (
			<SortableTable
				data={tableData}
				columns={columns}
				dispatch={dispatch}
				striped
				condensed
				hover
			/>
		);
	}
}

MetadataTable.propTypes = {
	attributes: PropTypes.object.isRequired,
	attrKeys: PropTypes.array.isRequired,
	searchVal: PropTypes.string.isRequired,
	filteredAttrs: PropTypes.array.isRequired,
	indices: TypedArrayProp.any,
	dispatch: PropTypes.func.isRequired,
	onClickAttrFactory: PropTypes.func.isRequired,
	onClickFilterFactory: PropTypes.func.isRequired,
};

class MetadataTableMounter extends Component {
	// given that this component will only be rendered
	// after the dataset has been fetched, and that the
	// dataset is immutable, we might as well pre-process
	// everything and store it in the state
	constructor(...args) {
		super(...args);

		this.tableContainer = this.tableContainer.bind(this);

		const {
			dispatch,
			dataset,
			stateName,
			axis,
		} = this.props;
		const path = dataset.path;

		const { searchVal } = dataset.viewState[stateName];

		const searchMetadata = (event) => {
			const action = {
				type: UPDATE_VIEWSTATE,
				path,
				stateName,
				viewState: {
					[stateName]: {
						searchVal: event.target.value || '',
					},
				},
			};
			dispatch(action);
		};

		const { order } = dataset.viewState[axis];

		const searchField = updateSearchField(searchVal, searchMetadata);
		const sortOrderList = updateSortOrderList(order);
		this.state = {
			searchVal,
			searchMetadata,
			searchField,
			order,
			sortOrderList,
			header: updateHeader(searchField, sortOrderList),
		};
	}

	componentWillReceiveProps(nextProps) {
		const {
			dataset,
			stateName,
			axis,
		} = nextProps;

		const {
			searchVal,
			searchMetadata,
			order,
			searchField,
			sortOrderList,
		} = this.state;

		const newSearchVal = dataset.viewState[stateName].searchVal;
		const newOrder = dataset.viewState[axis].order;

		let newState = {
				searchField,
				sortOrderList,
			},
			stateChanged = false;

		if (newSearchVal !== searchVal) {
			newState.searchField = updateSearchField(newSearchVal, searchMetadata);
			newState.searchVal = newSearchVal;
			stateChanged = true;
		}

		if (newOrder !== order) {
			newState.sortOrderList = updateSortOrderList(order);
			newState.order = newOrder;
			stateChanged = true;
		}

		if (stateChanged) {
			newState.header = updateHeader(newState.searchField, newState.sortOrderList);
			this.setState(newState);
		}
	}

	tableContainer(div){
		if (div) {
			const containerWidth = div.clientWidth - 20;
			const containerHeight = div.clientHeight - 20;
			const headerHeight = 100;
			const headerStyle = {
				display: 'flex',
				flex: '0 0 auto',
				minWidth: `${containerWidth}px`,
				maxWidth: `${containerWidth}px`,
				minHeight: `${headerHeight}px`,
				maxHeight: `${headerHeight}px`,
				overflowX: 'hidden',
				overflowY: 'scroll',
			};
			const tableStyle = {
				display: 'flex',
				flex: '0 0 auto',
				minWidth: `${containerWidth}px`,
				maxWidth: `${containerWidth}px`,
				minHeight: `${containerHeight - headerHeight}px`,
				maxHeight: `${containerHeight - headerHeight}px`,
				overflowX: 'hidden',
				overflowY: 'hidden',
			};
			this.setState(() => {
				return {
					mountedContainer: div,
					containerWidth,
					containerHeight,
					headerHeight,
					headerStyle,
					tableStyle,
				};
			});
		}
	}

	render() {
		const { props } = this;

		const {
			header,
			headerStyle,
			mountedContainer,
			tableStyle,
		} = this.state;

		if (mountedContainer){
			return (
				<div
					ref={this.tableContainer}
					className='view-vertical'
					style={{
						overflowX: 'hidden',
						overflowY: 'hidden',
						minHeight: 0,
						margin: '1em 3em 1em 3em',
					}}>
					<div style={{ headerStyle }}>
						{header}
					</div>
					<div style={{
						overflowY: 'scroll',
					}}>
						<div style={{ tableStyle }}>
							<MetadataTable
								attributes={props.attributes}
								attrKeys={props.attrKeys}
								searchVal={props.searchVal}
								indices={props.indices}
								filteredAttrs={props.filteredAttrs}
								dispatch={props.dispatch}
								onClickAttrFactory={props.onClickAttrFactory}
								onClickFilterFactory={props.onClickFilterFactory} />
						</div>
					</div>
				</div>
			);
		} else {
			return (
				<div
					ref={this.tableContainer}
					className='view-vertical centred'>
					Initialising Metadata Table
				</div>
			);
		}
	}
}

MetadataTableMounter.propTypes = {
	attributes: PropTypes.object.isRequired,
	attrKeys: PropTypes.array.isRequired,
	searchVal: PropTypes.string.isRequired,
	filteredAttrs: PropTypes.array.isRequired,
	indices: TypedArrayProp.any,
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	stateName: PropTypes.string.isRequired,
	onClickAttrFactory: PropTypes.func.isRequired,
	onClickFilterFactory: PropTypes.func.isRequired,
};

export class MetadataComponent extends Component {
	// given that this component will only be rendered
	// after the dataset has been fetched, and that the
	// dataset is immutable, we might as well pre-process
	// everything and store it in the state
	constructor(...args) {
		super(...args);
		const {
			dispatch,
			dataset,
			stateName,
			axis,
		} = this.props;

		const path = dataset.path;

		const onClickAttrFactory = (sortAttrName) => {
			return () => {
				dispatch({
					type: UPDATE_VIEWSTATE,
					path,
					axis,
					sortAttrName,
					stateName,
				});
			};
		};

		const onClickFilterFactory = (filterAttrName, filterVal) => {
			return () => {
				dispatch({
					type: UPDATE_VIEWSTATE,
					path,
					axis,
					filterAttrName,
					filterVal,
				});
			};
		};

		this.state = {
			onClickAttrFactory,
			onClickFilterFactory,
		};
	}

	render() {

		const {
			dataset,
			dispatch,
			attributes,
			attrKeys,
			axis,
			stateName,
		} = this.props;

		const { indices } = dataset.viewState[axis];
		const filteredAttrs = dataset.viewState[axis].filter;
		const { searchVal } = dataset.viewState[stateName];

		const {
			onClickAttrFactory,
			onClickFilterFactory,
		} = this.state;

		return (
			<Remount
				onUnmount={asyncPainterQueue.clear}>
				<MetadataTableMounter
					attributes={attributes}
					attrKeys={attrKeys}
					searchVal={searchVal}
					indices={indices}
					filteredAttrs={filteredAttrs}
					dispatch={dispatch}
					dataset={dataset}
					axis={axis}
					stateName={stateName}
					onClickAttrFactory={onClickAttrFactory}
					onClickFilterFactory={onClickFilterFactory} />
			</Remount>
		);
	}
}

MetadataComponent.propTypes = {
	attributes: PropTypes.object.isRequired,
	attrKeys: PropTypes.array.isRequired,
	axis: PropTypes.string.isRequired,
	stateName: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

function updateSearchField(searchVal, searchMetadata) {
	return (
		<DebouncedFormControl
			type='text'
			onChange={searchMetadata}
			value={searchVal}
			time={200}
		/>
	);
}

function updateSortOrderList(order) {
	let sortOrderList = [<span key={'sortLabel'} style={{ fontWeight: 'bold' }}>{'Order by:'}</span>];
	for (let i = 0; i < Math.min(order.length, 4); i++) {
		const val = order[i];
		sortOrderList.push(
			<span key={i + 1}>
				&nbsp;&nbsp;&nbsp;
				{val.key}
				<Glyphicon
					glyph={val.asc ?
						'sort-by-attributes' : 'sort-by-attributes-alt'} />
			</span>
		);
	}
	return sortOrderList;
}

function updateHeader(searchField, sortOrderList) {
	const columns = [
		{
			headers: ['ATTRIBUTE', searchField],
			headerStyles: [{}, {
				width: '15%',
			}],
		},
		{
			headers: ['DATA', sortOrderList],
			headerStyles: [{}, {
				fontWeight: 'normal',
				fontStyle: 'italic',
				verticalAlign: 'middle',
				width: '85%',
			}],
		},
	];
	return (
		<SortableTable
			columns={columns}
			condensed
			hover
		/>
	);
}