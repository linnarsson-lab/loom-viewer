import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { SparklineList } from './sparklines';

import { ViewInitialiser } from '../view-initialiser';

import { merge } from '../../js/util';

class SparklineViewComponent extends PureComponent {

	render() {
		const { dispatch, dataset } = this.props;
		const { col } = dataset;
		const sl = dataset.viewState.sparkline;
		const {
			indices,
			scatterPlots,
		} = dataset.viewState.col;
		// The old column attribute values that we displayed in the "legend"
		let legendData = col.attrs[sl.colAttr];
		// if colAttr does not exist (for example, the default values
		// in the Loom interface is not present), pick the first column
		if (legendData === undefined) {
			legendData = col.attrs[col.keys[0]];
		}

		const scatterPlotSettings = scatterPlots.plotSettings[0];
		return (
			<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
				<SparklineSidepanel
					dispatch={dispatch}
					dataset={dataset}
					style={{
						overflowX: 'hidden',
						overFlowY: 'hidden',
						minHeight: 0,
						width: '300px',
						margin: '10px',
					}}
				/>
				<SparklineList
					attrs={dataset.col.attrs}
					selection={sl.genes}
					groupAttr={sl.groupBy ? sl.colAttr : ''}
					indices={indices}
					geneMode={sl.geneMode}
					col={col}
					colAttr={sl.colAttr}
					colMode={sl.colMode}
					path={dataset.path}
					settings={scatterPlotSettings}
					showLabels={sl.showLabels} />
			</div>
		);
	}
}


SparklineViewComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

export class SparklineViewInitialiser extends PureComponent {
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
