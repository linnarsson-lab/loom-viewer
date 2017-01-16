import React, { Component, PropTypes } from 'react';

import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { ViewInitialiser } from './view-initialiser';

import { RemountOnResize } from './remount-on-resize';
import { Canvas } from './canvas';
import { sparkline } from './sparkline';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

import * as _ from 'lodash';

// Just the map+sparklines part
class HeatmapMapComponent extends Component {

	componentDidMount() {
		this.setState({ mounted: true });
	}

	render() {
		const { dispatch, dataset } = this.props;
		const { col, row } = dataset;
		const hms = dataset.viewState.heatmap;
		if (this.state) {
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

			const colGeneSelected = (hms.colAttr === '(gene)') &&
				col.attrs.hasOwnProperty(hms.colGene);

			const colData = colGeneSelected ? col.attrs[hms.colGene]
				: col.attrs[hms.colAttr];

			let rowData = row.attrs[hms.rowAttr];
			if (hms.rowAttr === '(gene positions)') {
				const shownGenes = hms.rowGenes.trim().split(/[ ,\r\n]+/);
				const allGenes = row.attrs['Gene'];
				rowData = new Array(allGenes.length);
				for (let i = 0; i < allGenes.length; i++) {
					rowData[i] = _.indexOf(allGenes, shownGenes[i]) === -1 ? '' : `${allGenes[i]}`;
				}
			}
			const rowMode = (hms.rowAttr === '(gene positions)') ?
				'TextAlways' : hms.rowMode;

			return (
				<div className='view-vertical' ref='heatmapContainer'>
					<Canvas
						width={heatmapWidth}
						height={sparklineHeight}
						paint={
							sparkline(colData, hms.colMode, [dataBounds[0], dataBounds[2]], null, null, true)
						}
						style={{ marginRight: (sparklineHeight + 'px') }}
						redraw
						clear
						/>
					<div className='view'>
						<div style={heatmapSize}>
							<Heatmap
								dataset={dataset}
								onViewChanged={
									(val) => {
										const { dataBounds, zoom, center } = val;
										dispatch({
											type: SET_VIEW_PROPS,
											stateName: 'heatmap',
											path: dataset.path,
											viewState: { heatmap: { dataBounds, zoom, center } },
										});
									}
								} />
						</div>
						<Canvas
							width={sparklineHeight}
							height={heatmapHeight}
							paint={sparkline(
								rowData,
								rowMode,
								[dataBounds[1], dataBounds[3]],
								null,
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

const HeatmapComponent = function (props) {
	const { dispatch, dataset } = props;
	return (
		<div className='view'>
			<div className='sidepanel'>
				<HeatmapSidepanel
					dataset={dataset}
					dispatch={dispatch}
					/>
			</div>
			<RemountOnResize
				/* Leaflet's canvas interferes with CSS layouting,
				so we unmount and remount it on resize events */
				>
				<HeatmapMapComponent
					dataset={dataset}
					dispatch={dispatch} />
			</RemountOnResize>
		</div>
	);
};

HeatmapComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise heatmap state for this dataset
	dataBounds: [0, 0, 0, 0], // Data coordinates of the current view
	rowMode: 'Text',
	rowGenes: '',
	colMode: 'Text',
	colGene: '',
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