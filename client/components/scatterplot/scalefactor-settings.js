import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import Slider from 'rc-slider';

import { debounce } from 'lodash';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

export class ScaleFactorSettings extends PureComponent {
	componentWillMount() {
		const { axis, dataset, dispatch } = this.props;

		const scaleFactorHC = (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: axis,
				path: dataset.path,
				viewState: {
					[axis]: {
						settings: { scaleFactor: value },
					},
				},
			});
		};

		this.setState({
			scaleFactorHC,
			scaleFactorDebounced: debounce(scaleFactorHC, this.props.time || 0),
		});
	}

	componentWillReceiveProps(nextProps) {
		const newDebounce = this.state.time !== nextProps.time;

		const scaleFactorDebounced = newDebounce ?
			debounce(this.state.scaleFactorHC, nextProps.time || 0)
			:
			this.state.scaleFactorDebounced;

		this.setState({
			scaleFactorDebounced,
		});
	}

	render() {
		return (
			<div style={{ height: '50px' }}>
				<Slider
					marks={{ 1: '0x', 20: '0.5x', 40: '1x', 60: '1.5x', 80: '2x', 100: '2.5x' }}
					min={1}
					max={100}
					defaultValue={this.props.scaleFactor}
					onChange={this.state.scaleFactorDebounced}
					onAfterChange={this.state.scaleFactorDebounced} />
			</div>
		);
	}
}


ScaleFactorSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	scaleFactor: PropTypes.number,
	time: PropTypes.number,
};