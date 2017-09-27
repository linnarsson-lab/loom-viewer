import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	Button,
	Glyphicon,
} from 'react-bootstrap';
import { Range } from 'rc-slider';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

import {
	OverlayTooltip,
} from './collapsible';

import { debounce } from 'lodash';

function clampRangeHandleChangeFactory(props){
	const {
		axis,
		dataset,
		dispatch,
		plotNr,
		time,
	} = props;
	const path = dataset.path;

	const handleChange = (values) => {
		dispatch({
			type: SET_VIEW_PROPS,
			stateName: axis,
			path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: {
							[plotNr]: {
								lowerBound: values[0],
								upperBound: values[1],
							},
						},
					},
				},
			},
		});
	};

	return time ? debounce(handleChange, time) : handleChange;
}

function handleChangeFactory(props, key, value){
	const {
		axis,
		dataset,
		dispatch,
		plotNr,
	} = props;
	const path = dataset.path;

	return () => {
		dispatch({
			type: SET_VIEW_PROPS,
			stateName: axis,
			path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: {
							[plotNr]: {
								[key]: value,
							},
						},
					},
				},
			},
		});
	};
}

export class ClipDataSettings extends Component {
	constructor(props){
		super(props);
		this.clampRangeHC = clampRangeHandleChangeFactory(props);
	}

	render() {
		const { props } = this;

		const {
			plotSetting,
		} = props;

		const {
			clip,
			logScale,
			lowerBound,
			upperBound,
		} = plotSetting;

		const logScaleHC = handleChangeFactory(props, 'logScale', !logScale);
		const clipHC = handleChangeFactory(props, 'clip', !clip);
		return (
			<div className='view-vertical'>
				<div className='view'>
					<OverlayTooltip
						tooltip={'toggle log2-projection'}
						tooltipId={'log-color-tltp'}>
						<Button
							bsStyle='link'
							bsSize='small'
							style={{ flex: 1 }}
							onClick={logScaleHC}>
							<Glyphicon glyph={logScale ? 'check' : 'unchecked'} /> log
						</Button>
					</OverlayTooltip>
					<OverlayTooltip
						tooltip={'toggle clip'}
						tooltipId={'clip-color-tltp'}>
						<Button
							bsStyle='link'
							bsSize='small'
							style={{ flex: 1 }}
							onClick={clipHC}>
							<Glyphicon glyph={clip ? 'check' : 'unchecked'} /> clip
						</Button>
					</OverlayTooltip>
				</div>
				{
					clip ? (
						<OverlayTooltip
							tooltip={`Clip data between ${lowerBound}% to ${upperBound}% of min/max values`}
							tooltipId={'clip-range-tltp'} >
							<div style={{ height: '50px', padding: '10px' }}>
								<Range
									marks={{ 0: '0%', 20: '20%', 40: '40%', 60: '60%', 80: '80%', 100: '100%' }}
									min={0}
									max={100}
									pushable={0}
									count={2}
									defaultValue={[lowerBound, upperBound]}
									onChange={this.clampRangeHC}
									onAfterChange={this.clampRangeHC} />
							</div>
						</OverlayTooltip>
					) : null
				}
			</div>
		);
	}
}

ClipDataSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotNr: PropTypes.number.isRequired,
	plotSetting: PropTypes.object.isRequired,
	time: PropTypes.number,
};