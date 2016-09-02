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
	}

	componentWillReceiveProps(nextProps) {
		const prevSG = this.props.selectableGenes;
		const nextSG = nextProps.selectableGenes;
		if (!isEqual(prevSG, nextSG)){
			this.setState(this.createOptions(nextSG));
		}
	}

	createOptions(selectableGenes) {
		if (selectableGenes) {
			let options = new Array(selectableGenes.length);
			for (let i = 0; i < selectableGenes.length; i++) {
				options[i] = {
					value: selectableGenes[i],
					label: selectableGenes[i],
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

	render() {
		const { dataSet, fetchedGenes, dispatch, attrType, attrName } = this.props;
		const { options, filterOptions, val } = this.state;
		if (options) {
			// val will be an array of objects with { label, value } entries
			const dispatchOnChange = this.props.multi ? (val) => {
				if (val && val.length) {
					let geneString = '';
					for (let i = 0; i < val.length; i++) {
						geneString += val[i].value + ' ';
						dispatch(fetchGene(dataSet, val[i].value, fetchedGenes));
					}
					dispatch({ type: attrType, [attrName]: geneString });
				} else {
					dispatch({ type: attrType, [attrName]: '' });
				}
				this.setState({ val });
			} : (val) => {
				if (val) {
					dispatch({ type: attrType, [attrName]: val.value });
					dispatch(fetchGene(dataSet, val.value, fetchedGenes));
				} else {
					dispatch({ type: attrType, [attrName]: '' });
				}
				this.setState({ val });
			};

			return (
				<FormGroup>
					<Select
						options={options}
						filterOptions={filterOptions}
						onChange={dispatchOnChange}
						value={val}
						multi={this.props.multi}
						clearable={this.props.clearable}
						/>
				</FormGroup>
			);
		} else {
			return (
				<FormGroup>
					<FormControl
						type='text'
						placeholder='Enter gene name...'
						value={val}
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
	attrType: PropTypes.string.isRequired,
	attrName: PropTypes.string.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
};