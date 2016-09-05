import React, { Component, PropTypes } from 'react';
import { FormControl, FormGroup } from 'react-bootstrap';
import { fetchGene } from '../actions/actions.js';
import { forEach, isEqual } from 'lodash';
import Select from 'react-virtualized-select';
import createFilterOptions from 'react-select-fast-filter-options';

// TODO: document how FetchGeneComponent works and what it expects
export class FetchGeneComponent extends Component {
	constructor(props) {
		super(props);
		this.state = this.createOptions(this.props.selectableGenes);
		this.handleChange = this.handleChange.bind(this);
	}

	componentWillReceiveProps(nextProps) {
		const prevSG = this.props.selectableGenes;
		const nextSG = nextProps.selectableGenes;
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
		const { dataSet, fetchedGenes, dispatch, actionType, actionName } = this.props;
		this.setState({ value });

		if (this.props.multi) {
			if (value && value.length) {
				let geneString = '';
				for (let i = 0; i < value.length; i++) {
					geneString += value[i].value + ' ';
					dispatch(fetchGene(dataSet, value[i].value, fetchedGenes));
				}
				dispatch({ type: actionType, [actionName]: geneString });
			} else {
				dispatch({ type: actionType, [actionName]: '' });
			}
		} else {
			if (value) {
				dispatch({ type: actionType, [actionName]: value.value });
				dispatch(fetchGene(dataSet, value.value, fetchedGenes));
			} else {
				dispatch({ type: actionType, [actionName]: '' });
			}
		}
	}

	render() {
		const { dataSet, fetchedGenes, dispatch } = this.props;
		const { options, filterOptions, value } = this.state;
		if (options) {
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
		} else {
			return (
				<FormGroup>
					<FormControl
						type='text'
						placeholder='Enter gene name...'
						value={value}
						onChange={(event) => {
							dispatch({
								type: 'SET_SPARKLINE_PROPS',
								genes: event.target.value,
							});
							forEach(
								event.target.value.trim().split(/[ ,\r\n]+/),
								(gene) => {
									dispatch(
										fetchGene(dataSet, gene, fetchedGenes)
									);
								}
							);
						} }
						/>
				</FormGroup>
			);
		}
	}
}

FetchGeneComponent.propTypes = {
	selectableGenes: PropTypes.array,
	fetchedGenes: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	dataSet: PropTypes.object.isRequired,
	actionType: PropTypes.string.isRequired,
	actionName: PropTypes.string.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
};