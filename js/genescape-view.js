import React, { Component, PropTypes } from 'react';
import { GenescapeSidepanel } from './genescape-sidepanel';
import { Scatterplot } from './scatterplot';

export class GenescapeView extends Component {
	render() {
		const dispatch = this.props.dispatch;
		const gs = this.props.genescapeState;
		const ds = this.props.dataState;
		const vs = this.props.viewState;

		console.log(gs);
		const color =  ds.currentDataset.rowAttrs[gs.colorAttr];
		const x = ds.currentDataset.rowAttrs[gs.xCoordinate];
		const y = ds.currentDataset.rowAttrs[gs.yCoordinate];
		return (
		<div className='view'>
			<div className='view-sidepanel'>
				<GenescapeSidepanel
					genescapeState={gs}
					dataState={ds}
					dispatch={dispatch}
				/>
			</div>
			<div className='view-main'>
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
		);
	}
}

GenescapeView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	genescapeState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};
