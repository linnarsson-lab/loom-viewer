import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from 'js/proptypes-typedarray';

import {
	Glyphicon,
	Button,
} from 'react-bootstrap';

import { SortableTable } from 'components/sortabletable';
import { Canvas } from 'components/canvas';

import { sparkline } from 'plotters/sparkline';

import {
	DebouncedFormControl,
	AttrLegend,
	OverlayTooltip,
} from '../settings/settings';

import { SET_VIEW_PROPS } from 'actions/actionTypes';

import { createComparator } from 'js/state-comparator';

import Fuse from 'fuse.js';

const defaultModes = [
	'Bars',
	'Box',
	'Heatmap',
	'Heatmap2',
	'Flame',
	'Icicle',
	'Categorical',
	'Stacked',
];

export class MetadataPlot extends PureComponent {
	constructor(...args) {
		super(...args);

		this.modeCycler = this.modeCycler.bind(this);

		const modes = this.props.modes || defaultModes;
		let idx = modes.indexOf(this.props.mode);
		const mode = idx === -1 ? 0 : idx;

		this.state = {
			modes,
			mode,
		};
	}

	modeCycler(){
		const mode = (this.state.mode + 1) % this.state.modes.length;
		this.setState(() => {
			return { mode };
		});
	}

	componentWillReceiveProps(nextProps){
		const { state } = this;
		if (state.modes !== nextProps.modes){
			// switch to new modes
			const modes = nextProps.modes || defaultModes;
			// adjust current mode to new mode cycle
			const currentMode = state.modes[state.mode];
			let idx = modes.indexOf(currentMode);
			const mode = idx === -1 ? 0 : idx;
			this.setState(() => {
				return {
					modes,
					mode,
				};
			});
		}
	}

	render() {

		const {
			modes,
			mode,
		} = this.state;

		const {
			attr,
			indices,
			filterFunc,
			filteredAttrs,
		} = this.props;

		return (
			<div className='view-vertical'>
				<OverlayTooltip
					tooltip={`Click to cycle trough plot modes for "${attr.name}". Currently ${modes[mode]}`}
					tooltipId={`${attr.name.replace(/\s+/g, '-').toLowerCase()}-plt-tltp`}>
					<Button
						onClick={this.modeCycler}
						bsStyle='link'
						style={{ cursor: (modes.length > 1 ? 'pointer' : 'initial') }} >
						<Canvas
							height={80}
							paint={sparkline(attr, indices, modes[mode])}
							ignoreHeight />
					</Button>
				</OverlayTooltip>
				<AttrLegend
					mode={modes[mode]}
					filterFunc={filterFunc}
					attr={attr}
					filteredAttrs={filteredAttrs}
				/>
			</div>
		);
	}
}

MetadataPlot.propTypes = {
	attr: PropTypes.object.isRequired,
	indices: TypedArrayProp.any,
	mode: PropTypes.string,
	modes: PropTypes.arrayOf(PropTypes.string),
	filteredAttrs: PropTypes.array.isRequired,
	filterFunc: PropTypes.func.isRequired,
};

const samePropMetadataTable = createComparator({
	attrKeys: 'array',
	searchField: 'node',
	searchVal: 'string',
	sortOrderList: 'array',
	indices: 'array',
	filteredAttrs: 'array',
	onClickAttrFactory: 'func',
	onClickFilterFactory: 'func',
});

class MetadataTable extends PureComponent {
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
		if (!samePropMetadataTable(nextProps, this.props)){
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
			searchField,
			searchVal,
			sortOrderList,
			indices,
			filteredAttrs,
			onClickAttrFactory,
			onClickFilterFactory,
		} = props;

