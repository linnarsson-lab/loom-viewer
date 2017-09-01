import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';

import { ViewInitialiser } from '../view-initialiser';
import { Canvas } from '../canvas';

import { sparkline } from '../../plotters/sparkline';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

import * as _ from 'lodash';

import { merge, firstMatch } from '../../js/util';

// Just the map+sparklines part
class HeatmapMapComponent extends Component {

	componentWillMount() {
		const { dispatch, dataset } = this.props;

		this.heatmapContainer = this.heatmapContainer.bind(this);

		const onViewChanged = _.debounce(
			(val) => {
				const { dataBounds, zoom, center } = val;
				dispatch({
					type: SET_VIEW_PROPS,
					stateName: 'heatmap',
					path: dataset.path,
					viewState: { heatmap: { dataBounds, zoom, center } },
				});
			},
			50
		);
		this.setState({ onViewChanged });
	}

	heatmapContainer(heatmapContainer) {
		const el = heatmapContainer;
		if (heatmapContainer) {
			const sparklineHeight = 80 / (window.devicePixelRatio || 1);
			let heatmapWidth = el.clientWidth - sparklineHeight - 20;
			let heatmapHeight = el.clientHeight - sparklineHeight - 20;
			const heatmapStyle = {
				display: 'flex',
				flex: '0 0 auto',
				minWidth: `${heatmapWidth}px`,
				maxWidth: `${heatmapWidth}px`,
				minHeight: `${heatmapHeight}px`,
				maxHeight: `${heatmapHeight}px`,
			};
			this.setState({
				heatmapContainer,
				sparklineHeight,
				heatmapWidth,
				heatmapHeight,
				heatmapStyle,
			});
		}
	}
	render() {
		const {
			heatmapContainer,
			sparklineHeight,
			heatmapWidth,
			heatmapHeight,
			heatmapStyle,
		} = this.state;

		if (heatmapContainer) {
			// Calculate the layout of everything, which we can only
			// do after mounting because we rely on the parent node.
			const { dataset } = this.props;
			const { col, row } = dataset;
			const vs = dataset.viewState;
			const hms = vs.heatmap;
			const { dataBounds } = hms;


			const colAttr = col.attrs[hms.colAttr];
			const colLabel = colAttr ? colAttr.name : null;
			const colSettings = merge(
				vs.col.settings,
				{
					dataRange: [dataBounds[0], dataBounds[2]],
				}
			);

			const colSparkline = sparkline(colAttr, vs.col.originalIndices, hms.colMode, colSettings, colLabel);

			const rowAttr = row.attrs[hms.rowAttr];
			const rowLabel = rowAttr ? rowAttr.name : null;
			const rowSettings = merge(
				vs.row.settings,
				{
					dataRange: [dataBounds[1], dataBounds[3]],
					orientation: 'vertical',
				}
			);
			const rowSparkline = sparkline(rowAttr, vs.row.originalIndices, hms.rowMode, rowSettings, rowLabel);
			return (
				<div className='view-vertical' ref={this.heatmapContainer}>
					<Canvas
						width={heatmapWidth}
						height={sparklineHeight}
						paint={colSparkline}
						style={{ marginRight: (sparklineHeight + 'px') }}
						redraw
						clear
					/>
					<div className='view'>
						<div style={heatmapStyle}>
							<Heatmap
								dataset={dataset}
								onViewChanged={this.state.onViewChanged} />
						</div>
						<Canvas
							width={sparklineHeight}
							height={heatmapHeight}
							paint={rowSparkline}
							redraw
							clear
						/>
					</div>
				</div >
			);
		} else {
			return (
				<div className='view-vertical' ref={this.heatmapContainer}>
					Initialising Heatmap Settings
				</div>
			);
		}
	}
}

HeatmapMapComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class HeatmapComponent extends Component {
	render() {
		const { dispatch, dataset } = this.props;
		return (
			<div className='view'>
				<HeatmapSidepanel
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
				<HeatmapMapComponent
					dataset={dataset}
					dispatch={dispatch} />
			</div>
		);
	}
}

HeatmapComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

function stateInitialiser(dataset) {
	return { // Initialise heatmap state for this dataset
		heatmap: {
			dataBounds: [0, 0, 0, 0], // Data coordinates of the current view
			colAttr: firstMatch(dataset.col.attrs, ['Clusters', 'Class', '_KMeans_10']),
			colMode: 'Stacked',
			rowAttr: firstMatch(dataset.row.attrs, ['_Selected', '_Excluded']),
			rowMode: 'Stacked',
			zoom: 8,
		},
		col: {
			settings: {
				scaleFactor: 40,
				lowerBound: 0,
				upperBound: 100,
				logScale: true,
				clip: false,
			},
		},
		row: {
			settings: {
				scaleFactor: 40,
				lowerBound: 0,
				upperBound: 100,
				logScale: true,
				clip: false,
			},
		},
	};
}

export const HeatmapViewInitialiser = function (props) {
	return (
		<ViewInitialiser
			View={HeatmapComponent}
			stateName={'heatmap'}
			stateInitialiser={stateInitialiser}
			dispatch={props.dispatch}
			params={props.params}
			datasets={props.datasets} />
	);
};

HeatmapViewInitialiser.propTypes = {
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

export const HeatmapView = connect(mapStateToProps)(HeatmapViewInitialiser);