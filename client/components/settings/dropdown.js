import React, { Component } from 'react';
import PropTypes from 'prop-types';

import VirtualizedSelect from 'react-virtualized-select';
import createFilterOptions from 'react-select-fast-filter-options';

export class DropdownMenu extends Component {

	constructor(...args) {
		super(...args);

		this.handleChange = this.handleChange.bind(this);

		let {
			options,
			value,
		} = this.props;

		if (options instanceof Array) {
			options = options.map((option) => {
				return {
					label: option,
					value: option,
				};
			});
			this.state = {
				options,
				filterOptions: createFilterOptions({ options }),
				value,
				label: value,
			};
		} else {
			this.state = {
				options: options.options,
				filterOptions: options.fastFilterOptions,
				value,
				label: value,
			};
		}

	}

	componentWillReceiveProps(nextProps) {
		const { value } = nextProps;
		if (value !== this.state.value) {
			this.setState(() => {
				return {
					value: value,
					label: value,
				};
			});
		}
	}

	handleChange(selectValue) {
		if (selectValue !== undefined && selectValue !== null) {
			this.props.onChange(selectValue.value);
			this.setState(() => {
				return selectValue;
			});
		}
	}

	render() {

		const {
			options,
			filterOptions,
			value,
		} = this.state;

		const {
			clearable,
			style,
		} = this.props;

		return (
			<VirtualizedSelect
				value={value}
				options={options}
				filterOptions={filterOptions}
				onChange={this.handleChange}
				clearable={clearable === true}
				style={style}
				menuContainerStyle={{
					position: 'absolute',
					width: '800px',
					zIndex: 100000,
				}}
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
	options: PropTypes.oneOfType([
		PropTypes.arrayOf(PropTypes.string),
		PropTypes.shape({
			options: PropTypes.array.isRequired,
			filterOptions: PropTypes.func.isRequired,
		}),
	]).isRequired,
	onChange: PropTypes.func.isRequired,
	clearable: PropTypes.bool,
	style: PropTypes.object,
};