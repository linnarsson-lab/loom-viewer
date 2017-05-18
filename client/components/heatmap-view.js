import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { ViewInitialiser } from './view-initialiser';

import { RemountOnResize } from './remount-on-resize';
import { Canvas } from './canvas';
import { sparkline } from './sparkline';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

import * as _ from 'lodash';

// Just the map+sparklines part
class HeatmapMapComponent extends PureComponent {

	componentWillMount() {
		const { dispatch, dataset } = this.props;
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

	componentDidMount() {
		this.setState({ mounted: true });
	}

	render() {
		const { dataset } = this.props;
		const { col, row } = dataset;
		const hms = dataset.viewState.heatmap;
		if (this.state.mounted) {
			// Calculate the layout of everything, which we can only
			// do after mounting because we rely on the parent node.
			const el = this.refs.heatmapContainer;
			const sparklineHeight = 80 / (window.devicePixelRatio || 1);
			let heatmapWidth = el.clientWidth - sparklineHeight;
			let heatmapHeight = el.clientHeight - sparklineHeight;
			let heatmapSize = {
				display: 'flex',
				flex: '0 0 auto',
				minWidth: `${heatmapWidth}px`,
				maxWidth: `${heatmapWidth}px`,
				minHeight: `${heatmapHeight}px`,
				maxHeight: `${heatmapHeight}px`,
			};
			const { dataBounds } = hms;

			const colAttr = col.attrs[hms.colAttr],
				rowAttr = row.attrs[hms.rowAttr];

			return (
				<div className='view-vertical' ref='heatmapContainer'>
					<Canvas
						width={heatmapWidth}
						height={sparklineHeight}
						paint={sparkline(
							colAttr,
							col.sortedFilterIndices,
							hms.colMode,
							[dataBounds[0], dataBounds[2]],
							colAttr ? colAttr.name : null,
							null,
							true)}
						style={{ marginRight: (sparklineHeight + 'px') }}
						redraw
						clear
					/>
					<div className='view'>
						<div style={heatmapSize}>
							<Heatmap
								dataset={dataset}
								onViewChanged={this.state.onViewChanged} />
						</div>
						<Canvas
							width={sparklineHeight}
							height={heatmapHeight}
							paint={sparkline(
								row.attrs[hms.rowAttr],
								row.sortedFilterIndices,
								hms.rowMode,
								[dataBounds[1], dataBounds[3]],
								rowAttr ? rowAttr.name : null,
								'vertical',
								true)}
							redraw
							clear
						/>
					</div>
				</div >
			);
		} else {
			return (
				<div className='view-vertical' ref='heatmapContainer'>
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

class HeatmapComponent extends PureComponent {

	componentWillMount() {
		this.setState({ heatmapState: this.props.dataset.viewState.heatmap });
	}

	componentWillReceiveProps(nextProps) {
		this.setState({ heatmapState: nextProps.dataset.viewState.heatmap });
	}

	shouldComponentUpdate(nextProps, nextState) {
		const hms = nextState.heatmapState;

		const newAttr = this.props.dataset.col.attrs[hms.colAttr];
		const oldAttr = nextProps.dataset.col.attrs[hms.colAttr];
		// only update if heatmapstate updated, or if
		// a gene that was selected has been fetched
		return !_.isEqual(hms, this.state.heatmapState) ||
			newAttr !== oldAttr;
	}

	render() {
		const { dispatch, dataset } = this.props;
		return (
			<RemountOnResize>
				<div className='view'>
					<div
						style={{
							width: '300px',
							margin: '10px',
							overflowY: 'scroll',
						}}>
						<HeatmapSidepanel
							dataset={dataset}
							dispatch={dispatch}
						/>
					</div>
					<HeatmapMapComponent
						dataset={dataset}
						dispatch={dispatch} />
				</div>
			</RemountOnResize>
		);
	}
}

HeatmapComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise heatmap state for this dataset
	dataBounds: [0, 0, 0, 0], // Data coordinates of the current view
	colAttr: 'Clusters',
	colMode: 'Stacked',
	rowAttr: '_Selected',
	rowMode: 'Stacked',
};

export const HeatmapViewInitialiser = function (props) {
	return (
		<ViewInitialiser
			View={HeatmapComponent}
			stateName={'heatmap'}
			initialState={initialState}
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