import React, { Component, PropTypes } from 'react';
import { FormGroup, ControlLabel } from 'react-bootstrap';
import VirtualizedSelect from 'react-virtualized-select';
import { debounce } from 'lodash';
import { fetchGene } from '../actions/actions.js';


export const FetchGeneComponent = function (props) {
	const {
		geneList, dispatch,
	} = props;

	const options = new Array(geneList.length);
	for (let i = 0; i < geneList.length; i++) {
		options[i] = { value: geneList[i], label: geneList[i] };
	}

	const dispatchOnChange = (val) => {
		console.log(val);
	};
	return(
		<FormGroup>
			<VirtualizedSelect
				options={options}
				onChange={dispatchOnChange}
				multi
				simpleValue
				clearable
				/>
		</FormGroup>
	);
};

FetchGeneComponent.propTypes = {
	buttonLabel: PropTypes.string,
	buttonName: PropTypes.string.isRequired,
	geneList: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
};