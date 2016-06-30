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
			data = this.props.dataState.currentDataset.colAttrs[attr];
		}
		return data;
	}
	render() {
		var dispatch = this.props.dispatch;
		var ls = this.props.landscapeState;
		var ds = this.props.dataState;
	  	var vs = this.props.viewState;

		var color = this.makeData(ls.colorAttr, ls.colorGene);
		var x = this.makeData(ls.xCoordinate, ls.xGene);
		var y = this.makeData(ls.yCoordinate, ls.yGene);
		return (
		<div className="view">
			<div className="view-sidepanel">
				<LandscapeSidepanel
					landscapeState={ls}
					dataState={ds}
					dispatch={dispatch}
				/>
			</div>
			<div className="view-main">
				<Scatterplot
					x={x}
					y={y}
					color={color}
					colorMode={ls.colorMode}
					width={vs.width - 350}
					height={vs.height - 40}
					logScaleColor={ls.colorAttr == "(gene)"}
					logScaleX={ls.xCoordinate == "(gene)"}
					logScaleY={ls.yCoordinate == "(gene)"}
				/>
			</div>
		</div>
		)
	}
}

LandscapeView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	landscapeState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}
