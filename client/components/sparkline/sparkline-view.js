import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { SparklineList } from './sparklines';

import { ViewInitialiser } from '../view-initialiser';

const containerStyle = {
	overflowX: 'hidden',
	minHeight: 0,
};

const sidepanelStyle = {
	overflowX: 'hidden',
	overflowY: 'hidden',
	minHeight: 0,
	width: '300px',
	margin: '10px',
};

class SparklineViewComponent extends Component {
	render() {
		const {
			dispatch,
			dataset,
		} = this.props;
		const { col } = dataset;
		const { sparkline } = dataset.viewState;
		const {
			indices,
			scatterPlots,
		} = dataset.viewState.col;

		const scatterPlotSettings = scatterPlots.plotSettings[0];
		return (
			<div className='view' style={containerStyle}>
				<SparklineSidepanel
					dispatch={dispatch}
					dataset={dataset}
					style={sidepanelStyle}
				/>
				<SparklineList
					attrs={dataset.col.attrs}
					selection={sparkline.genes}
					groupAttr={sparkline.groupBy ? sparkline.colAttr : ''}
					indices={indices}
					geneMode={sparkline.geneMode}
					col={col}
					colAttr={sparkline.colAttr}
					colMode={sparkline.colMode}
					path={dataset.path}
					settings={scatterPlotSettings}
					showLabels={sparkline.showLabels} />
			</div>
		);
	}
}


SparklineViewComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

export class SparklineViewInitialiser extends Component {
	render() {
		return (
			<ViewInitialiser
				View={SparklineViewComponent}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

SparklineViewInitialiser.propTypes = {
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

export const SparklineView = connect(mapStateToProps)(SparklineViewInitialiser);
