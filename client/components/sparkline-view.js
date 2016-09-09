import React, { Component, PropTypes } from 'react';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { FetchDatasetComponent } from './fetch-dataset';
import { Canvas } from './canvas';
import { sparkline } from './sparkline';

import { SET_SPARKLINE_PROPS } from '../actions/actionTypes';

import * as _ from 'lodash';

import JSURL from 'jsurl';

class SparklineViewComponent extends Component {

	constructor(props) {
		super(props);
		this.sortIndices = this.sortIndices.bind(this);
	}

	componentWillMount() {
		const { dataSet } = this.props;
		const sl = dataSet.sparklineState;
		// The old column attribute values that we displayed in the "legend"
		let colData = dataSet.colAttrs[sl.colAttr];
		// if colAttr does not exist (for example, the default values
		// in the Loom interface is not present), pick the first column
		if (colData === undefined) {
			let properties = Object.getOwnPropertyNames(dataSet.colAttrs);
			colData = dataSet.colAttrs[properties[0]];
		}
		this.sortIndices(sl, colData, dataSet);
	}

	componentWillUpdate(nextProps) {
		const nextDS = nextProps.dataSet;
		const nextSL = nextDS.sparklineState;

		// The column attribute values that we want to display in the "legend"
		let nextColData = nextDS.colAttrs[nextSL.colAttr];
		// if colAttr does not exist (for example, the default values
		// in the Loom interface is not present), pick the first column
		if (nextColData === undefined) {
			let properties = Object.getOwnPropertyNames(nextDS.colAttrs);
			nextColData = nextDS.colAttrs[properties[0]].slice(0);
		}
		const ds = this.props.dataSet;
		const sl = ds.sparklineState;
		if (nextSL.colAttr !== sl.colAttr ||
			nextSL.orderByAttr1 !== sl.orderByAttr1 ||
			nextSL.orderByAttr2 !== sl.orderByAttr2 ||
			nextSL.orderByAttr3 !== sl.orderByAttr3 ||
			nextDS.fetchedGenes[nextSL.orderByGene1] !== ds.fetchedGenes[sl.orderByGene1] ||
			nextDS.fetchedGenes[nextSL.orderByGene2] !== ds.fetchedGenes[sl.orderByGene2] ||
			nextDS.fetchedGenes[nextSL.orderByGene3] !== ds.fetchedGenes[sl.orderByGene3]
		) {
			this.sortIndices(nextSL, nextColData, nextDS);
		}
	}

	sortIndices(slState, colData, dataSet) {
		console.log("test");
		// Indices that we want to sort the data by. Default to sorted "as is"
		let indices = new Array(colData.length);
		for (let i = 0; i < indices.length; ++i) {
			indices[i] = i;
		}

		// Determine which array we want to sort colData by. Note that we abuse
		// the JS dictionary behavior of returning "undefined" when an
		// entry doesn't exist: if the string returned by orderByGene or
		// orderByAttr is not present, compArr will be undefined,
		// and we don't re-arrange the indices.
		const { orderByAttr1, orderByAttr2, orderByAttr3 } = slState;

		const compArr1 = (orderByAttr1 === '(gene)') ?
			dataSet.fetchedGenes[slState.orderByGene1]
			:
			dataSet.colAttrs[orderByAttr1];
		const compArr2 = (orderByAttr2 === '(gene)') ?
			dataSet.fetchedGenes[slState.orderByGene2]
			:
			dataSet.colAttrs[orderByAttr3];
		const compArr3 = (orderByAttr3 === '(gene)') ?
			dataSet.fetchedGenes[slState.orderByGene3]
			:
			dataSet.colAttrs[orderByAttr3];
		console.log('comp arrays', compArr1, compArr2, compArr3);
		let compArr = [];
		if (compArr1) { compArr.push(compArr1); }
		if (compArr2) { compArr.push(compArr2); }
		if (compArr3) { compArr.push(compArr3); }

		// Because not all browsers use a stable algorithm,
		// we force stability with this trick:
		// http://stackoverflow.com/a/2085225
		// This is important to maintain a consistent look across browsers.
		if (compArr) {
			indices = indices.slice(0).sort((a, b) => {
				let i = 0, v = 0;
				while (v === 0 && i < compArr.length) {
					v = compArr[i][a] < compArr[i][b] ? -1 :
						compArr[i][a] > compArr[i][b] ? 1 : 0;
					i++;
				}
				return v ? v : (indices[a] < indices[b] ? -1 : 1);
			});
		}

		// Finally, order the column attribute values by the determined indices.
		let temp = new Array(colData.length);
		for (let i = 0; i < colData.length; ++i) { temp[i] = colData[indices[i]]; }

		this.setState({ indices, colData: temp });
	}

