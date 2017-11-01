import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { FormControl } from 'react-bootstrap';

import { debounce } from 'lodash';

export class DebouncedFormControl extends Component {

	constructor(...args) {
		super(...args);
		this.handleChange = this.handleChange.bind(this);
		this.state = {
			value: this.props.value,
			onChange: this.props.onChange,
			onChangeDebounced: debounce(this.props.onChange, this.props.time || 0),
		};
	}

	componentWillReceiveProps(nextProps) {
		let newState = {},
			changedState = false;
		const { state } = this;

		if (
			state.onChange !== nextProps.onChange ||
			state.time !== nextProps.time
		) {
			newState.onChange = nextProps.onChange;
			newState.onChangeDebounced = debounce(nextProps.onChange, nextProps.time || 0);
			changedState = false;
		}

		if (state.value !== nextProps.value){
			newState.value = nextProps.value;
			changedState = false;
		}

		if (changedState){
			this.setState(() => {
				return newState;
			});
		}
	}

	handleChange(e) {
		e.persist();
		const newState = { value: e.target.value };
		this.setState(() => {
			return newState;
		});
		this.state.onChangeDebounced(e);
	}

	render() {
		const {
			value,
		} = this.state;

		return (
			<FormControl
				type={this.props.type}
				value={value}
				onChange={this.handleChange}
			/>
		);
	}
}

DebouncedFormControl.propTypes = {
	type: PropTypes.string,
	value: PropTypes.string,
	onChange: PropTypes.func,
	time: PropTypes.number,
};