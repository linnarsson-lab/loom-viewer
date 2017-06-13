import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterplotSidepanel } from './scatterplot-sidepanel';

export class GenescapeSidepanel extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;

		return (
			<ScatterplotSidepanel
				dispatch={dispatch}
				dataset={dataset}
				axis={'row'}
				viewState={dataset.viewState.row}
			/>
		);
	}
}

GenescapeSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};