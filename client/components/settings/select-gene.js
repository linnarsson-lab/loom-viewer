import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import VirtualizedSelect from 'react-virtualized-select';
import {
	FormControl,
} from 'react-bootstrap';

import {
	uniq,
	difference,
	isEqual,
} from 'lodash';

function filterValidGenes(selection, geneToRowLowerCase, rowToGenes) {
	const genes = selection.split(/[,;'"`\s]+/g);
	let validGenes = [];
	for (let i = 0; i < genes.length; i++) {
		const geneIdx = geneToRowLowerCase[genes[i].toLowerCase()];
		if (geneIdx !== undefined) {
			validGenes.push(rowToGenes[geneIdx]);
		}
	}
	return uniq(validGenes);
}

// TODO: document how SelectGeneComponent works and what it expects
export class SelectGeneComponent extends PureComponent {

	constructor(props) {
		super(props);
		this.addSelection = this.addSelection.bind(this);
		this.handleTextAreaChange = this.handleTextAreaChange.bind(this);
	}

	componentWillMount() {
		let {
			selectedGenes,
			dataset,
			onChange,
		} = this.props;

		const {
			geneKeys,
			geneToRowLowerCase,
			rowToGenes,
		} = dataset.col;

		let i = geneKeys.length, selectOptions = new Array(i);
		while (i--) {
			selectOptions[i] = {
				value: geneKeys[i],
				label: geneKeys[i],
			};
		}
		let validGenes;
		if (selectedGenes && selectedGenes.length) {
			selectedGenes = selectedGenes.join(', ');
			validGenes = filterValidGenes(selectedGenes, geneToRowLowerCase, rowToGenes);
			let diff = difference(selectedGenes, validGenes);
			let diff2 = difference(validGenes, selectedGenes);
			if (diff.length + diff2.length) {
				// difference length is only non-zero when
				// some values in validGenes have changed
				onChange(validGenes);
				selectedGenes = validGenes.join(', ');
			}
		}

		this.setState({
			selectOptions,
			validGenes,
			selectedGenes,
			geneToRowLowerCase,
			rowToGenes,
		});
	}

	addSelection(selectValue) {
		const { onChange } = this.props;
		let {
			selectedGenes,
			validGenes,
			geneToRowLowerCase,
			rowToGenes,
		} = this.state;
		selectedGenes = selectedGenes ? selectedGenes + ' ' + selectValue.value : selectValue.value;

		let newValidGenes = filterValidGenes(selectedGenes, geneToRowLowerCase, rowToGenes);

		if (!isEqual(validGenes, newValidGenes) && onChange) {
			onChange(newValidGenes);
		}
		this.setState({
			validGenes: newValidGenes,
			selectedGenes: newValidGenes.join(', '),
		});
	}

	handleTextAreaChange(event) {
		let selectedGenes = event.target.value;
		let {
			validGenes,
			geneToRowLowerCase,
			rowToGenes,
		} = this.state;

		switch (event.key) {
			case 'Enter':
			case ' ':
			case ',':
			case ';':
				validGenes = filterValidGenes(selectedGenes, geneToRowLowerCase, rowToGenes);
				this.props.onChange(validGenes);
				selectedGenes = validGenes.join(', ');
				break;
			default:
		}
		this.setState({ validGenes, selectedGenes });
	}

	render() {
		const col = this.props.dataset.col;
		return (
			<div>
				<VirtualizedSelect
					placeholder={'Type to search'}
					options={this.state.selectOptions}
					filterOptions={col.dropdownOptions.keyAttr}
					onChange={this.addSelection}
					style={this.props.style}
					maxHeight={100}
				/>
				<FormControl
					className='scroll'
					componentClass={'textarea'}
					rows={8}
					placeholder={'Paste genes here or use the dropdown above to search \n\n(Don\'t worry about capitalization, commas, semicolons, or quotations. This is automatically corrected. Duplicate or incorrect entries are removed)'}
					onChange={this.handleTextAreaChange}
					onKeyPress={this.handleTextAreaChange}
					value={this.state.selectedGenes} />
			</div>
		);
	}
}


SelectGeneComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	selectedGenes: PropTypes.arrayOf(PropTypes.string),
	onChange: PropTypes.func,
	style: PropTypes.object,
};