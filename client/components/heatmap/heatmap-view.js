import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Heatmap } from 'components/heatmap/heatmap';
import { HeatmapSidepanel } from 'components/heatmap/heatmap-sidepanel';

import { ViewInitialiser } from 'components/view-initialiser';
import { Canvas } from 'components/canvas';
import { Remount } from 'components/remount';

import { sparkline } from 'plotters/sparkline';

import { UPDATE_VIEWSTATE } from 'actions/action-types';

import { debounce } from 'lodash';

import { merge } from 'js/util';

// Just the map+sparklines part
class MapComponent extends Component {

	constructor(...args) {
		super(...args);
		this.mountContainer = this.mountContainer.bind(this);
		this.onViewChanged = debounce(this.onViewChanged.bind(this), 50);
		this.state = {};
	}

	mountContainer(el){
		if (el) {
			const sparklineHeight = 80 / (window.devicePixelRatio || 1) | 0;
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
			const newState = {
				heatmapContainer: el,
				sparklineHeight,
				heatmapWidth,
				heatmapHeight,
				heatmapStyle,
			};
			this.setState(() => {
				return newState;
			});
		}
	}

	onViewChanged(val){
		const {
			dataset,
			dispatch,
		} = this.props;
		const {
			dataBounds,
			zoom,
			center,
		} = val;
		dispatch({
			type: UPDATE_VIEWSTATE,
			stateName: 'heatmap',
			path: dataset.path,
			viewState: {
				heatmap: {
					dataBounds,
					zoom,
					center,
				},
			},
		});
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
			// do after mounting, because we rely on the parent node.
			const {
				dataset,
			} = this.props;
			const {
				col,
				row,
			} = dataset;
			const vs = dataset.viewState;
			const hms = vs.heatmap;
			const { dataBounds } = hms;

			const colPlotSetting = vs.col.scatterPlots.plotSettings[0];
			const rowPlotSetting = vs.row.scatterPlots.plotSettings[0];

			const colAttr = col.attrs[colPlotSetting.colorAttr];
			const colLabel = colAttr ?
				colAttr.name :
				null;
			const colSettings = merge(
				colPlotSetting,
				{
					dataRange: [
						dataBounds[0],
						dataBounds[2],
					],
				}
			);

			const colSparkline = sparkline(colAttr, vs.col.originalIndices, colPlotSetting.colorMode, colSettings, colLabel);

			const rowAttr = row.attrs[rowPlotSetting.colorAttr];
			const rowLabel = rowAttr ?
				rowAttr.name :
				null;
			const rowSettings = merge(
				vs.row.settings,
				{
					dataRange: [
						dataBounds[1],
						dataBounds[3],
					],
					orientation: 'vertical',
				}
			);
			const rowSparkline = sparkline(rowAttr, vs.row.originalIndices, rowPlotSetting.colorMode, rowSettings, rowLabel);
			return (
				<div className='view-vertical' ref={this.mountContainer}>
					<Canvas
						width={heatmapWidth}
						height={sparklineHeight}
						paint={colSparkline}
						style={{ marginRight: (sparklineHeight + 'px') }}
					/>
					<div className='view'>
						<div style={heatmapStyle}>
							<Heatmap
								dataset={dataset}
								onViewChanged={this.onViewChanged} />
						</div>
						<Canvas
							width={sparklineHeight}
							height={heatmapHeight}
							paint={rowSparkline}
						/>
					</div>
				</div >
			);
		} else {
			return (
				<div className='view-vertical' ref={this.mountContainer}>
					Initialising Heatmap Settings
				</div>
			);
		}
	}
}

MapComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class HeatmapComponent extends Component {
	render() {
		const {
			dispatch,
			dataset,
		} = this.props;

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
				<Remount>
					<MapComponent
						dataset={dataset}
						dispatch={dispatch} />
				</Remount>
			</div>
		);
	}
}

HeatmapComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

export const HeatmapViewInitialiser = function (props) {
	return (
		<ViewInitialiser
			View={HeatmapComponent}
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
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-Component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		datasets: state.datasets.list,
	};
};

export const HeatmapView = connect(mapStateToProps)(HeatmapViewInitialiser);