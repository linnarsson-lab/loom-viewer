import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterPlotSidepanel } from './scatterplot-sidepanel';

export class LandscapeSidepanel extends PureComponent {
	render() {
		const { dispatch, dataset, className, style } = this.props;

		return (
			<ScatterPlotSidepanel
				dispatch={dispatch}
				dataset={dataset}
				axis={'col'}
				viewState={dataset.viewState.col}
				className={className}
				style={style}
			/>
		);
	}
}

LandscapeSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	className: PropTypes.string,
	style: PropTypes.object,
};