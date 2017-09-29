import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import VirtualizedSelect from 'react-virtualized-select';

import {
	FormControl,
} from 'react-bootstrap';

// import { nullFunc } from 'js/util';

const separator = /[,;'"`\s]+/g;
/**
 * Input: a string `text` with words separated by
 * `,` `:` `'` `"` or any whitespace character.
 *
 * Returns array of strings, converted to lowercase.
 * @param {string} text
 */
function stringToLowerCaseWords(text) {
	// https://run.perf.zone/view/split-and-lowerCase-order-1506606210077
	// In Firefox split-first is faster (9400 vs 7400 ops/sec)
	// In Chrome toLowerCase-first is faster (15,900 vs 14,900 ops/sec)
	// We optimise for the bottleneck, so we split first.
	let words = text.split(separator);
	for (let i = 0; i < words.length; i++) {
		words[i] = words[i].toLowerCase();
	}
	return words;
}

/**
 * Filters out strings in `words` that do not have an
 * associated row number in the passed `rowDict`.
 *
 * `rowToGenes` is used to correct spelling/capitalisation
 * @param {string[]} words
 * @param {object} rowDict
 * @param {object} rowToGenes
 */
function filterWords(words, rowDict, rowToGenes) {
	let selected = [];
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		// we only care for words that have a row in the dataset,
		// we only want to store the last time a word is mentioned.
		const row = rowDict[word];
		if (typeof row === 'number' &&
			words.indexOf(word, i + 1) === -1) {
			selected.push(rowToGenes[row]);
		}
	}
	return selected;
}


/**
 * If `value` is not yet in `array`, concatenate it.
 *
 * Otherwise, bump the first occurrence to the end of array.
 *
 * If already at the end, return the original array
 * @param {array} array
 * @param {*} value
 */
function appendIfMissing(array, value) {
	let idx = array.indexOf(value);
	if (idx === -1) {
		// if not present, add gene to end of selection.
		array = array.concat(value);
	} else if (idx !== array.length - 1) {
		// gene already selected, move it to end
		// of the selection unless already there
		array = array.slice(0);
		let t = array[idx];
		while (++idx < array.length) {
			array[idx - 1] = array[idx];
		}
		array[idx - 1] = t;
	}
	return array;
}

/**
 * Shallow-compare all values in arrays with ===
 * @param {*[]} arr1
 * @param {*[]} arr2
 */
function arrayEqual(arr1, arr2) {
	if (arr1 === arr2) {
		return true;
	} else if (arr1.length !== arr2.length) {
		return false;
	} else {
		// Given that we append text at the end,
		// differences will more likely show up
		// at the end too.
		// looping back to front should be faster.
		let i = arr1.length;
		while (i--) {
			if (arr1[i] !== arr2[i]) {
				return false;
			}
		}
		return true;
	}
}

// TODO: document how SelectGeneComponent works and what it expects
export class SelectGeneComponent extends PureComponent {

	constructor(...args) {
		super(...args);

		const {
			geneToRowLowerCase,
			rowToGenes,
			geneKeys,
			dropdownOptions,
		} = this.props.dataset.col;

		const lowerCase = this.props.selectedGenes
			.map((gene) => {
				return gene.toLowerCase();
			});

		const selectedGenes = filterWords(lowerCase, geneToRowLowerCase, rowToGenes);
		const selectedGenesText = selectedGenes.length ?
			selectedGenes.join(', ') :
			'';

		const selectOptions = geneKeys.map((gene) => {
			return {
				value: gene,
				label: gene,
			};
		});

		this.addGene = this.addGene.bind(this);
		this.handleTextAreaChange = this.handleTextAreaChange.bind(this);

		this.state = {
			validated: true,
			selectedGenes,
			selectedGenesText,
			filterOptions: dropdownOptions.keyAttr,
			selectOptions,
			rowDict: geneToRowLowerCase,
			rowToGenes,
		};
	}

	componentWillMount(){
		// We want to avoid side-effects in constructors, so we only dispatch here
		this.props.onChange && this.props.onChange(this.state.selectedGenes);
	}

	handleTextAreaChange(event){
		let newState = {
			selectedGenesText: event.target.value,
		};

		// TODO: fix behaviour when typing over selected text

		// Typing a separator should trigger a validation.
		const k = event.key;
		newState.validated = (
			k === ' ' ||
			k === ',' ||
			k === 'Enter' ||
			k === ';'
		);

		// TODO: implement character deletion.
		// Typing backspace and delete should only validate
		// if a gene is fully removed.
		// const deleteKey = (
		// 	k === 'Backspace' ||
		// 	k === 'Delete'
		// );

		// TODO: Implement caret position fixer
		// when validated, we need a callback to fix caret position
		// otherwise we'll just pass undefined to setState() later.
		let caretFixer;
		if (newState.validated) {
			const splitWords = stringToLowerCaseWords(newState.selectedGenesText);
			const nSelection = filterWords(splitWords, this.state.rowDict, this.state.rowToGenes);
			this.props.onChange(nSelection);
			newState.selectedGenes = nSelection.slice(0);
			// if (!deleteKey){
			// add ', ' at the end
			nSelection.push('');
			// }
			newState.selectedGenesText = nSelection.join(', ');

			// save caret position for later
		}

		const updater = () => { return newState; };
		this.setState(updater, caretFixer);
	}

	addGene(selectValue){
		let value = selectValue && selectValue.value;
		if (value) {
			let {
				validated,
				selectedGenesText,
				selectedGenes,
				rowDict,
				rowToGenes,
			} = this.state;

			let selectionChanged = false;
			if (validated) {
				// our textarea is already corrected,
				// so we can skip changing it and directly
				// test the gene array
				let nSelection = appendIfMissing(selectedGenes, value);
				// because we return the same array if nothing changes,
				// a direct comparison will suffice here.
				selectionChanged = nSelection !== selectedGenes;
				selectedGenes = nSelection;
			} else {

				// our textarea has been typed in,
				// and may contain an invalid gene.
				let nSelection = stringToLowerCaseWords(
					selectedGenesText + ', ' + value
				);
				nSelection = filterWords(nSelection, rowDict, rowToGenes);
				selectionChanged = !arrayEqual(selectedGenes, nSelection);
				if (selectionChanged) {
					selectedGenes = nSelection;
				}
				validated = true;
			}

			if (selectionChanged) {
				// trigger onChange callback, if present
				this.props.onChange && this.props.onChange(selectedGenes);
			}

			// update state
			const newState = {
				validated,
				selectedGenes,
				selectedGenesText: selectedGenes.join(', '),
			};
			this.setState(() => {
				return newState;
			});

		}
	}

	render() {
		return (
			<div>
				<VirtualizedSelect
					placeholder={'Type to search'}
					options={this.state.selectOptions}
					filterOptions={this.state.filterOptions}
					onChange={this.addGene}
					style={this.props.style}
					maxHeight={100}
				/>
				<FormControl
					className='scroll'
					type='text'
					componentClass={'textarea'}
					rows={8}
					placeholder={'Paste genes here or use the dropdown above to search \n\n(Don\'t worry about capitalization, commas, semicolons, or quotations. This is automatically corrected. Duplicate or incorrect entries are removed)'}
					onChange={this.handleTextAreaChange}
					onKeyDown={this.handleTextAreaChange}
					value={this.state.selectedGenesText} />
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