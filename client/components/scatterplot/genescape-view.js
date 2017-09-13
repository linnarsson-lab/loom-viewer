import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterPlotMatrix } from './scatterplot-matrix';
import { GenescapeSidepanel } from './genescape-sidepanel';

import { ViewInitialiser } from '../view-initialiser';
import { Canvas } from '../canvas';

import { firstMatchingKey } from '../../js/util';

class GenescapeComponent extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;

		return (
			<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
				<GenescapeSidepanel
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
					axis={'row'}
					dataset={dataset}
					dispatch={dispatch}
				/>
			</div>
		);
	}
}

GenescapeComponent.propTypes = {
	// Passed down by ViewInitialiser
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const stateInitialiser = (dataset) => {
	// Initialise genescape state for this dataset
	const attrs = dataset.row.attrs;
	return {
		genescapeInitialized: true,
		row: {
			scatterPlots: {
				selected: 0,
				plots: [
					{
						x: {
							attr: firstMatchingKey(attrs, ['_X', 'X', '_LogMean', '_tSNE1', '_PCA1']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(attrs, ['_Y', 'Y', '_LogCV', '_tSNE2', '_PCA2']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(attrs, ['_Selected', '_Excluded']),
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

export class GenescapeViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={GenescapeComponent}
				stateName={'genescapeInitialized'}
				stateInitialiser={stateInitialiser}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

GenescapeViewInitialiser.propTypes = {
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

export const GenescapeView = connect(mapStateToProps)(GenescapeViewInitialiser);