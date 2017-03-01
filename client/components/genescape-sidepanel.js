import React, { PropTypes } from 'react';
import { ScatterplotSidepanel } from './scatterplot-sidepanel';

export const GenescapeSidepanel = function (props) {
	const { dispatch, dataset } = props;

	return (
		<ScatterplotSidepanel
			dispatch={dispatch}
			dataset={dataset}
			stateName={'genescape'}
			attrName={'row'}
			viewState={dataset.viewState.genescape}
		/>
	);
};

GenescapeSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};