import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline'
import * as _ from 'lodash';

export class HeatmapView extends Component {
  render() {
	var dispatch = this.props.dispatch;
	var fi = this.props.fileInfo;
	var hs = this.props.heatmapState;
	var rowData = fi.rowAttrs[hs.rowAttr]
	if(hs.rowAttr == "(gene positions)") {
		var genes = hs.rowGenes.split(' ');
		rowData = _.map(fi.rowAttrs["Gene"],(x)=>(_.indexOf(genes, x) != -1 ? x : ""));
	}
	return (

		<div className="container-fluid">
			<div className="row">
				<div className="col-xs-6 col-sm-3">
					<HeatmapSidepanel 
						fileInfo={fi}
						heatmapState={hs}
						dispatch={dispatch}
					/>
				</div>
				<div className="col-xs-12 col-sm-9 no-line-space">
					<Sparkline 
						orientation="horizontal"
						width={600}
						height={20}
						data={fi.colAttrs[hs.colAttr]}
						dataRange={[hs.dataBounds[0],hs.dataBounds[2]]}
						screenRange={[hs.screenBounds[0],hs.screenBounds[2]]}
						mode={hs.colMode}
					/>					
					<Heatmap
						zoom={hs.zoom}
						center={hs.center}
						shape={fi.shape}
						zoomRange={fi.zoomRange}
						fullZoomWidth={fi.fullZoomWidth}
						fullZoomHeight={fi.fullZoomHeight}
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
						width={120}
						height={600}
						data={rowData}
						dataRange={[hs.dataBounds[1],hs.dataBounds[3]]}
						screenRange={[hs.screenBounds[1],hs.screenBounds[3]]}
						mode={hs.rowAttr == "(gene positions)" ? "TextAlways" : hs.rowMode}
					/>
				</div>
			</div>
		</div>
	)
  }
}
HeatmapView.propTypes = {
	dataState: PropTypes.object.isRequired,
	heatmapState: PropTypes.object.isRequired,
	fileInfo: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}
