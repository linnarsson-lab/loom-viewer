import React, { Component, PropTypes } from 'react';
import { AttrLegend } from './legend';
import { SortableTable } from './sortabletable';
import { Canvas } from './canvas';
import { sparkline } from './sparkline';

import Fuse from 'fuse.js';

export class MetadataPlot extends Component {
	constructor(props) {
		super(props);
		this.modeCycler = this.modeCycler.bind(this);

		const modes = props.modes ? props.modes : ['Bars', 'Heatmap', 'Categorical'];
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
		const { data, filterFunc, mostFrequent } = this.props;
		return (
			<div className='view-vertical'>
				<div
					onClick={this.modeCycler}
					style={{ cursor: (modes.length > 1 ? 'pointer' : 'initial') }} >
					<Canvas
						height={30}
						paint={sparkline(data, modes[mode])}
						redraw clear />
				</div>
				<AttrLegend
					mode={modes[mode]}
					filterFunc={filterFunc}
					mostFrequent={mostFrequent} />
			</div>
		);
	}
}

MetadataPlot.propTypes = {
	data: PropTypes.array.isRequired,
	mode: PropTypes.string,
	modes: PropTypes.arrayOf(PropTypes.string),
	filterFunc: PropTypes.func.isRequired,
	mostFrequent: PropTypes.arrayOf(PropTypes.object).isRequired,
};


export class MetadataComponent extends Component {
	// given that this component will only be rendered
	// after the dataset has been fetched, and that the
	// dataset is immutable, we might as well pre-process
	// everything and store it in the state
	constructor(props) {
		super(props);

		this.createTableData = this.createTableData.bind(this);
	}

	componentWillMount() {
		const { columns, tableData } = this.createTableData(this.props);
		this.setState({ columns, tableData });
	}


	componentWillReceiveProps(nextProps){
		const {columns, tableData } = this.createTableData(nextProps);
		this.setState({ columns, tableData });
	}

	createTableData(props) {
		const { attributes, attrKeys,
			onClickAttrFactory, onClickFilterFactory,
			searchField, searchVal } = props;
		const columns = [
			{
				headers: ['ATTRIBUTE', searchField],
				key: 'name',
				dataStyle: { width: '10%', fontWeight: 'bold' },
			},
			{
				headers: ['DATA'],
				key: 'val',
				dataStyle: { width: '90%', fontStyle: 'italic' },
			},
		];

		let filteredKeys = attrKeys;
		if (searchVal){
			filteredKeys = attrKeys.map( (val) => {
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
			let tableRow = { name: <div onClick={onClick} style={{ width: '100%', height: '100%', cursor: 'pointer' }}><span>{key}</span></div> };
			const { filteredData, mostFrequent, type } = attributes[key];

			if (mostFrequent.length === 1 || mostFrequent[0].count === 1) {
				// only one string, or unique strings
				let list = mostFrequent[0].val;
				const l = Math.min(mostFrequent.length, 5);
				for (let i = 1; i < l; i++) {
					list += `, ${mostFrequent[i].val}`;
				}
				if (l < mostFrequent.length) {
					list += ', ...';
				}
				tableRow.val = <span>{list}</span>;
			} else {


				const filterFunc = (val) => { return onClickFilterFactory(key, val); };
				switch(type){
				case 'string':
				case 'indexedString':
					tableRow.val = (
						<MetadataPlot
							data={filteredData}
							modes={['Categorical']}
							filterFunc={filterFunc}
							mostFrequent={mostFrequent} />
					);
					break;
				default:
					tableRow.val = (
						<MetadataPlot
							data={filteredData}
							mode={ /* guess default category based on nr of unique values*/
								mostFrequent.length <= 20 ? 'Categorical' : 'Bars'}
							filterFunc={filterFunc}
							mostFrequent={mostFrequent} />
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

MetadataComponent.propTypes = {
	attributes: PropTypes.object.isRequired,
	attrKeys: PropTypes.array.isRequired,
	searchField: PropTypes.node.isRequired,
	searchVal: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
	onClickAttrFactory: PropTypes.func.isRequired,
	onClickFilterFactory: PropTypes.func.isRequired,
};