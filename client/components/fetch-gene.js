import React, { Component, PropTypes } from 'react';
import { FormGroup } from 'react-bootstrap';
import { fetchGene } from '../actions/actions.js';
import { isEqual } from 'lodash';
import Select from 'react-virtualized-select';
import createFilterOptions from 'react-select-fast-filter-options';

// TODO: document how FetchGeneComponent works and what it expects
export class FetchGeneComponent extends Component {
	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
	}

	componentWillMount(){
		this.setState(this.createOptions(this.props.dataSet.rowAttrs.Gene));
		if (this.props.value) {
			let value = null;
			if (this.props.multi) {
				const genes = this.props.value.trim().split(/[ ,\r\n]+/);
				value = new Array(genes.length);
				for (let i = 0; i < genes.length; i++) {
					value[i] = { value: genes[i], label: genes[i] };
				}
			} else {
				value = { value: this.props.value, label: this.props.value };
			}
			this.handleChange(value);
		}
	}

	componentWillReceiveProps(nextProps) {
		const prevSG = this.props.dataSet.rowAttrs.Gene;
		const nextSG = nextProps.dataSet.rowAttrs.Gene;
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
		const { dataSet, dispatch, onChange } = this.props;
		this.setState({ value });
		if (value) {
			if (this.props.multi) {
				let geneString = '';
				let values = new Array(value.length);
				for (let i = 0; i < value.length; i++) {
					geneString += value[i].value + ' ';
					values[i] = value[i].value;
				}
				dispatch(fetchGene(dataSet, values));
				onChange ? onChange(geneString) : null;
			} else {
				dispatch(fetchGene(dataSet, [value.value]));
				onChange ? onChange(value.value) : null;
			}
		} else {
			onChange ? onChange('') : null;
		}
	}

	render() {
		const { options, filterOptions, value } = this.state;
		return (
			<FormGroup>
				<Select
					options={options}
					filterOptions={filterOptions}
					onChange={this.handleChange}
					value={value}
					multi={this.props.multi}
					clearable={this.props.clearable === true}
					/>
			</FormGroup>
		);
	}
}


FetchGeneComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataSet: PropTypes.object.isRequired,
	value: PropTypes.string,
	onChange: PropTypes.func,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
};