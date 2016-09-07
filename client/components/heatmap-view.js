import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline';
import { RemountOnResize } from './remount-on-resize';
import * as _ from 'lodash';
import { FetchDatasetComponent } from './fetch-dataset';

class HeatmapViewComponent extends Component {
	componentDidMount() {
		this.setState({ mounted: true });
	}

	render() {
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


			const { dispatch, dataSet, fetchedGenes, heatmapState } = this.props;
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
											dataBounds,
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
			return <div className='view-vertical' ref='heatmapContainer' />;
		}
	}
}

HeatmapViewComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	fetchedGenes: PropTypes.object.isRequired,
	heatmapState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const HeatmapViewContainer = function (props) {
	const { dispatch, data, heatmapState, params } = props;
	const { project, dataset } = params;
	const dataSet = data.dataSets[dataset];
	return (dataSet === undefined ?
		<FetchDatasetComponent
			dispatch={dispatch}
			dataSets={data.dataSets}
			dataset={dataset}
			project={project} />
		:

		<div className='view'>
			<div className='sidepanel'>
				<HeatmapSidepanel
					heatmapState={heatmapState}
					dataSet={dataSet}
					fetchedGenes={data.fetchedGenes}
					dispatch={dispatch}
					/>
			</div>
			<RemountOnResize
			/* Leaflet's canvas interferes with CSS layouting,
			so we unmount and remount it on resize events */
			>
				<HeatmapViewComponent
					heatmapState={heatmapState}
					dataSet={dataSet}
					fetchedGenes={data.fetchedGenes}
					dispatch={dispatch} />
			</RemountOnResize>
		</div>
	);
};

HeatmapViewContainer.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	heatmapState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect HeatmapViewContainer to store
import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		heatmapState: state.heatmapState,
		data: state.data,
	};
};

export const HeatmapView = connect(mapStateToProps)(HeatmapViewContainer);