	render() {
		const { dataSet, dispatch } = this.props;
		const { sparklineState, fetchedGenes } = dataSet;
		const { colData, indices } = this.state;

		let selectedGenesList = sparklineState.genes.trim().split(/[ ,\r\n]+/);
		const selectableGenes = dataSet.rowAttrs.Gene;
		if (selectableGenes) {
			selectedGenesList = _.intersection(selectedGenesList, dataSet.rowAttrs.Gene);
		}

		// Sidepanel
		const sidepanel = (
			<SparklineSidepanel
				sparklineState={sparklineState}
				dataSet={dataSet}
				dispatch={dispatch}
				/>
		);

		// "Show cell attribute"
		// Showing the scrollbar is ugly, but otherwise lining up will be *really hard*
		// because browsers do not allow for direct access to scrollbar size
		const legend = (
			<div style={{
				flex: '0 0 auto',
				minHeight: '20px',
				overflowY: 'scroll',
			}}>
				<Canvas
					height={20}
					paint={ sparkline(colData, sparklineState.colMode) }
					clear
					/>
			</div>
		);

		// Actual sparklines
		let geneSparklines = [];
		if (selectedGenesList.length !== 0 && selectedGenesList[0] !== '') {
			for (let i = 0; i < selectedGenesList.length; i++) {
				const gene = selectedGenesList[i];
				const fetchedGene = fetchedGenes[gene];

				let geneData = [0];
				let label = `Fetching gene data for ${gene}`;
				let mode = 'Bars';
				if (fetchedGene) {
					geneData = new Array(colData.length);
					for (let j = 0; j < geneData.length; ++j) {
						geneData[j] = fetchedGenes[gene][indices[j]];
					}
					label = gene;
					mode = sparklineState.geneMode;
				}
				let dataRange = [0, geneData.length];
				geneSparklines[i] = (
					<div
						key={gene}
						style={{
							background: ((i % 2 === 0) ? '#FFFFFF' : '#F8F8F8'),
							display: 'flex',
							flexDirection: 'column',
							minHeight: '30px',
							maxHeight: '30px',
						}}>
						<Canvas
							height={30}
							paint={sparkline(geneData, mode, dataRange, label) }
							clear
							/>
					</div>
				);

			}
		}

		return (
			<div className='view' style={{ overflowX: 'hidden' }}>
				{sidepanel}
				<div className='view-vertical' style={{ margin: '20px 20px 20px 20px' }}>
					{legend}
					<div style={{ display: 'flex', flex: 1, overflowY: 'scroll', overflowX: 'hidden' }}>
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							width: '100%',
						}}>
							{geneSparklines}
						</div>
					</div>
					{legend}
				</div>
			</div >
		);
	}
}

SparklineViewComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};


class SparklineStateInitialiser extends Component {

	componentWillMount() {
		const { dispatch, dataSet, viewsettings } = this.props;

		const sparklineState = viewsettings ?
			JSURL.parse(viewsettings) :
			(dataSet.sparklineState ?
				dataSet.sparklineState
				:
				({ // Initialise sparklineState for this dataset
					orderByAttr1: '(original order)',
					orderByGene1: '',
					orderByAttr2: '',
					orderByGene2: '',
					orderByAttr3: '',
					orderByGene3: '',
					colAttr: dataSet.colAttrs[0],
					colMode: 'Categorical',
					geneMode: 'Bars',
					genes: '',
				})
			);

		// We dispatch even in case of existing state,
		// to synchronise the view-settings URL
		dispatch({
			type: SET_SPARKLINE_PROPS,
			datasetName: dataSet.dataset,
			sparklineState,
		});
	}

	render() {
		const { dispatch, dataSet } = this.props;
		return dataSet.sparklineState ? (
			<SparklineViewComponent
				dispatch={dispatch}
				dataSet={dataSet}
				/>
		) : <div className='view'>Initialising Sparkline View Settings</div>;
	}
}

SparklineStateInitialiser.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	viewsettings: PropTypes.string,
};


const SparklineDatasetFetcher = function (props) {
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
		<SparklineStateInitialiser
			dataSet={dataSet}
			dispatch={dispatch}
			viewsettings={viewsettings} />

	);
};

SparklineDatasetFetcher.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect SparklineDatasetFetcher to store
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

export const SparklineView = connect(mapStateToProps)(SparklineDatasetFetcher);
