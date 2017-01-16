import React, { Component, PropTypes } from 'react';
import { fetchGene } from '../actions/actions';
import { isEqual } from 'lodash';
import Select from 'react-virtualized-select';
import createFilterOptions from 'react-select-fast-filter-options';

// TODO: document how FetchGeneComponent works and what it expects
export class FetchGeneComponent extends Component {
	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
	}

	componentWillMount() {
		this.setState(this.createOptions(this.props.dataset.row.attrs.Gene.data));
		if (this.props.value) {
			let values = null;
			if (this.props.multi) {
				const genes = this.props.value;
				values = new Array(genes.length);
				for (let i = 0; i < genes.length; i++) {
					values[i] = { value: genes[i], label: genes[i] };
				}
			} else {
				values = { value: this.props.value, label: this.props.value };
			}
			this.handleChange(values);
		}
	}

	componentWillReceiveProps(nextProps) {
		const prevSG = this.props.dataset.row.attrs.Gene.data;
		const nextSG = nextProps.dataset.row.attrs.Gene.data;
		if (!isEqual(prevSG, nextSG)) {
			this.setState(this.createOptions(nextSG));
		}
	}

	createOptions(selectableGenes) {
		if (selectableGenes) {
			let options = new Array(selectableGenes.length);
			let sorted = selectableGenes.slice(0).sort();
			for (let i = 0; i < sorted.length; i++) {
				options[i] = {
					value: sorted[i],
					label: sorted[i],
				};
			}
			return {
				options,
				filterOptions: createFilterOptions({ options }),
			};
		} else {
			return { options: null, filterOptions: null };
		}
	}

	handleChange(value) {
		this.setState({ value });
		let { dataset, dispatch, onChange, multi, clearable } = this.props;
		// If multi is set, use an array of gene name strings.
		// Otherwise, send a single string.
		let genes = multi ? [] : '';
		if (value) {
			if (multi) {
				for (let i = 0; i < value.length; i++) {
					genes.push(value[i].value);
				}
				dispatch(fetchGene(dataset, genes));
			} else {
				genes = value.value;
				// fetchGene always expects an array of strings
				dispatch(fetchGene(dataset, [genes]));
			}
			onChange ? onChange(genes) : null;
		} else {
			// We also call onChange if there is no value,
			// to handle "resetting" gene lists.
			onChange && clearable ? onChange(genes) : null;
		}
	}

	render() {
		const { options, filterOptions, value } = this.state;
		return (
			<Select
				options={options}
				filterOptions={filterOptions}
				onChange={this.handleChange}
				value={value}
				multi={this.props.multi}
				clearable={this.props.clearable === true}
				style={this.props.style}
				/>
		);
	}
}


FetchGeneComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	value: PropTypes.oneOfType([
		PropTypes.arrayOf(PropTypes.string),
		PropTypes.string,
	]),
	onChange: PropTypes.func,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
	style: PropTypes.object,
};