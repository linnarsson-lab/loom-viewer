import React, { Component, PropTypes } from 'react';
import { fetchGene } from '../actions/actions';
import Select from 'react-virtualized-select';
import { FormControl, Button } from 'react-bootstrap';

import { uniq } from 'lodash';

// TODO: document how FetchGeneComponent works and what it expects
export class FetchGeneComponent extends Component {

	constructor(props) {
		super(props);
		this.addSelection = this.addSelection.bind(this);
		this.applySelection = this.applySelection.bind(this);
		this.handleTextAreaChange = this.handleTextAreaChange.bind(this);
	}

	componentWillMount() {
		let { selectedGenes, dispatch, dataset } = this.props;
		const { geneKeys } = dataset.col;
		let selectOptions = new Array(geneKeys.length);
		for (let i = 0; i < selectOptions.length; i++) {
			selectOptions[i] = {
				value: geneKeys[i],
				label: geneKeys[i],
			};
		}

		if (selectedGenes && selectedGenes.length) {
			let validGenes = selectedGenes.filter((gene) => {
				return dataset.col.geneKeys.indexOf(gene) !== -1;
			});
			selectedGenes = uniq(validGenes);
			dispatch(fetchGene(dataset, selectedGenes));
			selectedGenes = selectedGenes.join(',\ ');
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
		const genes = this.state.selectedGenes.split(/[,.;'"`\s]+/g);

		let validGenes = [];
		for (let i = 0; i < genes.length; i++){
			let geneIdx = dataset.col.geneKeysLowerCase.indexOf(genes[i].toLowerCase());
			if (geneIdx !== -1){
				validGenes.push(dataset.col.geneKeys[geneIdx]);
			}
		}

		validGenes = uniq(validGenes);
		dispatch(fetchGene(dataset, validGenes));
		// We also call onChange if there is no value,
		// to handle "resetting" the view
		onChange ? onChange(validGenes) : null;

		const selectedGenes = validGenes.join(',\ ');
		this.setState({selectedGenes});
	}

	render() {
		const col = this.props.dataset.col;
		return (
			<div>
				<FormControl
					componentClass={'textarea'}
					placeholder={'Paste genes here or use the dropdown below to search'}
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
	selectedGenes: PropTypes.arrayOf(PropTypes.string),
	onChange: PropTypes.func,
	style: PropTypes.object,
};