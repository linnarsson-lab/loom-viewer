import React, { Component, PropTypes } from 'react';
import { SparklineSidepanel } from './sparkline-sidepanel';
import { Sparkline } from './sparkline';
import { FetchDatasetComponent } from './fetch-dataset';
import * as _ from 'lodash';

class SparklineViewComponent extends Component {


	render() {
		const { sparklineState, dataSet, genes, dispatch } = this.props;

		let colData = dataSet.colAttrs[sparklineState.colAttr];

		// Determine which array we want to sort by. Note that we abuse
		// the JS dictionary behavior of returning "undefined" when an
		// entry doesn't exist: if the string returned by orderByGene or
		// orderByAttr is not present, comparedArray stays undefined.
		let compareArray = undefined;
		if (sparklineState.orderByAttr === "(gene)") {
			compareArray = genes[sparklineState.orderByGene];
		} else {
			compareArray = dataSet.colAttrs[sparklineState.orderByAttr];
		}

		// Default to sorted "as is" ...
		let indices = new Array(colData.length);
		for (let i = 0; i < indices.length; ++i) {
			indices[i] = i;
		}
		// ... but if compareArray is defined, sort by that instead
		if (compareArray) {
			indices.sort(
				(a, b) => {
					return compareArray[a] < compareArray[b] ? -1 :
						compareArray[a] > compareArray[b] ? 1 : 0;
				}
			);
		}
		// Finally, order the column attribute values by the determined indices
		let temp = new Array(colData.length);
		for (let i = 0; i < colData.length; ++i) { temp[i] = colData[indices[i]]; }
		colData = temp;

		const showGenes = sparklineState.genes.trim().split(/[ ,\r\n]+/);
		const uniqueGenes = _.intersection(showGenes, dataSet.rowAttrs.Gene);
		let geneSparklines = [];

		if (uniqueGenes.length !== 0 && uniqueGenes[0] !== '') {
			for (let i = 0; i < uniqueGenes.length; i++) {

			}
			geneSparklines = _.map(uniqueGenes, (gene) => {
				if (uniqueGenes.hasOwnProperty(gene)) {
					let geneData = new Array(colData.length);
					for (let i = 0; i < geneData.length; ++i) {
						geneData[i] = genes[uniqueGenes[gene]][indices[i]];
					}
					console.log("geneData: ", geneData);
					return (
						<div key={gene}>
							<Sparkline
								orientation='horizontal'
								height={40}
								data={geneData}
								dataRange={[0, colData.length]}
								screenRange={[0, 500]}
								mode={sparklineState.geneMode}
								/>
							<span className='sparkline-label'>{gene}</span>
						</div>
					);
				} else {
					return null;
				}
			});
		}


		return (
			<div className='view'>
				<SparklineSidepanel
					sparklineState={sparklineState}
					dataSet={dataSet}
					geneArray={uniqueGenes}
					dispatch={dispatch}
					/>
				<div className='view-vertical' style={{ margin: '20px' }}>
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
						height={40}
						data={colData}
						dataRange={[0, colData.length]}
						mode={sparklineState.colMode}
						/>
					<span className='sparkline-label'>
						{sparklineState.colAttr}
					</span>
					<div className='view-vertical'>
						{geneSparklines}
					</div>
				</div>
			</div>
		);
	}
}

SparklineViewComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	genes: PropTypes.object.isRequired,
	sparklineState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const SparklineViewContainer = function (props) {
	const { dispatch, data, sparklineState, params } = props;
	const { project, dataset } = params;
	const dataSet = data.dataSets[dataset];
	const genes = data.genes;
	return (dataSet === undefined ?
		<FetchDatasetComponent
			dispatch={dispatch}
			dataSets={data.dataSets}
			dataset={dataset}
			project={project} />
		:
		<SparklineViewComponent
			dispatch={dispatch}
			sparklineState={sparklineState}
			dataSet={dataSet}
			genes={genes} />
	);
};

SparklineViewContainer.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	sparklineState: PropTypes.object.isRequired,
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
		data: state.data,
	};
};

export const SparklineView = connect(mapStateToProps)(SparklineViewContainer);