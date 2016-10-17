import React, { Component, PropTypes } from 'react';
import { FetchDatasetComponent } from './fetch-dataset';
import { SortableTable } from './sortabletable';

import { SET_VIEW_PROPS } from '../actions/actionTypes';
import { nMostFrequent } from '../js/util';

//import Fuse from 'fuse.js';
import JSURL from 'jsurl';

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

class MetadataComponent extends Component {
	// given that this component will only be rendered
	// after the dataset has been fetched, and that the
	// dataset is immutable, we might as well pre-process
	// everything and store it in the state
	constructor(props) {
		super(props);

		this.createTableData = this.createTableData.bind(this);
		this.createHistogram = this.createHistogram.bind(this);
		this.createStringCell = this.createStringCell.bind(this);

		// todo
		// - Gene metadata (rowAttrs)
		// - Cell metadata (colAttrs)
		// - use schema to detect data type
		//   - string values: string
		//   - number values: float32, float64, integer, number
		// - convert number values to histograms
		//   - log scale toggle
		//     (to find bin partitioning borders, take log2 of
		//      maximum val, divide by nr bins, then take 2^value)
		// - convert string values to top ten list of name occurrences
		const { dataSet } = props;
		const { rowAttrs, colAttrs, schema } = dataSet;

		this.state = {
			geneData: this.createTableData(rowAttrs, schema.rowAttrs),
			cellData: this.createTableData(colAttrs, schema.colAttrs),
		};
	}

	createTableData(data, schema) {
		let tableData = [];
		for (let keys = Object.keys(schema), i = 0; i < keys.length; i++) {
			const key = keys[i];
			let tableRow = { name: key };
			switch (schema[key]) {
				case 'float32':
				case 'float64':
				case 'integer':
				case 'number':
					tableRow.val = this.createHistogram(data[key]);
					break;
				case 'string':
					tableRow.val = this.createStringCell(data[key]);
					break;
				default:
					tableRow.val = 'unknown';
			}
			tableData.push(tableRow);
		}
		return tableData;
	}

	createStringCell(stringArray) {
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
		} else { // show a mini-table of up to ten items
			let l = Math.min(values.length, 10);
			let valuesRow = [], countRow = [];
			for (let i = 0; i < l; i++) {
				valuesRow.push(<td style={{ border: '0px none' }}>{values[i]}</td>);
				countRow.push(<td>{count[i]}</td>);
			}
			if (l < values.length) {
				let rest = 0;
				while (l < values.length) { rest += count[l++]; }
				valuesRow.push(<td style={{ border: '0px none' }}>(other)</td>);
				countRow.push(<td>{rest}</td>);

			}
			return (
				<table>
					<tr>{valuesRow}</tr>
					<tr>{countRow}</tr>
				</table>
			);
		}
	}

	createHistogram(numberArray) { return '<todo: number plot>'; }

	componentWillMount() {

	}


	render() {
		const { dataSet, dispatch } = this.props;
		const { geneData, cellData } = this.state;
		return (
			<div className='view-vertical' style={{ margin: '1em 3em 1em 3em' }}>
				<h1>(WIP) Metadata of {dataSet.dataset}</h1>
				<h2>Genes</h2>
				<SortableTable
					data={geneData}
					columns={columns}
					dispatch={dispatch}
					/>
				<h2>Cells</h2>
				<SortableTable
					data={cellData}
					columns={columns}
					dispatch={dispatch}
					/>
			</div>
		);
	}
}

MetadataComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class MetadataStateInitialiser extends Component {

	componentWillMount() {
		const { dispatch, dataSet, viewsettings } = this.props;

		// Note that URL state overrules redux state on mounting
		const metadataState = viewsettings ?
			JSURL.parse(viewsettings) :
			(dataSet.metadataState ?
				dataSet.metadataState
				:
				{ /* Initialise metadataState for this dataset */ }
			);

		// We dispatch even in case of existing state,
		// to synchronise the view-settings URL
		dispatch({
			type: SET_VIEW_PROPS,
			fieldName: 'metadataState',
			datasetName: dataSet.dataset,
			metadataState,
		});
	}

	render() {
		const { dispatch, dataSet } = this.props;
		return dataSet.metadataState ? (
			<MetadataComponent
				dispatch={dispatch}
				dataSet={dataSet}
				/>
		) : <div className='view'>Initialising Metadata View Settings</div>;
	}
}

MetadataStateInitialiser.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	viewsettings: PropTypes.string,
};

const MetadataDatasetFetcher = function (props) {
	const { dispatch, data, params } = props;
	const { dataset, project, viewsettings } = params;
	const dataSet = data.dataSets[dataset];
	return (dataSet === undefined ?
		<FetchDatasetComponent
			dispatch={dispatch}
			dataSets={data.dataSets}
			dataset={dataset}
			project={project} />
		:
		<MetadataStateInitialiser
			dataSet={dataSet}
			dispatch={dispatch}
			viewsettings={viewsettings} />
	);
};

MetadataDatasetFetcher.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect MetadataDatasetFetcher to store
import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		data: state.data,
	};
};

export const MetadataView = connect(mapStateToProps)(MetadataDatasetFetcher);

