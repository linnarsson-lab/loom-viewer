import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { FormControl } from 'react-bootstrap';

import { debounce } from 'lodash';

export class DebouncedFormcontrol extends PureComponent {

	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
	}

	componentWillMount(){
		this.setState({
			type: this.props.type,
			value: this.props.value,
			onChange: this.props.onChange,
			onChangeDebounced: debounce(this.props.onChange, this.props.time || 0),
		});
	}

	componentWillReceiveProps(nextProps) {
		const newDebounce =
			this.state.onChange !== nextProps.onChange ||
			this.state.time !== nextProps.time;

		const onChangeDebounced = newDebounce ?
			debounce(nextProps.onChange, nextProps.time || 0)
			:
			this.state.onChangeDebounced;

		this.setState({
			type: nextProps.type,
			value: nextProps.value,
			onChange: nextProps.onChange,
			onChangeDebounced,
		});
	}

	handleChange(e) {
		e.persist();
		this.setState({ value: e.target.value });
		this.state.onChangeDebounced(e);
	}

	render() {
		const { key, type, value } = this.state;
		return (
			<FormControl
				key={key}
				type={type}
				value={value}
				onChange={this.handleChange}
			/>
		);
	}
}

DebouncedFormcontrol.propTypes = {
	key: PropTypes.any,
	type: PropTypes.string,
	value: PropTypes.string,
	onChange: PropTypes.func,
	time: PropTypes.number,
};