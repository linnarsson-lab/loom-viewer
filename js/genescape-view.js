import React, { Component, PropTypes } from 'react';
import { GenescapeSidepanel } from './genescape-sidepanel';
import { Scatterplot } from './scatterplot';

export class GenescapeView extends Component {
	render() {
		var dispatch = this.props.dispatch;
		var fi = this.props.fileInfo;
		var gs = this.props.genescapeState;
		var ds = this.props.dataState;
	  	var vs = this.props.viewState;

	  	console.log(gs);
		var color =  fi.rowAttrs[gs.colorAttr];
		var x = fi.rowAttrs[gs.xCoordinate];
		var y = fi.rowAttrs[gs.yCoordinate];
		return (
		<div className="view">
			<div className="view-sidepanel">
				<GenescapeSidepanel 
					fileInfo={fi}
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
	fileInfo: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}
