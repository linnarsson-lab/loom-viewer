import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import Slider from 'rc-slider';

import { debounce } from 'lodash';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

import { merge } from '../../js/util';


function scaleFactorHandleChangeFactory(props){
	const {
		dispatch,
		dataset,
		axis,
		plotSettings,
		selectedPlot,
		time,
	} = props;
	let newPlotSettings = plotSettings.slice(0);
	const scaleFactorHC = (scaleFactor) => {
		newPlotSettings[selectedPlot] = merge(
			plotSettings[selectedPlot],
			{ scaleFactor }
		);
		dispatch({
			type: SET_VIEW_PROPS,
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: newPlotSettings,
					},
				},
			},
		});
	};

	return time | 0 ? debounce(scaleFactorHC, time | 0) : scaleFactorHC;
}

export class ScaleFactorSettings extends PureComponent {
	render() {
		const { props } = this;
		const { scaleFactor } = props.plotSettings[props.selectedPlot];
		const scaleFactorHC = scaleFactorHandleChangeFactory(props);
		return (
			<div style={{ height: '50px' }}>
				<Slider
					marks={{ 1: '0x', 20: '1x', 40: '2x', 60: '3x', 80: '4x', 100: '2.5x' }}
					min={1}
					max={100}
					defaultValue={scaleFactor}
					onChange={scaleFactorHC}
					onAfterChange={scaleFactorHC} />
			</div>
		);
	}
}


ScaleFactorSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	selectedPlot: PropTypes.number.isRequired,
	plotSettings: PropTypes.array.isRequired,
	time: PropTypes.number,
};