import React, { Component, PropTypes } from 'react';
import Select from 'react-virtualized-select';
import createFilterOptions from 'react-select-fast-filter-options';

//TODO: document what DropdownMenu expects
export class DropdownMenu extends Component {

	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
		this.setButtonName = this.setButtonName.bind(this);
	}

	componentWillMount() {
		const { options, filterOptions, value, multi  } = this.props;
		let newOptions = new Array(options.length);
		for (let i = 0; i < newOptions.length; i++) {
			newOptions[i] = {
				value: options[i],
				label: options[i],
			};
		}

		this.setState({ 
			options: newOptions,
			filterOptions: filterOptions ? filterOptions : createFilterOptions({ options: newOptions }),
		});
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
		const { options, filterOptions, value } = this.state;
		return (
			<Select
				value={value}
				options={options}
				filterOptions={filterOptions}
				onChange={this.handleChange}
				multi={this.props.multi}
				clearable={this.props.clearable === true}
				style={this.props.style}
				maxHeight={100}
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
	filterOptions: PropTypes.func,
	onChange: PropTypes.func.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
	style: PropTypes.object,
};