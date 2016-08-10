import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { SparklineSidepanel } from './sparkline-sidepanel';
import { Sparkline } from './sparkline';
import * as _ from 'lodash';
import { fetchDataSet } from '../actions/actions';

const SparklineViewComponent = function (props) {
	const { sparklineState, dataSet, genes, viewState, dispatch } = props;

	let colData = dataSet.colAttrs[sparklineState.colAttr];
	// Figure out the ordering
	let indices = new Array(colData.length);
	for (let i = 0; i < colData.length; ++i) {
		indices[i] = i;
	}
	if (sparklineState.orderByAttr !== "(none)") {
		let orderBy = null;
		if (sparklineState.orderByAttr === "(gene)") {
			if (genes.hasOwnProperty(sparklineState.orderByGene)) {
				orderBy = genes[sparklineState.orderByGene];
			}
		} else {
			orderBy = dataSet.colAttrs[sparklineState.orderByAttr];
		}
		if (orderBy !== null) {
			indices.sort((a, b) => { return orderBy[a] < orderBy[b] ? -1 : orderBy[a] > orderBy[b] ? 1 : 0; });
		}
	}

	// Order the column attribute values
	let temp = new Array(colData.length);
	for (let i = 0; i < colData.length; ++i) { temp[i] = colData[indices[i]]; }
	colData = temp;

	const uniqueGenes = _.uniq(sparklineState.genes.trim().split(/[ ,\r\n]+/));
	const geneSparklines = (uniqueGenes.length === 0 || uniqueGenes[0] === "") ? <div></div> : (
		_.map(uniqueGenes, (gene) => {
			if (uniqueGenes.hasOwnProperty(gene)) {
				let geneData = new Array(colData.length);
				for (let i = 0; i < geneData.length; ++i) {
					geneData[i] = uniqueGenes[gene][indices[i]];
				}

				return (
					<div key={gene}>
						<Sparkline
							orientation='horizontal'
							width={viewState.width - 450}
							height={20}
							data={geneData}
							dataRange={[0, colData.length]}
							screenRange={[0, viewState.width - 450]}
							mode={sparklineState.geneMode}
							/>
						<span className='sparkline-label'>{gene}</span>
					</div>
				);
			} else {
				return <div key={gene}></div>;
			}
		})
	);


	return (
		<div style={{ display: 'flex', flex: '1 1 auto' }}>
			<div className='view-sidepanel'>
				<SparklineSidepanel
					sparklineState={sparklineState}
					dataSet={dataSet}
					genes={uniqueGenes}
					dispatch={dispatch}
					/>
			</div>
			<div style={{ display: 'flex', flex: '1 1 auto', padding: '20px', overflow: 'hidden' }}>
				{
					/* Borrowing the Leaflet zoom buttons
					<div className="leaflet-top leaflet-left">
						<div className="leaflet-control-zoom leaflet-bar leaflet-control">
							<a className="leaflet-control-zoom-in"
								title="Zoom in">
								+
							</a>
							<a className="leaflet-control-zoom-out leaflet-disabled"
								title="Zoom out">
								-
							</a>
						</div>
					</div>
					*/
				}
				<Sparkline
					orientation='horizontal'
					height={20}
					data={colData}
					dataRange={[0, colData.length]}
					mode={sparklineState.colMode}
					/>
				<span className='sparkline-label'>
					{sparklineState.colAttr}
				</span>
				<div>
					{geneSparklines}
				</div>
			</div>
		</div>
	);
};

SparklineViewComponent.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	genes: PropTypes.object.isRequired,
	sparklineState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class SparklineViewContainer extends Component {
	componentDidMount() {
		const { dispatch, data, params } = this.props;
		const { transcriptome, project, dataset } = params;
		const dataSetName = transcriptome + '__' + project + '__' + dataset;
		dispatch(fetchDataSet({ dataSets: data.dataSets, dataSetName: dataSetName }));
	}

	render() {
		const { dispatch, data, sparklineState, viewState, params } = this.props;
		const { transcriptome, project, dataset } = params;
		const fetchDatasetString = transcriptome + '__' + project + '__' + dataset;
		const dataSet = data.dataSets[fetchDatasetString];
		const genes = data.genes;
		return (dataSet ?
			<SparklineViewComponent
				dispatch={dispatch}
				sparklineState={sparklineState}
				dataSet={dataSet}
				viewState={viewState}
				genes={genes} />
			:
			<div className='container' >Fetching dataset...</div>
		);
	}
}

SparklineViewContainer.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	sparklineState: PropTypes.object.isRequired,
	viewState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect SparklineViewContainer to store
import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		sparklineState: state.sparklineState,
		viewState: state.viewState,
		data: state.data,
	};
};

export const SparklineView = connect(mapStateToProps)(SparklineViewContainer);