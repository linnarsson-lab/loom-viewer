import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Slider from 'rc-slider';

import { debounce } from 'lodash';

import { UPDATE_VIEWSTATE } from '../../actions/action-types';


function scaleFactorHandleChangeFactory(props){
	const {
		dispatch,
		dataset,
		axis,
		plotNr,
		time,
	} = props;
	const scaleFactorHC = (scaleFactor) => {
		const action = {
			type: UPDATE_VIEWSTATE,
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: {
							[plotNr]: { scaleFactor },
						},
					},
				},
			},
		};
		dispatch(action);
	};

	return time | 0 ?
		debounce(scaleFactorHC, time | 0) :
		scaleFactorHC;
}

export class ScaleFactorSettings extends Component {
	render() {
		const { props } = this;
		const { scaleFactor } = props;
		const scaleFactorHC = scaleFactorHandleChangeFactory(props);
		return (
			<div style={{ height: '50px' }}>
				<Slider
					marks={{
						1: '0x',
						20: '1x',
						40: '2x',
						60: '3x',
						80: '4x',
						100: '2.5x',
					}}
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
	scaleFactor: PropTypes.number.isRequired,
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotNr: PropTypes.number.isRequired,
	time: PropTypes.number,
};