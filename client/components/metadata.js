import React, { Component, PropTypes } from 'react';
import { Glyphicon } from 'react-bootstrap';
import { DebouncedFormcontrol } from './debounced-formcontrol';
import { AttrLegend } from './legend';
import { SortableTable } from './sortabletable';
import { Canvas } from './canvas';
import { sparkline } from './sparkline';
import { SET_VIEW_PROPS, FILTER_METADATA } from '../actions/actionTypes';

import Fuse from 'fuse.js';

export class MetadataPlot extends Component {
	constructor(props) {
		super(props);
		this.modeCycler = this.modeCycler.bind(this);

		const modes = props.modes ? props.modes : ['Bars', 'Heatmap', 'Heatmap2', 'Categorical'];
		let idx = modes.indexOf(props.mode);
		const mode = idx !== -1 ? idx : 0;
		this.state = { modes, mode };
	}

	modeCycler() {
		const { mode, modes } = this.state;
		const nextMode = (mode + 1) % modes.length;
		this.setState({ mode: nextMode });
	}

	render() {
		const { modes, mode } = this.state;
		const { attr, indices, filterFunc } = this.props;
		return (
			<div className='view-vertical'>
				<div
					onClick={this.modeCycler}
					style={{ cursor: (modes.length > 1 ? 'pointer' : 'initial') }} >
					<Canvas
						height={30}
						paint={sparkline(attr, indices, modes[mode])}
						redraw clear />
				</div>
				<AttrLegend
					mode={modes[mode]}
					filterFunc={filterFunc}
					attr={attr} />
			</div>
		);
	}
}

MetadataPlot.propTypes = {
	attr: PropTypes.object.isRequired,
	indices: PropTypes.array.isRequired,
	mode: PropTypes.string,
	modes: PropTypes.arrayOf(PropTypes.string),
	filterFunc: PropTypes.func.isRequired,
};


class MetadataTable extends Component {
	constructor(props) {
		super(props);
		this.createTableData = this.createTableData.bind(this);
	}

	// given that this component will only be rendered
	// after the dataset has been fetched, and that the
	// dataset is immutable, we might as well pre-process
	// everything and store it in the state
	componentWillMount() {
		const { columns, tableData } = this.createTableData(this.props);
		this.setState({ columns, tableData });
	}


	componentWillReceiveProps(nextProps) {
		const { columns, tableData } = this.createTableData(nextProps);
		this.setState({ columns, tableData });
	}

	createTableData(props) {
		const { attributes, attrKeys,
			searchField, searchVal,
			sortOrderList, sortedFilterIndices,
			onClickAttrFactory, onClickFilterFactory } = props;

		const sortOrderStyle = {
			fontWeight: 'normal',
			fontStyle: 'italic',
			verticalAlign: 'middle',
		};
		const columns = [
			{
				headers: ['ATTRIBUTE', searchField],
				key: 'name',
				dataStyle: { width: '10%', fontWeight: 'bold' },
			},
			{
				headers: ['DATA', sortOrderList],
				headerStyles: [{}, sortOrderStyle],
				key: 'val',
				dataStyle: { width: '90%', fontStyle: 'italic' },
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
					<div
						onClick={onClick}
						style={{ width: '100%', height: '100%', cursor: 'pointer' }}>
						<span>{key}</span>
					</div>),
			};
			const attr = attributes[key];
			const { data, indexedVal, arrayType, uniques, uniqueVal } = attr;

			if (uniqueVal !== undefined) { // only one value
				tableRow.val = (
					<span>{uniqueVal}</span>
				);
			} else if (uniques[0].count === 1) { // every value is unique
				let list = data[sortedFilterIndices[0]];
				const l = Math.min(uniques.length, 5);
				if (indexedVal) {
					list = indexedVal[list];
					for (let i = 1; i < l; i++) {
						list += `, ${indexedVal[data[sortedFilterIndices[i]]]}`;
					}
				} else {
					for (let i = 1; i < l; i++) {
						list += `, ${data[sortedFilterIndices[i]]}`;
					}
				}
				if (l < uniques.length) {
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
								modes={['Categorical']}
								indices={sortedFilterIndices}
								filterFunc={filterFunc} />
						);
						break;
					default:
						tableRow.val = (
							<MetadataPlot
								attr={attr}
								mode={ /* guess default category based on nr of unique values*/
									uniques.length <= 20 ? 'Categorical' : 'Bars'}
								indices={sortedFilterIndices}
								filterFunc={filterFunc} />
						);
				}
			}
			tableData.push(tableRow);
		}
		return { columns, tableData };
	}

	render() {
		const { dispatch } = this.props;
		const { columns, tableData } = this.state;
		return (
			<SortableTable
				data={tableData}
				columns={columns}
				dispatch={dispatch}
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
	sortedFilterIndices: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
	onClickAttrFactory: PropTypes.func.isRequired,
	onClickFilterFactory: PropTypes.func.isRequired,
};


export class MetadataComponent extends Component {
	// given that this component will only be rendered
	// after the dataset has been fetched, and that the
	// dataset is immutable, we might as well pre-process
	// everything and store it in the state
	constructor(props) {
		super(props);
		const { dispatch, dataset, stateName, actionType, axis } = props;
		const path = dataset.path;

		const onClickAttrFactory = (attrName) => {
			return () => {
				dispatch({
					type: actionType,
					path,
					axis,
					attrName,
					stateName,
				});
			};
		};

		const onClickFilterFactory = (attrName, val) => {
			return () => {
				dispatch({
					type: FILTER_METADATA,
					path,
					axis,
					attrName,
					val,
				});
			};
		};

		this.state = {
			onClickAttrFactory,
			onClickFilterFactory,
		};
	}

	componentWillMount() {
		const { dispatch, dataset, stateName } = this.props;
		const path = dataset.path;

		const searchMetadata = (event) => {
			let searchVal = event.target.value ? event.target.value : '';
			dispatch({
				type: SET_VIEW_PROPS,
				path,
				stateName,
				viewState: { [stateName]: { searchVal } },
			});
		};

		this.setState({ searchMetadata });
	}

	render() {

		const {
			dataset, dispatch,
			attributes, attrKeys, axis,
			stateName, mdName,
		} = this.props;

		const {
			onClickAttrFactory,
			onClickFilterFactory,
			searchMetadata,
		} = this.state;

		let { searchVal } = dataset.viewState[stateName];

		const searchField = (
			<DebouncedFormcontrol
				type='text'
				onChange={searchMetadata}
				value={searchVal}
				time={500}
			/>
		);

		// Show first four attributes to use as sort keys
		const { order, sortedFilterIndices } = dataset[axis];
		let sortOrderList = [<span key={'sortLabel'} style={{ fontWeight: 'bold' }}>{'Order by:'}</span>];
		for (let i = 0; i < Math.min(order.length, 4); i++){
			const val = order[i];
			sortOrderList.push(
				<span key={i+1}>
					&nbsp;&nbsp;&nbsp;
					{val.key}
					<Glyphicon
						glyph={ val.ascending ?
						'sort-by-attributes' : 'sort-by-attributes-alt' } />
				</span>
			);
		}

		return (
			<div className='view-vertical' style={{ margin: '1em 3em 1em 3em' }}>
				<h1>{mdName} Metadata: {dataset.project}/{dataset.title}</h1>
				<MetadataTable
					attributes={attributes}
					attrKeys={attrKeys}
					searchField={searchField}
					searchVal={searchVal}
					sortOrderList={sortOrderList}
					sortedFilterIndices={sortedFilterIndices}
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
	actionType: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};