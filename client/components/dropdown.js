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
		const { options, unsorted, value, multi  } = this.props;
		const sorted = unsorted ? options : options.slice(0).sort();
		let sortedOptions = new Array(sorted.length);
		for (let i = 0; i <= sorted.length; i++) {
			sortedOptions[i] = {
				value: sorted[i],
				label: sorted[i],
			};
		}

		this.setState({ 
			options: sortedOptions,
			filterOptions: createFilterOptions({ options: sortedOptions }),
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
	onChange: PropTypes.func.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
	unsorted: PropTypes.bool,
	style: PropTypes.object,
};