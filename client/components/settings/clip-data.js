import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { Range } from 'rc-slider';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

import { debounce } from 'lodash';

export class ClipDataSettings extends PureComponent {
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
				viewState: { [axis]: { lowerBound: values[0], upperBound: values[1] } },
			});
		};

		this.setState({
			clampRangeHC,
			clampRangeDebounced: debounce(clampRangeHC, this.props.time || 0),
		});
	}

	componentWillReceiveProps(nextProps) {
		const newDebounce = this.state.time !== nextProps.time;

		const clampRangeDebounced = newDebounce ?
			debounce(this.state.clampRangeHC, nextProps.time || 0)
			:
			this.state.clampRangeDebounced;

		this.setState({
			clampRangeDebounced,
		});
	}

	render() {
		return (
			<div style={{ width: '95%', height: '50px' }}>
				<Range
					marks={{ 0: '0%', 20: '20%', 40: '40%', 60: '60%', 80: '80%', 100: '100%' }}
					min={0}
					max={100}
					pushable={0}
					count={2}
					defaultValue={[this.props.lowerBound, this.props.upperBound]}
					onChange={this.state.clampRangeDebounced}
					onAfterChange={this.state.clampRangeDebounced} />
			</div>
		);
	}
}

ClipDataSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	lowerBound: PropTypes.number,
	upperBound: PropTypes.number,
	time: PropTypes.number,
};