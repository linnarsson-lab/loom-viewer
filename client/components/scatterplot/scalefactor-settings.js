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
			scaleFactorDebounced: this.props.time ? debounce(scaleFactorHC, this.props.time) : scaleFactorHC,
		});
	}

	componentWillReceiveProps(nextProps) {
		const newDebounce = this.state.time !== nextProps.time;

		if (newDebounce) {
			const scaleFactorDebounced = nextProps.time ?
				debounce(this.state.scaleFactorHC, nextProps.time) : newDebounce;
			this.setState({
				scaleFactorDebounced,
			});
		}
	}

	render() {
		return (
			<div style={{ height: '50px' }}>
				<Slider
					marks={{ 1: '0x', 20: '1x', 40: '2x', 60: '3x', 80: '4x', 100: '2.5x' }}
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