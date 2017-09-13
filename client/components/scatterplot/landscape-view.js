import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterPlotMatrix } from './scatterplot-matrix';
import { LandscapeSidepanel } from './landscape-sidepanel';

import { ViewInitialiser } from '../view-initialiser';

import { firstMatchingKey } from '../../js/util';

class LandscapeComponent extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;

		return (
			<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
				<LandscapeSidepanel
					dataset={dataset}
					dispatch={dispatch}
					style={{
						overflowX: 'hidden',
						overFlowY: 'hidden',
						minHeight: 0,
						width: '300px',
						margin: '10px',
					}}
				/>
				<ScatterPlotMatrix
					axis={'col'}
					dataset={dataset}
					dispatch={dispatch}
				/>
			</div>
		);
	}
}

LandscapeComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const stateInitialiser = (dataset) => {
	// Initialise landscapeState for this dataset
	const attrs = dataset.col.attrs;
	return {
		landscapeInitialized: true,
		col: {
			scatterPlots: {
				selected: 0,
				plots: [
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
					},
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
					},
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1', '_LogMean']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2', '_LogCV']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
					},
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1', '_LogMean']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2', '_LogCV']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
					},
				],
			},
			settings: {
				scaleFactor: 20,
			},
		},
	};
};

export class LandscapeViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={LandscapeComponent}
				stateName={'landscapeInitialized'}
				stateInitialiser={stateInitialiser}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

LandscapeViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	datasets: PropTypes.object,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		datasets: state.datasets.list,
	};
};

export const LandscapeView = connect(mapStateToProps)(LandscapeViewInitialiser);