		const sortOrderStyle = {
			fontWeight: 'normal',
			fontStyle: 'italic',
			verticalAlign: 'middle',
		};
		const columns = [
			{
				headers: ['ATTRIBUTE', searchField],
				key: 'name',
				dataStyle: {
					width: '10%',
					fontWeight: 'bold',
				},
			},
			{
				headers: ['DATA', sortOrderList],
				headerStyles: [{}, sortOrderStyle],
				key: 'val',
				dataStyle: {
					width: '90%',
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
				treshold: 0.2,
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
				uniques,
				uniqueVal,
			} = attr;

			if (uniqueVal !== undefined) { // only one value
				tableRow.val = (
					<span>{uniqueVal}</span>
				);
			} else if (attr.allUnique) { // every value is unique
				let list = data[indices[0]];
				const l = Math.min(data.length, 5);
				if (indexedVal) {
					list = indexedVal[list];
					for (let i = 1; i < l; i++) {
						list += `, ${indexedVal[data[indices[i]]]}`;
					}
				} else {
					for (let i = 1; i < l; i++) {
						list += `, ${data[indices[i]]}`;
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
									uniques.length <= 20 ? 'Stacked' : 'Bars'
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
	searchField: PropTypes.node.isRequired,
	searchVal: PropTypes.string.isRequired,
	sortOrderList: PropTypes.array.isRequired,
	filteredAttrs: PropTypes.array.isRequired,
	indices: TypedArrayProp.any,
	dispatch: PropTypes.func.isRequired,
	onClickAttrFactory: PropTypes.func.isRequired,
	onClickFilterFactory: PropTypes.func.isRequired,
};


export class MetadataComponent extends PureComponent {
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
					type: SET_VIEW_PROPS,
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
					type: SET_VIEW_PROPS,
					path,
					axis,
					filterAttrName,
					filterVal,
				});
			};
		};

		const { searchVal } = dataset.viewState[stateName];

		const searchMetadata = (event) => {
			const action = {
				type: SET_VIEW_PROPS,
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

		this.state = {
			onClickAttrFactory,
			onClickFilterFactory,
			searchVal,
			searchMetadata,
			searchField: this.updateSearchField(searchVal, searchMetadata),
			order,
			sortOrderList: this.updateSortOrderList(order),
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
		} = this.state;

		const newSearchVal = dataset.viewState[stateName].searchVal;
		const newOrder = dataset.viewState[axis].order;

		let newState = {},
			stateChanged = false;

		if (newSearchVal !== searchVal) {
			newState.searchField = this.updateSearchField(newSearchVal, searchMetadata);
			newState.searchVal = newSearchVal;
			stateChanged = true;
		}

		if (newOrder !== order) {
			newState.sortOrderList = this.updateSortOrderList(order);
			newState.order = newOrder;
			stateChanged = true;
		}

		if (stateChanged) {
			this.setState(newState);
		}
	}

	updateSearchField(searchVal, searchMetadata) {
		return (
			<DebouncedFormControl
				type='text'
				onChange={searchMetadata}
				value={searchVal}
				time={500}
			/>
		);
	}

	updateSortOrderList(order) {
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

	render() {

		const {
			dataset,
			dispatch,
			attributes,
			attrKeys,
			axis,
			stateName,
			mdName,
		} = this.props;

		const filteredAttrs = dataset.viewState[axis].filter;

		const {
			onClickAttrFactory,
			onClickFilterFactory,
			searchField,
			sortOrderList,
		} = this.state;

		const { searchVal } = dataset.viewState[stateName];

		const { indices } = dataset.viewState[axis];

		return (
			<div
				className='view-vertical'
				style={{
					margin: '1em 3em 1em 3em',
					overflowX: 'hidden',
				}}>
				<h1>{mdName} Metadata: {dataset.project}/{dataset.title}</h1>
				<MetadataTable
					attributes={attributes}
					attrKeys={attrKeys}
					searchField={searchField}
					searchVal={searchVal}
					sortOrderList={sortOrderList}
					indices={indices}
					filteredAttrs={filteredAttrs}
					dispatch={dispatch}
					onClickAttrFactory={onClickAttrFactory}
					onClickFilterFactory={onClickFilterFactory} />
			</div>
		);
	}
}

MetadataComponent.propTypes = {
	attributes: PropTypes.object.isRequired,
	attrKeys: PropTypes.array.isRequired,
	axis: PropTypes.string.isRequired,
	stateName: PropTypes.string.isRequired,
	mdName: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};