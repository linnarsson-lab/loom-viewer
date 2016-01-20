import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { SparklineSidepanel } from './sparkline-sidepanel';
import { Sparkline } from './sparkline'

export class SparklineView extends Component {
  render() {
  	var colData = this.props.fileInfo.colAttrs[this.props.sparklineState.colAttr];
	return (
		<div className="container-fluid">
			<div className="row">
				<div className="col-xs-6 col-sm-3">
					<SparklineSidepanel 
						colAttrs={this.props.fileInfo.colAttrs}
						genesToFind={this.props.sparklineState.genesToFind}
						colAttr={this.props.sparklineState.colAttr}
						colMode={this.props.sparklineState.colMode}
						colorByAttr={this.props.sparklineState.colorByAttr}
						colorByMode={this.props.sparklineState.colorByMode}
						orderByAttr={this.props.sparklineState.orderByAttr}

						onFindGenesChange={this.props.onFindGenesChange}
						onColAttrChange={this.props.onColAttrChange}
						onColModeChange={this.props.onColModeChange}
						onColorByAttrChange={this.props.onColorByAttrChange}
						onOrderByAttrChange={this.props.onOrderByAttrChange}
						onColorByModeChange={this.props.onColorByModeChange}
					/>
				</div>
				<div className="col-xs-12 col-sm-9 no-line-space">
					{/* We're borrowing the Leaflet zoom buttons */}
				  	<div className="leaflet-top leaflet-left">
						<div className="leaflet-control-zoom leaflet-bar leaflet-control">
							<a className="leaflet-control-zoom-in" title="Zoom in">+</a>
							<a className="leaflet-control-zoom-out leaflet-disabled" title="Zoom out">-</a>
						</div>
					</div>				
					<Sparkline 
						orientation="horizontal"
						width={600}
						height={20}
						data={colData}
						dataRange={[0, colData.length]}
						screenRange={[0,600]}
						mode={this.props.sparklineState.colMode}
					/>
{/*}					<Sparkline 
						orientation="horizontal"
						width={600}
						height={40}
						data={this.props.fileInfo.rowAttrs[this.props.heatmapState.selectedRowAttr]}
						dataRange={[this.props.heatmapState.dataBounds[1],this.props.heatmapState.dataBounds[3]]}
						screenRange={[0,600]}
						mode={this.props.heatmapState.selectedRowMode}
					/>
*/}				</div>
			</div>
		</div>
	)
  }
}

SparklineView.propTypes = {
	dataState: 				PropTypes.object.isRequired,
	sparklineState: 		PropTypes.object.isRequired,
	fileInfo: 				PropTypes.object.isRequired,

	onFindGenesChange: 		PropTypes.func.isRequired,
	onColAttrChange: 		PropTypes.func.isRequired,
	onColModeChange: 		PropTypes.func.isRequired,
	onColorByAttrChange: 	PropTypes.func.isRequired,
	onColorByModeChange: 	PropTypes.func.isRequired,
	onOrderByAttrChange: 	PropTypes.func.isRequired
}
