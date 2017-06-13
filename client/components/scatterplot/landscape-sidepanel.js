import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterplotSidepanel } from './scatterplot-sidepanel';

export class LandscapeSidepanel extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;

		return (
			<ScatterplotSidepanel
				dispatch={dispatch}
				dataset={dataset}
				axis={'col'}
				viewState={dataset.viewState.col}
			/>
		);
	}
}

LandscapeSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};