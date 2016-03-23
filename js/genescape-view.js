import React, { Component, PropTypes } from 'react';
import { GenescapeSidepanel } from './genescape-sidepanel';
import { Scatterplot } from './scatterplot';

export class GenescapeView extends Component {
	render() {
		var dispatch = this.props.dispatch;
		var gs = this.props.genescapeState;
		var ds = this.props.dataState;
	  	var vs = this.props.viewState;

	  	console.log(gs);
		var color =  ds.currentDataset.rowAttrs[gs.colorAttr];
		var x = ds.currentDataset.rowAttrs[gs.xCoordinate];
		var y = ds.currentDataset.rowAttrs[gs.yCoordinate];
		return (
		<div className="view">
			<div className="view-sidepanel">
				<GenescapeSidepanel 
					genescapeState={gs}
					dataState={ds}
					dispatch={dispatch}
				/>
			</div>
			<div className="view-main">
				<Scatterplot
					x={x}
					y={y}
					color={color}
					colorMode={gs.colorMode}
					width={vs.width - 350}
					height={vs.height - 40}
					logScaleColor={false}
					logScaleX={false}
					logScaleY={false}
				/>
			</div>
		</div>
		)
	}
}

GenescapeView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	genescapeState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}
