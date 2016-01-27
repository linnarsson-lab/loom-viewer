import React, { Component, PropTypes } from 'react';
import { GenescapeSidepanel } from './genescape-sidepanel';
import { Scatterplot } from './scatterplot';

export class GenescapeView extends Component {
	render() {
		var dispatch = this.props.dispatch;
		var fi = this.props.fileInfo;
		var gs = this.props.genescapeState;
		var ds = this.props.dataState;

		var color =  fi.rowAttrs[gs.colorAttr];
		var x = fi.rowAttrs[gs.xCoordinate];
		var y = fi.rowAttrs[gs.yCoordinate];
		return (
			<div className="container-fluid">
				<div className="row">
					<div className="col-xs-6 col-sm-3">
						<GenescapeSidepanel 
							fileInfo={fi}
							genescapeState={gs}
							dataState={ds}
							dispatch={dispatch}
						/>
					</div>
					<div className="col-xs-12 col-sm-9 no-line-space">
						<Scatterplot
							x={x}
							y={y}
							color={color}
							colorMode={gs.colorMode}
							width={800}
							height={600}
							logScaleColor={false}
							logScaleX={false}
							logScaleY={false}
						/>
					</div>
				</div>
			</div>
		)
	}
}

GenescapeView.propTypes = {
	dataState: PropTypes.object.isRequired,
	genescapeState: PropTypes.object.isRequired,
	fileInfo: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}
