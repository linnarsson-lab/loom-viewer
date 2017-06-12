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
			log2Color,
			clip,
		} = settings;

		const { handleChangeFactory } = this.state;
		const log2ColorHC = handleChangeFactory('log2Color', log2Color);
		const clipHC = handleChangeFactory('clip', clip);
		let clipRange;

		if (clip) {
			const clipTltp = `Clip data between ${lowerBound}% to ${upperBound}% of min/max values`;
			clipRange = (
				<OverlayTooltip
					tooltip={clipTltp}
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
			);
		}
		return (
			<div className='view-vertical'>
				<div className='view'>
					<OverlayTooltip
						tooltip={'toggle log2-projection (gradient scales only)'}
						tooltipId={'log-color-tltp'}>
						<Button
							bsStyle='link'
							bsSize='small'
							style={{ flex: 1 }}
							onClick={log2ColorHC}>
							<Glyphicon glyph={log2Color ? 'check' : 'unchecked'} /> log
						</Button>
					</OverlayTooltip>
					<OverlayTooltip
						tooltip={'toggle clip (gradient scales only)'}
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
				{clipRange}
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