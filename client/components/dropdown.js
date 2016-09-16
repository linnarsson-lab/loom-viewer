import React, { Component, PropTypes } from 'react';
import Select from 'react-select';


//TODO: document what DropdownMenu expects
export class DropdownMenu extends Component {

	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
		this.setButtonName = this.setButtonName.bind(this);
	}

	componentWillMount() {
		let { value, multi } = this.props;
		this.setButtonName(value, multi);
	}

	componentWillReceiveProps(nextProps) {
		let { value, multi } = nextProps;
		this.setButtonName(value, multi);
	}

	setButtonName(value, multi) {
		let newState = {};
		if (multi) {
			if (value) {
				const genes = value;
				newState.values = new Array(genes.length);
				for (let i = 0; i < genes.length; i++) {
					newState.values[i] = { value: genes[i], label: genes[i] };
				}
			}
		} else {
			if (value) {
				newState = { value: value, label: value };
			} else {
				newState = { value: undefined, label: undefined };
			}
		}
		this.setState(newState);
	}

	handleChange(event) {
		this.setState(event);
		if (event !== undefined && event !== null) {
			const { onChange } = this.props;
			if (this.props.multi) {
				let value = [];
				for (let i = 0; i < event.length; i++) {
					value.push(event[i].value);
				}
				onChange(value);
			} else {
				onChange(event.value);
			}
		}
	}

	render() {
		const { options, unsorted } = this.props;

		const sorted = unsorted ? options : options.slice(0).sort();
		let sortedOptions = new Array(sorted.length);
		for (let i = 0; i <= sorted.length; i++) {
			sortedOptions[i] = {
				value: sorted[i],
				label: sorted[i],
			};
		}

		return (
			<Select
				value={this.state}
				options={sortedOptions}
				onChange={this.handleChange}
				multi={this.props.multi}
				clearable={this.props.clearable === true}
				style={this.props.style}
				/>
		);
	}
}

DropdownMenu.propTypes = {
	value: PropTypes.oneOfType([
		PropTypes.arrayOf(PropTypes.string),
		PropTypes.string,
	]),
	options: PropTypes.array.isRequired,
	onChange: PropTypes.func.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
	unsorted: PropTypes.bool,
	style: PropTypes.object,
};