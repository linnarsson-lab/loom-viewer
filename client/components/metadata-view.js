import React, { Component, PropTypes } from 'react';
import { FetchDatasetComponent } from './fetch-dataset';
import { SortableTable } from './sortabletable';

import { SET_VIEW_PROPS } from '../actions/actionTypes';
import { merge, nMostFrequent } from '../js/util';

import {
	Button, Glyphicon,
	Form, FormGroup, FormControl,
	InputGroup, ControlLabel,
} from 'react-bootstrap';

import Fuse from 'fuse.js';
import JSURL from 'jsurl';


const columns = [
	{
		header: 'ATTRIBUTE ',
		key: 'name',
		headerStyle: { fontSize: '14px', padding: '8px', verticalAlign: 'middle' },
		dataStyle: { width: '10%', fontSize: '12px', padding: '8px', fontWeight: 'bold', verticalAlign: 'middle' },
	},
	{
		header: 'DATA ',
		key: 'val',
		headerStyle: { fontSize: '14px', padding: '8px', verticalAlign: 'middle' },
		dataStyle: { width: '90%', fontSize: '10px', padding: '8px', verticalAlign: 'middle' },
	},
];

class MetadataComponent extends Component {
	// given that this component will only be rendered
	// after the dataset has been fetched, and that the
	// dataset is immutable, we might as well pre-process
	// everything and store it in the state
	constructor(props) {
		super(props);

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

		let geneData = [];
		for (let keys = Object.keys(schema.rowAttrs), i = 0; i < keys.length; i++) {
			const key = keys[i];
			let tableRow = { name: key };
			switch (schema.rowAttrs[key]) {
				case 'float32':
				case 'float64':
				case 'integer':
				case 'number':
					tableRow.val = 'numerical';
					break;
				case 'string':
					tableRow.val = 'string';
					break;
				default:
					tableRow.val = 'unknown';
			}
			geneData.push(tableRow);
		}


		let cellData = [];
		for (let keys = Object.keys(schema.colAttrs), i = 0; i < keys.length; i++) {
			const key = keys[i];
			let tableRow = { name: key };
			switch (schema.colAttrs[key]) {
				case 'float32':
				case 'float64':
				case 'integer':
				case 'number':
					tableRow.val = 'numerical';
					break;
				case 'string':
					tableRow.val = 'string';
					break;
				default:
					tableRow.val = 'unknown';
			}
			cellData.push(tableRow);
		}

		this.state = { geneData, cellData };
	}

	componentWillMount() {

	}


	render() {
		const { dataSet, dispatch } = this.props;
		const { geneData, cellData } = this.state;
		return (
			<div className='view-vertical' style={{ margin: '1em 3em 1em 3em' }}>
				<h1>Metadata of {dataSet.dataset}</h1>
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

