import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline'

export class HeatmapView extends Component {
  render() {
	return (
		<div className="container-fluid">
			<div className="row">
				<div className="col-xs-6 col-sm-3">
					<HeatmapSidepanel 
						genesToFind={this.props.heatmapState.genesToFind}
						rowAttrs={this.props.fileInfo.rowAttrs} 
						selectedRowAttr={this.props.heatmapState.selectedRowAttr}
						selectedColAttr={this.props.heatmapState.selectedColAttr}
						selectedRowMode={this.props.heatmapState.selectedRowMode}
						selectedColMode={this.props.heatmapState.selectedColMode}
						colAttrs={this.props.fileInfo.colAttrs}
						onFindGenes={this.props.onFindGenesChanged}
						onRowAttrChange={this.props.onSelectedRowAttrChange}
						onColAttrChange={this.props.onSelectedColAttrChange}
						onRowModeChange={this.props.onSelectedRowModeChange}
						onColModeChange={this.props.onSelectedColModeChange}
					/>
				</div>
				<div className="col-xs-12 col-sm-9 no-line-space">
					<Sparkline 
						orientation="horizontal"
						width={600}
						height={80}
						data={this.props.fileInfo.colAttrs[this.props.heatmapState.selectedColAttr]}
						dataRange={[this.props.heatmapState.dataBounds[0],this.props.heatmapState.dataBounds[2]]}
						screenRange={[this.props.heatmapState.screenBounds[0],this.props.heatmapState.screenBounds[2]]}
						mode={this.props.heatmapState.selectedColMode}
					/>					
					<Heatmap
						zoom={this.props.heatmapState.zoom}
						center={this.props.heatmapState.center}
						shape={this.props.fileInfo.shape}
						zoomRange={this.props.fileInfo.zoomRange}
						fullZoomWidth={this.props.fileInfo.fullZoomWidth}
						fullZoomHeight={this.props.fileInfo.fullZoomHeight}
						onViewChanged={this.props.onHeatmapBoundsChanged}
					/>
					<Sparkline 
						orientation="vertical"
						width={80}
						height={600}
						data={this.props.fileInfo.rowAttrs[this.props.heatmapState.selectedRowAttr]}
						dataRange={[this.props.heatmapState.dataBounds[1],this.props.heatmapState.dataBounds[3]]}
						screenRange={[this.props.heatmapState.screenBounds[1],this.props.heatmapState.screenBounds[3]]}
						mode={this.props.heatmapState.selectedRowMode}
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
	onHeatmapBoundsChanged: PropTypes.func.isRequired,
	onFindGenesChanged: PropTypes.func.isRequired,
	onSelectedRowAttrChange: 	PropTypes.func,
	onSelectedColAttrChange: 	PropTypes.func,
	onSelectedRowModeChange: 	PropTypes.func,
	onSelectedColModeChange: 	PropTypes.func
}
