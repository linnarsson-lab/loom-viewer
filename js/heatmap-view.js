import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline';
import * as _ from 'lodash';

export class HeatmapView extends Component {
	render() {
		const { dispatch, dataState, heatmapState, viewState } = this.props;

		let colData = [];
		if (heatmapState.colAttr === "(gene)") {
			if (dataState.genes.hasOwnProperty(heatmapState.colGene)) {
				colData = dataState.genes[heatmapState.colGene];
			}
		} else {
			colData = dataState.currentDataset.colAttrs[heatmapState.colAttr];
		}

		let rowData = dataState.currentDataset.rowAttrs[heatmapState.rowAttr];
		if (heatmapState.rowAttr === '(gene positions)') {
			const genes = heatmapState.rowGenes.trim().split(/[ ,\r\n]+/);
			rowData = _.map(dataState.currentDataset.rowAttrs["Gene"], (x) => { return _.indexOf(genes, x) !== -1 ? x : ''; });
		}

		// Calculate the layout of everything
		let heatmapWidth = viewState.width - 350;
		let heatmapHeight = viewState.height - 40;
		let verticalSparklineWidth = 20;
		if (heatmapState.rowMode === 'Text' || heatmapState.rowMode === 'TexAlways') {
			heatmapWidth = viewState.width - 450;
			verticalSparklineWidth = 120;
		}
		let horizontalSparklineHeight = 20;
		if (heatmapState.colMode === 'Text') {
			horizontalSparklineHeight = 120;
			heatmapHeight = viewState.height - 140;
		}
		return (
			<div className='view'>
				<div className='view-sidepanel'>
					<HeatmapSidepanel
						heatmapState={heatmapState}
						dataState={dataState}
						dispatch={dispatch}
						/>
				</div>
				<div className='view-main'>
					<Sparkline
						orientation='horizontal'
						width={heatmapWidth}
						height={horizontalSparklineHeight}
						data={colData}
						dataRange={[heatmapState.dataBounds[0], heatmapState.dataBounds[2]]}
						screenRange={[heatmapState.screenBounds[0], heatmapState.screenBounds[2]]}
						mode={heatmapState.colMode}
						/>
					<Heatmap
						transcriptome={dataState.currentDataset.transcriptome}
						project={dataState.currentDataset.project}
						dataset={dataState.currentDataset.dataset}
						width={heatmapWidth}
						height={heatmapHeight}
						zoom={heatmapState.zoom}
						center={heatmapState.center}
						shape={dataState.currentDataset.shape}
						zoomRange={dataState.currentDataset.zoomRange}
						fullZoomWidth={dataState.currentDataset.fullZoomWidth}
						fullZoomHeight={dataState.currentDataset.fullZoomHeight}
						onViewChanged={
							(bounds) => {
								dispatch({
									type: 'SET_HEATMAP_PROPS',
									screenBounds: bounds.screenBounds,
									dataBounds: bounds.dataBounds,
									center: bounds.center,
									zoom: bounds.zoom,
								});
							}
						} />
					<Sparkline
						orientation='vertical'
						width={verticalSparklineWidth}
						height={heatmapHeight}
						data={rowData}
						dataRange={[heatmapState.dataBounds[1], heatmapState.dataBounds[3]]}
						screenRange={[heatmapState.screenBounds[1], heatmapState.screenBounds[3]]}
						mode={heatmapState.rowAttr === '(gene positions)' ? 'TextAlways' : heatmapState.rowMode}
						/>
				</div>
			</div>
		);
	}
}
HeatmapView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	heatmapState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};
