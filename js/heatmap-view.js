import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline'
import * as _ from 'lodash';

export class HeatmapView extends Component {
  render() {
	var dispatch = this.props.dispatch;
	var ds = this.props.dataState;
	var hs = this.props.heatmapState;
	var vs = this.props.viewState;

	var colData = [];
	if(hs.colAttr == "(gene)") {
		if(ds.genes.hasOwnProperty(hs.colGene)) {
			colData = ds.genes[hs.colGene];	
		} 
	} else {
		colData = ds.currentDataset.colAttrs[hs.colAttr];
	}

	var rowData = ds.currentDataset.rowAttrs[hs.rowAttr]
	if(hs.rowAttr == "(gene positions)") {
		var genes = hs.rowGenes.trim().split(/[ ,\r\n]+/);
		rowData = _.map(ds.currentDataset.rowAttrs["Gene"],(x)=>(_.indexOf(genes, x) != -1 ? x : ""));
	}

	// Calculate the layout of everything
	var heatmapWidth = vs.width - 350;
	var heatmapHeight = vs.height - 40;
	var verticalSparklineWidth = 20;
	if(hs.rowMode == "Text" || hs.rowMode == "TexAlways") {
		heatmapWidth = vs.width - 450;
		verticalSparklineWidth = 120;
	}
	var horizontalSparklineHeight = 20;
	if(hs.colMode == "Text") {
		horizontalSparklineHeight = 120;
		heatmapHeight = vs.height - 140;
	}
	return (
		<div className="view">
			<div className="view-sidepanel">
				<HeatmapSidepanel 
					heatmapState={hs}
					dataState={ds}
					dispatch={dispatch}
				/>
			</div>
			<div className="view-main">
				<Sparkline 
					orientation="horizontal"
					width={heatmapWidth}
					height={horizontalSparklineHeight}
					data={colData}
					dataRange={[hs.dataBounds[0],hs.dataBounds[2]]}
					screenRange={[hs.screenBounds[0],hs.screenBounds[2]]}
					mode={hs.colMode}
					/>					
				<Heatmap
					transcriptome={ds.currentDataset.transcriptome}
					project={ds.currentDataset.project}
					dataset={ds.currentDataset.dataset}
					width={heatmapWidth}
					height={heatmapHeight}
					zoom={hs.zoom}
					center={hs.center}
					shape={ds.currentDataset.shape}
					zoomRange={ds.currentDataset.zoomRange}
					fullZoomWidth={ds.currentDataset.fullZoomWidth}
					fullZoomHeight={ds.currentDataset.fullZoomHeight}
					onViewChanged={(bounds)=>dispatch({ 
						type: 'SET_HEATMAP_PROPS', 
						screenBounds: bounds.screenBounds,
						dataBounds: bounds.dataBounds,
						center: bounds.center,
						zoom: bounds.zoom
					})}
				/>
				<Sparkline 
					orientation="vertical"
					width={verticalSparklineWidth}
					height={heatmapHeight}
					data={rowData}
					dataRange={[hs.dataBounds[1],hs.dataBounds[3]]}
					screenRange={[hs.screenBounds[1],hs.screenBounds[3]]}
					mode={hs.rowAttr == "(gene positions)" ? "TextAlways" : hs.rowMode}
				/>
			</div>
		</div>
	)
  }
}
HeatmapView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	heatmapState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}
