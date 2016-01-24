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
		var start = performance.now();
		var temp = this.render0();
		console.log("View: " + (performance.now() - start).toString());
		return temp;
	}
	render0() {
		var dispatch = this.props.dispatch;
		var fi = this.props.fileInfo;
		var ls = this.props.landscapeState;
		var ds = this.props.dataState;

		var color = this.makeData(ls.colorAttr, ls.colorGene);
		var x = this.makeData(ls.xCoordinate, ls.xGene);
		var y = this.makeData(ls.yCoordinate, ls.yGene);
		return (
			<div className="container-fluid">
				<div className="row">
					<div className="col-xs-6 col-sm-3">
						<LandscapeSidepanel 
							fileInfo={fi}
							landscapeState={ls}
							dataState={ds}
							dispatch={dispatch}
						/>
					</div>
					<div className="col-xs-12 col-sm-9 no-line-space">
						<Scatterplot
							x={x}
							y={y}
							color={color}
							colorMode={ls.colorMode}
							width={800}
							height={600}
							logScaleColor={ls.colorAttr == "(gene)"}
							logScaleX={ls.xCoordinate == "(gene)"}
							logScaleY={ls.yCoordinate == "(gene)"}
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
	dispatch: PropTypes.func.isRequired
}
