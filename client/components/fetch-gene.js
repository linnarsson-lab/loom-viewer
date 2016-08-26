import React, { Component, PropTypes } from 'react';
import { FormGroup } from 'react-bootstrap';
import VirtualizedSelect from 'react-virtualized-select';
import { fetchGene } from '../actions/actions.js';


// TODO: document how FetchGeneComponent works
export class FetchGeneComponent extends Component {
	constructor(props) {
		super(props);

		this.state = {};
	}

	render() {
		const { dataSet, geneList, geneCache, dispatch, attrType, attrName } = this.props;

		const options = new Array(geneList.length);
		for (let i = 0; i < geneList.length; i++) {
			options[i] = { value: geneList[i], label: geneList[i] };
		}

		// val will be an array of objects with { label, value } entries
		const dispatchOnChange = this.props.multi ? (val) => {
			console.log(val);
			if (val.length) {
				for (let i = 0; i < val.length; i++) {
					dispatch({ type: attrType, [attrName]: val[i].value });
					dispatch(fetchGene(dataSet, val[i].value, geneCache));
				}
			}
			this.setState({ val });
		} : (val) => {
			if (val) {
				dispatch({ type: attrType, [attrName]: val.value });
				dispatch(fetchGene(dataSet, val.value, geneCache));
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
	}
}

FetchGeneComponent.propTypes = {
	geneList: PropTypes.array.isRequired,
	geneCache: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	dataSet: PropTypes.object.isRequired,
	attrType: PropTypes.string.isRequired,
	attrName: PropTypes.string.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
};