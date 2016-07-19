import React, { PropTypes } from 'react';
import { GenescapeSidepanel } from './genescape-sidepanel';
import { Scatterplot } from './scatterplot';

export const GenescapeView = function (props) {
	const { dispatch, genescapeState, dataState, viewState } = props;

	const color = dataState.currentDataset.rowAttrs[genescapeState.colorAttr];
	const x = dataState.currentDataset.rowAttrs[genescapeState.xCoordinate];
	const y = dataState.currentDataset.rowAttrs[genescapeState.yCoordinate];
	return (
		<div className='view'>
			<div className='view-sidepanel'>
				<GenescapeSidepanel
					genescapeState={genescapeState}
					dataState={dataState}
					dispatch={dispatch}
					/>
			</div>
			<div className='view-main'>
				<Scatterplot
					x={x}
					y={y}
					color={color}
					colorMode={genescapeState.colorMode}
					width={viewState.width - 350}
					height={viewState.height - 40}
					logScaleColor={false}
					logScaleX={false}
					logScaleY={false}
					/>
			</div>
		</div>
	);
};

GenescapeView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	genescapeState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};
