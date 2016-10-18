import React, { Component, PropTypes } from 'react';
import { isEqual } from 'lodash';
import { SortableTable } from './sortabletable';
import { Canvas } from './canvas';
import { sparkline } from './sparkline';

import { nMostFrequent } from '../js/util';
import * as colors from '../js/colors';

class MetadataPlot extends Component {
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
		const { data, filterFunc } = this.props;

		let legend;
		if (modes[mode] === 'Categorical') {
			let { values, count } = nMostFrequent(data);
			let l = Math.min(values.length, 19);
			let dataCells = [];
			for (let i = 0; i < l; i++) {
				let v = values[i];
				dataCells.push(
					<td
						key={i}
						onClick={filterFunc(v)}
						style={{ display: 'inline-block', color: colors.category20[i + 1] }}>
						<span style={{ fontStyle: 'normal' }}>■ </span>{v}: {count[i]}
					</td>
				);
			}
			if (l < values.length) {
				let rest = 0;
				while (l < values.length) { rest += count[l++]; }
				dataCells.push(
					<td key={values.length} style={{ display: 'inline-block' }}>
						<span style={{ fontStyle: 'normal' }}>□ </span>(other): {rest}
					</td>
				);
			}
			legend = (
				<table style={{ display: 'block' }}>
					<tbody>
						<tr>
							{dataCells}
						</tr>
					</tbody>
				</table>
			);
		}

		return (
			<div className='view-vertical'>
				<div
					onClick={this.modeCycler}
					style={{ cursor: (modes.length > 1 ? 'pointer' : 'initial')}} >
					<Canvas
						height={30}
						paint={sparkline(this.props.data, modes[mode])}
						redraw clear />
				</div>
				{legend}
			</div>
		);
	}
}

MetadataPlot.propTypes = {
	data: PropTypes.oneOfType(
		[PropTypes.arrayOf(PropTypes.number),
		PropTypes.arrayOf(PropTypes.string)]
	).isRequired,
	mode: PropTypes.string,
	modes: PropTypes.arrayOf(PropTypes.string),
	filterFunc: PropTypes.func.isRequired,
};

const columns = [
	{
		headers: ['ATTRIBUTE'],
		key: 'name',
		dataStyle: { width: '10%', fontWeight: 'bold' },
	},
	{
		headers: ['DATA'],
		key: 'val',
		dataStyle: { width: '90%', fontStyle: 'italic' },
	},
];

export class MetadataComponent extends Component {
	// given that this component will only be rendered
	// after the dataset has been fetched, and that the
	// dataset is immutable, we might as well pre-process
	// everything and store it in the state
	constructor(props) {
		super(props);

		this.createTableData = this.createTableData.bind(this);
		this.createHistogram = this.createHistogram.bind(this);
		this.createStringTable = this.createStringTable.bind(this);
	}

	componentWillMount() {
		const tableData = this.createTableData(this.props);
		this.setState({ tableData });

	}

	componentWillUpdate(nextProps) {
		if (!isEqual(nextProps.attributes, this.props.attributes)) {
			const tableData = this.createTableData(nextProps);
			this.setState({ tableData });
		}
	}

	createTableData(props) {
		const { attributes, schema, onClickAttrFactory, onClickFilterFactory } = props;
		let tableData = [];
		const keys = Object.keys(schema).sort();
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const onClick = onClickAttrFactory(key);
			const name = <span style={{ cursor: 'pointer' }} onClick={onClick}>{key}</span>;
			let tableRow = { name };
			let filterFunc = (val) => { onClickFilterFactory(key, val); };
			switch (schema[key]) {
				case 'float32':
				case 'float64':
				case 'integer':
				case 'number':
					tableRow.val = this.createHistogram(attributes[key], filterFunc);
					break;
				case 'string':
					tableRow.val = this.createStringTable(attributes[key], filterFunc);
					break;
				default:
					tableRow.val = 'unknown';
			}
			tableData.push(tableRow);
		}
		return tableData;
	}

	createStringTable(stringArray, filterFunc) {
		let { values, count } = nMostFrequent(stringArray);
		if (count[0] === 1 || count.length === 1) {
			// unique strings, or only one string
			let list = values[0];
			const l = Math.min(count.length, 20);
			for (let i = 1; i < l; i++) {
				list += `, ${values[i]}`;
			}
			if (count.length > 20) {
				list += ', ...';
			}
			return <span>{list}</span>;
		} else { // show a Categorical plot of up to twenty items
			return (
				<MetadataPlot
					data={stringArray}
					mode={'Categorical'}
					modes={['Categorical']}
					filterFunc={filterFunc} />
			);
		}
	}

	createHistogram(numberArray, filterFunc) {
		let { values } = nMostFrequent(numberArray);
		// is all number have same value, return that value
		return (values.length === 1) ? values[0] : (
			<MetadataPlot
				data={numberArray}
				mode={values.length <= 20 ? 'Categorical' : 'Bars'}
				filterFunc={filterFunc} />
		);
	}

	render() {
		const { dispatch } = this.props;
		const { tableData } = this.state;
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
	schema: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	onClickAttrFactory: PropTypes.func.isRequired,
	onClickFilterFactory: PropTypes.func.isRequired,
};