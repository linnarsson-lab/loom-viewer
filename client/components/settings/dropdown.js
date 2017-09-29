import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import VirtualizedSelect from 'react-virtualized-select';
import createFilterOptions from 'react-select-fast-filter-options';

export class DropdownMenu extends PureComponent {

	constructor(...args) {
		super(...args);

		this.handleChange = (selectValue) => {
			if (selectValue !== undefined && selectValue !== null) {
				this.props.onChange(selectValue.value);
				this.setState(() => {
					return selectValue;
				});
			}
		};

		const {
			options,
			filterOptions,
			value,
		} = this.props;

		let newOptions = options.map((option) => {
			return {
				value: option,
				label: option,
			};
		});

		this.state = {
			options: newOptions,
			filterOptions: (
				!filterOptions && options.length > 100 ?
					createFilterOptions({ options: newOptions }) :
					filterOptions
			),
			value,
			label: value,
		};
	}

	componentWillReceiveProps(nextProps) {
		const { value } = nextProps;
		if (value) {
			this.setState(() => {
				return {
					value: value,
					label: value,
				};
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
	clearable: PropTypes.bool,
	style: PropTypes.object,
};