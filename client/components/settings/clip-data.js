import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	Button,
	Glyphicon,
} from 'react-bootstrap';
import { Range } from 'rc-slider';

import { merge } from '../../js/util';

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
		plots,
		time,
	} = props;

	let newPlots = plots.slice(0);

	const handleChange = (values) => {
		newPlots[plotNr] = merge(plots[plotNr], {
			lowerBound: values[0],
			upperBound: values[1],
		});
		dispatch({
			type: SET_VIEW_PROPS,
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plots: newPlots,
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
		plots,
	} = props;

	let newPlots = plots.slice(0);
	const plot = plots[plotNr];

	return () => {
		newPlots[plotNr] = merge(plot, {
			[key]: value,
		});
		dispatch({
			type: SET_VIEW_PROPS,
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plots: newPlots,
					},
				},
			},
		});
	};
}

export class ClipDataSettings extends Component {

	render() {
		const { props } = this;

		const {
			plotNr,
			plots,
		} = props;

		const {
			clip,
			logScale,
			lowerBound,
			upperBound,
		} = plots[plotNr];

		const clampRangeHC = clampRangeHandleChangeFactory(props);
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
									onChange={clampRangeHC}
									onAfterChange={clampRangeHC} />
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
	plots: PropTypes.array.isRequired,
	time: PropTypes.number,
};