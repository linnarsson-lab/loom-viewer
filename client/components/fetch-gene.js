import React, { Component, PropTypes } from 'react';
import { FormControl, FormGroup } from 'react-bootstrap';
import VirtualizedSelect from 'react-virtualized-select';
import { fetchGene } from '../actions/actions.js';
import { forEach } from 'lodash';


// TODO: document how FetchGeneComponent works
export class FetchGeneComponent extends Component {
	constructor(props) {
		super(props);

		this.state = {};
	}

	render() {
		const { dataSet, selectableGenes, geneCache, dispatch, attrType, attrName } = this.props;
		if (selectableGenes) {
			const options = new Array(selectableGenes.length);
			for (let i = 0; i < selectableGenes.length; i++) {
				options[i] = { value: selectableGenes[i], label: selectableGenes[i] };
			}

			// val will be an array of objects with { label, value } entries
			const dispatchOnChange = this.props.multi ? (val) => {
				if (val && val.length) {
					let geneString = '';
					for (let i = 0; i < val.length; i++) {
						geneString += val[i].value + ' ';
						dispatch(fetchGene(dataSet, val[i].value, geneCache));
					}
					dispatch({ type: attrType, [attrName]: geneString });
				} else {
					dispatch({ type: attrType, [attrName]: '' });
				}
				this.setState({ val });
			} : (val) => {
				if (val) {
					dispatch({ type: attrType, [attrName]: val.value });
					dispatch(fetchGene(dataSet, val.value, geneCache));
				} else {
					dispatch({ type: attrType, [attrName]: '' });
				}
				this.setState({ val });
			};

			return (
				<FormGroup>
					<VirtualizedSelect
						options={options}
						onChange={dispatchOnChange}
						value={this.state.val}
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
						value={this.state.val}
						onChange={(event) => {
							dispatch({
								type: 'SET_SPARKLINE_PROPS',
								genes: event.target.value,
							});
							forEach(
								event.target.value.trim().split(/[ ,\r\n]+/),
								(gene) => {
									dispatch(
										fetchGene(dataSet, gene, geneCache)
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
	geneCache: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	dataSet: PropTypes.object.isRequired,
	attrType: PropTypes.string.isRequired,
	attrName: PropTypes.string.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
};