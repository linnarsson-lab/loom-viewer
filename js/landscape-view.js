import React, { Component, PropTypes } from 'react';
import { LandscapeSidepanel } from './landscape-sidepanel';
import { Scatterplot } from './scatterplot';

export class LandscapeView extends Component {
	makeData(attr, gene) {
		var data = [];
		if(attr == "(gene)") {
			if(this.props.dataState.genes.hasOwnProperty(gene)) {
				data = this.props.dataState.genes[gene];
			}
		} else {
			data = this.props.fileInfo.colAttrs[attr];
		}		
		return data;
	}
	render() {
		var color = this.makeData(this.props.landscapeState.colorAttr, this.props.landscapeState.colorGene);
		var x = this.makeData(this.props.landscapeState.xCoordinate, this.props.landscapeState.xGene);
		var y = this.makeData(this.props.landscapeState.yCoordinate, this.props.landscapeState.yGene);
		return (
			<div className="container-fluid">
				<div className="row">
					<div className="col-xs-6 col-sm-3">
						<LandscapeSidepanel 
							colAttrs={this.props.fileInfo.colAttrs}
							xCoordinate={this.props.landscapeState.xCoordinate}
							xGene={this.props.landscapeState.xGene}
							yCoordinate={this.props.landscapeState.yCoordinate}
							yGene={this.props.landscapeState.yGene}
							colorAttr={this.props.landscapeState.colorAttr}
							colorMode={this.props.landscapeState.colorMode}
							colorGene={this.props.landscapeState.colorGene}

							onXCoordinateChange={this.props.onXCoordinateChange}
							onYCoordinateChange={this.props.onYCoordinateChange}
							onColorModeChange={this.props.onColorModeChange}
							onColorAttrChange={this.props.onColorAttrChange}
							onXGeneChange={this.props.onXGeneChange}
							onYGeneChange={this.props.onYGeneChange}
							onColorGeneChange={this.props.onColorGeneChange}
						/>
					</div>
					<div className="col-xs-12 col-sm-9 no-line-space">
						<Scatterplot
							x={x}
							y={y}
							color={color}
							colorMode={this.props.landscapeState.colorMode}
							width={800}
							height={600}
							logScale={this.props.landscapeState.colorAttr == "(gene)"}
						/>
					</div>
				</div>
			</div>
		)
	}
}

LandscapeView.propTypes = {
	dataState: PropTypes.object.isRequired,
	landscapeState: PropTypes.object.isRequired,
	fileInfo: PropTypes.object.isRequired,
	onXCoordinateChange: PropTypes.func.isRequired,
	onYCoordinateChange: PropTypes.func.isRequired,
	onColorModeChange: PropTypes.func.isRequired,
	onColorAttrChange: PropTypes.func.isRequired,
	onColorGeneChange: 		PropTypes.func.isRequired,
	onXGeneChange: 			PropTypes.func.isRequired,
	onYGeneChange: 			PropTypes.func.isRequired
}
