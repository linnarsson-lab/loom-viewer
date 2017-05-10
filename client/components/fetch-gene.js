import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { fetchGene } from '../actions/actions';
import Select from 'react-virtualized-select';
import { FormControl, Button } from 'react-bootstrap';

import { uniq, difference, isEqual } from 'lodash';

// TODO: document how FetchGeneComponent works and what it expects
export class FetchGeneComponent extends PureComponent {

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

		let i = geneKeys.length, selectOptions = new Array(i);
		while (i--) {
			selectOptions[i] = {
				value: geneKeys[i],
				label: geneKeys[i],
			};
		}
		let validGenes;
		if (selectedGenes && selectedGenes.length) {
			selectedGenes = selectedGenes.join(',\ ');
			validGenes = this.filterValidGenes(selectedGenes);
			dispatch(fetchGene(dataset, validGenes));
			let diff = difference(selectedGenes, validGenes);
			let diff2 = difference(validGenes, selectedGenes);
			if (diff.length + diff2.length) {
				// difference length is only non-zero when
				// some values in validGenes have changed
				onChange(validGenes);
				selectedGenes = validGenes.join(',\ ');
			}
		}

		this.setState({ selectOptions, validGenes, selectedGenes });
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
		if (!isEqual(validGenes, this.state.validGenes)) {
			dispatch(fetchGene(dataset, validGenes));
			// We also call onChange if there is no value,
			// to handle "resetting" the view
			onChange ? onChange(validGenes) : null;

			const selectedGenes = validGenes.join(',\ ');
			this.setState({ validGenes, selectedGenes });
		}
	}

	filterValidGenes(selection) {
		const { col } = this.props.dataset;
		const genes = selection.split(/[,;'"`\s]+/g);

		let validGenes = [];
		const { rowToGenes, geneToRowLowerCase } = col;
		for (let i = 0; i < genes.length; i++) {
			const geneIdx = geneToRowLowerCase[genes[i].toLowerCase()];
			if (geneIdx !== undefined) {
				validGenes.push(rowToGenes[geneIdx]);
			}
		}
		return uniq(validGenes);
	}

	render() {
		const col = this.props.dataset.col;
		return (
			<div><div className={'view'}>
				<div style={{ flex: 8 }}>
					<Select
						placeholder={'Type to search'}
						options={this.state.selectOptions}
						filterOptions={col.dropdownOptions.keyAttr}
						onChange={this.addSelection}
						style={this.props.style}
						maxHeight={100}
					/>
				</div>
				<Button
					bsStyle={'default'}
					style={{ flex: 1 }}
					onClick={this.applySelection} >
					Apply
					</Button>
			</div>
				<FormControl
					componentClass={'textarea'}
					rows={6}
					placeholder={'Paste genes here or use the dropdown above to search \n\n(don\'t worry about duplicate or incorrect entries, capitalization, commas, semicolons, or quotations. "Apply Selection" fixes and filters this)'}
					onChange={this.handleTextAreaChange}
					value={this.state.selectedGenes} />

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