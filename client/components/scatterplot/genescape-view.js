import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterPlotMatrix } from './scatterplot-matrix';
import { GenescapeSidepanel } from './genescape-sidepanel';

import { ViewInitialiser } from '../view-initialiser';

class GenescapeComponent extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;
		const vs = dataset.viewState.row;
		const { ascendingIndices } = vs;
		const {
			selectedPlot,
			plotSettings,
		} = vs.scatterPlots;
		const { attrs } = dataset.row;

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
					plotSettings={plotSettings}
					selectedPlot={selectedPlot}
					indices={ascendingIndices}
					attrs={attrs}
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

export class GenescapeViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={GenescapeComponent}
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