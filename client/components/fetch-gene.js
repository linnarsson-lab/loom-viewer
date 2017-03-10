import React, { Component, PropTypes } from 'react';
import { fetchGene } from '../actions/actions';
import Select from 'react-virtualized-select';
import { FormControl, Button } from 'react-bootstrap';

import { uniq, difference } from 'lodash';

// TODO: document how FetchGeneComponent works and what it expects
export class FetchGeneComponent extends Component {

	constructor(props) {
		super(props);
		this.addSelection = this.addSelection.bind(this);
		this.applySelection = this.applySelection.bind(this);
		this.handleTextAreaChange = this.handleTextAreaChange.bind(this);
		this.filterValidGenes = this.filterValidGenes.bind(this);
	}

	componentWillMount() {
		let { selectedGenes, dispatch, dataset, onChange } = this.props;
		const { geneKeys } = dataset.col;

		let selectOptions = new Array(geneKeys.length);
		for (let i = 0; i < selectOptions.length; i++) {
			selectOptions[i] = {
				value: geneKeys[i],
				label: geneKeys[i],
			};
		}

		if (selectedGenes && selectedGenes.length) {
			selectedGenes = selectedGenes.join(',\ ');
			let validGenes = this.filterValidGenes(selectedGenes);
			dispatch(fetchGene(dataset, validGenes));
			let diff = difference(selectedGenes, validGenes);
			let diff2 = difference(validGenes, selectedGenes);
			if (diff.length+diff2.length){
				// difference length is only non-zero when
				// some values in validGenes have changed
				onChange(validGenes);
				selectedGenes = validGenes.join(',\ ');
			}
		}

		this.setState({ selectOptions, selectedGenes });
	}

	handleTextAreaChange(event) {
		this.setState({ selectedGenes: event.target.value });
	}

	addSelection(selectValue) {
		let { selectedGenes } = this.state;
		selectedGenes = selectedGenes ? selectedGenes + ', ' + selectValue.value : selectValue.value;
		this.setState({ selectedGenes });
	}

	applySelection() {
		const { dataset, dispatch, onChange } = this.props;

		let validGenes = this.filterValidGenes(this.state.selectedGenes);
		dispatch(fetchGene(dataset, validGenes));
		// We also call onChange if there is no value,
		// to handle "resetting" the view
		onChange ? onChange(validGenes) : null;

		const selectedGenes = validGenes.join(',\ ');
		this.setState({selectedGenes});
	}

	filterValidGenes(selection){
		const { col } = this.props.dataset;
		const genes = selection.split(/[,.;'"`\s]+/g);

		let validGenes = [];
		for (let i = 0; i < genes.length; i++){
			let geneIdx = col.geneKeysLowerCase.indexOf(genes[i].toLowerCase());
			if (geneIdx !== -1){
				validGenes.push(col.geneKeys[geneIdx]);
			}
		}
		return uniq(validGenes);
	}

	render() {
		const col = this.props.dataset.col;
		return (
			<div>
				<FormControl
					componentClass={'textarea'}
					rows={8}
					placeholder={'Paste genes here or use the dropdown below to search \n\n(don\'t worry about duplicate or incorrect entries, capitalization, commas, semicolons, dots or quotations. "Apply Selection" fixes and filters this)'}
					onChange={this.handleTextAreaChange}
					value={this.state.selectedGenes} />
				<Select
					placeholder={'Type to search available genes'}
					options={this.state.selectOptions}
					filterOptions={col.dropdownOptions.keyAttr}
					onChange={this.addSelection}
					style={this.props.style}
					maxHeight={100}
				/>
				<Button
					bsStyle={'default'}
					onClick={this.applySelection} >
					Apply Selection
					</Button>
			</div>
		);
	}
}


FetchGeneComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	selectedGenes: PropTypes.string,
	onChange: PropTypes.func,
	style: PropTypes.object,
};