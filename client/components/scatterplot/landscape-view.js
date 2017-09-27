import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterPlotMatrix } from './scatterplot-matrix';
import { LandscapeSidepanel } from './landscape-sidepanel';

import { ViewInitialiser } from '../view-initialiser';

class LandscapeComponent extends PureComponent {
	render() {
		const {
			dispatch,
			dataset,
		} = this.props;
		const {
			ascendingIndices,
			scatterPlots,
		} = dataset.viewState.col;
		const {
			selectedPlot,
			totalPlots,
			plotSettings,
		} = scatterPlots;
		const { attrs } = dataset.col;

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
					attrs={attrs}
					axis={'col'}
					dataset={dataset}
					dispatch={dispatch}
					plotSettings={plotSettings}
					selectedPlot={selectedPlot}
					totalPlots={totalPlots}
					indices={ascendingIndices}
				/>
			</div>
		);
	}
}

LandscapeComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

export class LandscapeViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={LandscapeComponent}
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