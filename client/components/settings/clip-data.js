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

export class ClipDataSettings extends Component {
	componentWillMount() {
		const {
			dataset,
			dispatch,
			axis,
		} = this.props;

		const clampRangeHC = (values) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: axis,
				path: dataset.path,
				viewState: {
					[axis]: {
						settings: {
							lowerBound: values[0],
							upperBound: values[1],
						},
					},
				},
			});
		};

		const handleChangeFactory = (name, value) => {
			return () => {
				dispatch({
					type: SET_VIEW_PROPS,
					stateName: axis,
					path: dataset.path,
					viewState: {
						[axis]: {
							settings: {
								[name]: !value,
							},
						},
					},
				});
			};
		};
		const clampRangeDebounced = this.props.time ?
			debounce(clampRangeHC, this.props.time) : clampRangeHC;

		this.setState({
			clampRangeHC,
			clampRangeDebounced,
			handleChangeFactory,
		});
	}

	componentWillReceiveProps(nextProps) {
		const newDebounce = this.state.time !== nextProps.time;

		const clampRangeDebounced = newDebounce ?
			(nextProps.time ? debounce(this.state.clampRangeHC, nextProps.time) : this.state.clampRangeHC)
			:
			this.state.clampRangeDebounced;

		this.setState({
			clampRangeDebounced,
		});
	}

	render() {
		const {
			settings,
		} = this.props;

		const {
			lowerBound,
			upperBound,
			logScale,
			clip,
		} = settings;

		const { handleChangeFactory } = this.state;
		const logScaleHC = handleChangeFactory('logScale', logScale);
		const clipHC = handleChangeFactory('clip', clip);
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
									onChange={this.state.clampRangeDebounced}
									onAfterChange={this.state.clampRangeDebounced} />
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
	settings: PropTypes.object.isRequired,
	time: PropTypes.number,
};