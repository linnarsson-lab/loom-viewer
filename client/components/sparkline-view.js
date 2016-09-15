import React, { Component, PropTypes } from 'react';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { FetchDatasetComponent } from './fetch-dataset';
import { Canvas } from './canvas';
import { sparkline } from './sparkline';

import { SET_SPARKLINE_PROPS } from '../actions/actionTypes';

import * as _ from 'lodash';

import JSURL from 'jsurl';

// TODO: Don't re-render every sparkline on every re-render. Cache stuff.
class SparklineViewComponent extends Component {

	constructor(props) {
		super(props);
		this.sortIndices = this.sortIndices.bind(this);
		this.generateSparklines = this.generateSparklines.bind(this);
		this.createSortedBy = this.createSortedBy.bind(this);
		this.update = this.update.bind(this);
	}

	update(dataSet) {
		const sl = dataSet.sparklineState;
		// The old column attribute values that we displayed in the "legend"
		let legendData = dataSet.colAttrs[sl.colAttr];
		// if colAttr does not exist (for example, the default values
		// in the Loom interface is not present), pick the first column
		if (legendData === undefined) {
			let properties = Object.getOwnPropertyNames(dataSet.colAttrs);
			legendData = dataSet.colAttrs[properties[0]];
		}

		const indices = this.sortIndices(legendData.length, sl, dataSet);

		// selected genes in state
		const selection = dataSet.rowAttrs.Gene ?
			_.intersection(sl.genes, dataSet.rowAttrs.Gene)
			:
			sl.genes;
		let genes = [], data = [];
		for (let i = 0; i < selection.length; i++) {
			let geneData = dataSet.fetchedGenes[selection[i]];
			// no point trying to generate genes without data
			if (geneData) {
				genes.push(selection[i]);
				data.push(this.createSortedBy(geneData, indices));
			}
		}
		const sparklines = genes.length ? this.generateSparklines(genes, data, sl.geneMode, sl.showLabels) : null;
		const legendSparkline = sparkline(this.createSortedBy(legendData, indices), sl.colMode);

		// "Show cell attribute"
		const legend = (
			<div style={{
				flex: '0 0 auto',
				minHeight: '20px',
				/* Showing the scrollbar is ugly, but otherwise
				lining up will be *really hard* because browsers
				do not allow for direct access to scrollbar size */
				overflowY: 'scroll',
			}}>
				<Canvas
					height={20}
					paint={legendSparkline}
					redraw
					clear
					/>
			</div>
		);
		return { legend, sparklines };
	}

	sortIndices(length, slState, dataSet) {
		// Indices that we want to sort the data by. Default to sorted "as is"
		let indices = new Array(length);
		for (let i = 0; i < indices.length; ++i) {
			indices[i] = i;
		}

		// Determine which array we want to sort the data by. Note
		// that we abuse the JS dictionary behavior of returning
		// "undefined" when an entry doesn't exist: if the string
		// returned by an orderByGeneN or orderByAttrN is not present,
		// its compArrN will be undefined, thus ignored.
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

		let compArr = [];
		if (compArr1) { compArr.push(compArr1); }
		if (compArr2) { compArr.push(compArr2); }
		if (compArr3) { compArr.push(compArr3); }

		// Because not all browsers use a stable algorithm,
		// we force stability with this trick:
		// http://stackoverflow.com/a/2085225
		// Essentially, as a last resort we compare to the
		// original positions of the data.
		// This is important to ensure the sparline data
		// behaves the same across browsers.
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
		return indices;
	}

	// Creates a new sorted array
	createSortedBy(arr, indices) {
		let sortedArr = new Array(arr.length);
		for (let i = 0; i < arr.length; ++i) { sortedArr[i] = arr[indices[i]]; }
		return sortedArr;
	}

	generateSparklines(genes, geneData, mode, showLabels) {
		let newSL = []; // new sparklines
		let dataRange = [0, geneData[0].length];
		for (let i = 0; i < genes.length; i++) {
			const gene = genes[i];
			newSL[i] = (
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
						paint={sparkline(geneData[i], mode, dataRange, showLabels ? gene : null) }
						redraw
						clear
						/>
				</div>
			);
		}
		return newSL;
	}

	render() {
		const { legend, sparklines } = this.update(this.props.dataSet);
		return (
			<div className='view-vertical' style={{ margin: '20px 20px 20px 20px' }}>
				{legend}
				<div style={{ display: 'flex', flex: 1, overflowY: 'scroll', overflowX: 'hidden' }}>
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						width: '100%',
					}}>
						{sparklines}
					</div>
				</div>
				{legend}
			</div>
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
			<div className='view' style={{ overflowX: 'hidden' }}>
				<SparklineSidepanel
					dataSet={dataSet}
					dispatch={dispatch}
					/>
				<SparklineViewComponent
					dispatch={dispatch}
					dataSet={dataSet}
					/>
			</div>
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
