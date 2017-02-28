import React, { Component, PropTypes } from 'react';
import { fetchGene } from '../actions/actions';
import Select from 'react-virtualized-select';

// TODO: document how FetchGeneComponent works and what it expects
export class FetchGeneComponent extends Component {

	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
		const { geneKeys } = props.dataset.col;
		let options = new Array(geneKeys.length);
		for (let i = 0; i < options.length; i++) {
			options[i] = {
				value: geneKeys[i],
				label: geneKeys[i],
			};
		}
		this.state = { options };
	}

	componentWillMount() {
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
		const col = this.props.dataset.col;
		return (
			<Select
				options={this.state.options}
				filterOptions={col.dropdownOptions.keyAttr}
				onChange={this.handleChange}
				value={this.state.value}
				multi={this.props.multi}
				clearable={this.props.clearable === true}
				style={this.props.style}
				maxHeight={100}
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