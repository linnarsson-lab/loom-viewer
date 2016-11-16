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
		const { dispatch, dataSet } = this.props;
		const { fetchedGenes, heatmapState } = dataSet;
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
			const { dataBounds } = heatmapState;

			const colGeneSelected = (heatmapState.colAttr === '(gene)') &&
				fetchedGenes.hasOwnProperty(heatmapState.colGene);

			const colData = colGeneSelected ? fetchedGenes[heatmapState.colGene]
				: dataSet.colAttrs[heatmapState.colAttr];

			let rowData = dataSet.rowAttrs[heatmapState.rowAttr];
			if (heatmapState.rowAttr === '(gene positions)') {
				const shownGenes = heatmapState.rowGenes.trim().split(/[ ,\r\n]+/);
				const allGenes = dataSet.rowAttrs['Gene'];
				rowData = new Array(allGenes.length);
				for (let i = 0; i < allGenes.length; i++) {
					rowData[i] = _.indexOf(allGenes, shownGenes[i]) === -1 ? '' : `${allGenes[i]}`;
				}
			}
			const rowMode = (heatmapState.rowAttr === '(gene positions)') ?
				'TextAlways' : heatmapState.rowMode;

			return (
				<div className='view-vertical' ref='heatmapContainer'>
					<Canvas
						width={heatmapWidth}
						height={sparklineHeight}
						paint={
							sparkline(colData, heatmapState.colMode, [dataBounds[0], dataBounds[2]], null, null, true)
						}
						style={{ marginRight: (sparklineHeight + 'px') }}
						redraw
						clear
						/>
					<div className='view'>
						<div style={heatmapSize}>
							<Heatmap
								dataSet={dataSet}
								onViewChanged={
									(val) => {
										const { dataBounds, zoom, center } = val;
										dispatch({
											type: SET_VIEW_PROPS,
											viewStateName: 'heatmapState',
											datasetName: dataSet.dataset,
											viewState: { dataBounds, zoom, center },
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
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const HeatmapComponent = function (props) {
	const { dataSet, dispatch } = props;
	return (
		<div className='view'>
			<div className='sidepanel'>
				<HeatmapSidepanel
					dataSet={dataSet}
					dispatch={dispatch}
					/>
			</div>
			<RemountOnResize
				/* Leaflet's canvas interferes with CSS layouting,
				so we unmount and remount it on resize events */
				>
				<HeatmapMapComponent
					dataSet={dataSet}
					dispatch={dispatch} />
			</RemountOnResize>
		</div>
	);
};

HeatmapComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise heatmapState for this dataset
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
			viewStateName={'heatmapState'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			data={props.data} />
	);
};

HeatmapViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		data: state.data,
	};
};

export const HeatmapView = connect(mapStateToProps)(HeatmapViewInitialiser);