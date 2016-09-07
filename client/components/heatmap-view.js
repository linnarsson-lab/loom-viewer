import React, { Component, PropTypes } from 'react';

import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline';
import { RemountOnResize } from './remount-on-resize';
import { FetchDatasetComponent } from './fetch-dataset';

import { SET_HEATMAP_PROPS } from '../actions/actionTypes';

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

			const colData = colGeneSelected ?
				fetchedGenes[heatmapState.colGene]
				:
				dataSet.colAttrs[heatmapState.colAttr];

			let rowData = dataSet.rowAttrs[heatmapState.rowAttr];
			if (heatmapState.rowAttr === '(gene positions)') {
				const shownGenes = heatmapState.rowGenes.trim().split(/[ ,\r\n]+/);
				const allGenes = dataSet.rowAttrs['Gene'];
				rowData = new Array(allGenes.length);
				for (let i = 0; i < allGenes.length; i++) {
					rowData[i] = _.indexOf(allGenes, shownGenes[i]) === -1 ? '' : `${allGenes[i]}`;
				}
			}

			return (
				<div className='view-vertical' ref='heatmapContainer'>
					<Sparkline
						orientation='horizontal'
						width={heatmapWidth}
						height={sparklineHeight}
						data={colData}
						dataRange={[dataBounds[0], dataBounds[2]]}
						mode={heatmapState.colMode}
						style={{ marginRight: (sparklineHeight + 'px') }}
						/>
					<div className='view'>
						<div style={heatmapSize}>
							<Heatmap
								transcriptome={dataSet.transcriptome}
								project={dataSet.project}
								dataset={dataSet.dataset}
								shape={dataSet.shape}
								zoomRange={dataSet.zoomRange}
								fullZoomWidth={dataSet.fullZoomWidth}
								fullZoomHeight={dataSet.fullZoomHeight}
								onViewChanged={
									(dataBounds) => {
										dispatch({
											type: 'SET_HEATMAP_PROPS',
											datasetName: dataSet.dataset,
											heatmapState: { dataBounds },
										});
									}
								} />
						</div>
						<Sparkline
							orientation='vertical'
							width={sparklineHeight}
							height={heatmapHeight}
							data={rowData}
							dataRange={[dataBounds[1], dataBounds[3]]}
							mode={heatmapState.rowAttr === '(gene positions)' ? 'TextAlways' : heatmapState.rowMode}
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


class HeatmapStateInitialiser extends Component {

	componentWillMount() {
		const { dispatch, dataSet } = this.props;
		if (!dataSet.heatmapState) {
			// Initialise heatmapState for this dataset
			dispatch({
				type: SET_HEATMAP_PROPS,
				datasetName: dataSet.dataset,
				heatmapState: {
					dataBounds: [0, 0, 0, 0], // Data coordinates of the current view
					rowAttr: dataSet.rowAttrs[0],
					rowMode: 'Text',
					rowGenes: '',
					colAttr: dataSet.colAttrs[0],
					colMode: 'Text',
					colGene: '',
				},
			});
		}
	}

	render() {
		const { dispatch, dataSet } = this.props;
		return dataSet.heatmapState ? (
			<HeatmapComponent
				dispatch={dispatch}
				dataSet={dataSet}
				/>
		) : <div className='view'>Initialising Heatmap Settings</div>;
	}
}

HeatmapStateInitialiser.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};


const HeatmapDatasetFetcher = function (props) {
	const { dispatch, data, params } = props;
	const { dataset, project } = params;
	const dataSet = data.dataSets[dataset];
	return (dataSet === undefined ? (
		<FetchDatasetComponent
			dispatch={dispatch}
			dataSets={data.dataSets}
			dataset={dataset}
			project={project} />
	) : <HeatmapStateInitialiser
			dispatch={dispatch}
			dataSet={dataSet} />
	);
};

HeatmapDatasetFetcher.propTypes = {
			// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
			// Passed down by react-redux
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect HeatmapDatasetFetcher to store
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

export const HeatmapView = connect(mapStateToProps)(HeatmapDatasetFetcher);
