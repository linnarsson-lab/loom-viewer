import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';

export const GenescapeSidepanel = function (props) {
	const { dispatch, genescapeState, dataState } = props;
	const rowAttrKeys = Object.keys(dataState.currentDataset.rowAttrs).sort();

	// TODO: If dropdown menu works here, refactor into heatmap-sidepanel.js
	return (
		<div className='panel panel-default'>
			<div className='panel-heading'><h3 className='panel-title'>Settings</h3></div>
			<div className='panel-body'>
				<form>
					<DropdownMenu
						buttonLabel={'X Coordinate'}
						buttonName={genescapeState.xCoordinate}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'xCoordinate'}
						dispatch={dispatch}
						/>
					<DropdownMenu
						buttonLabel={'Y Coordinate'}
						buttonName={genescapeState.yCoordinate}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'yCoordinate'}
						dispatch={dispatch}
						/>
					<DropdownMenu
						buttonLabel={'Color'}
						buttonName={genescapeState.colorAttr}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'colorAttr'}
						dispatch={dispatch}
						/>
					<DropdownMenu
						buttonLabel={undefined}
						buttonName={genescapeState.colorMode}
						attributes={['Categorical', 'Heatmap']}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'colorMode'}
						dispatch={dispatch}
						/>
				</form>
			</div>
		</div>
	);
};

GenescapeSidepanel.propTypes = {
	genescapeState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};