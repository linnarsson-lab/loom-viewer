import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { FetchGeneComponent } from './fetch-gene';
//import { PrintSettings } from './print-settings';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

export const HeatmapSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const { heatmap } = dataSet.viewState;

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'heatmap',
				datasetName: dataSet.dataset,
				viewState: { heatmap: { [field]: value } },
			});
		};
	};


	let colAttrOptions = Object.keys(dataSet.colAttrs);
	colAttrOptions.sort();
	colAttrOptions.push('(gene)');
	const colAttrHC = handleChangeFactory('colAttr');
	const colModeHC = handleChangeFactory('colMode');
	if (heatmap.colAttr === '(gene)') {
		// abusing JS' weird function scoping
		var colGeneHC = handleChangeFactory('colGene');
		var fetchColGene = (
			<FetchGeneComponent
				dataSet={dataSet}
				dispatch={dispatch}
				onChange={colGeneHC}
				value={heatmap.colGene} />
		);
	}
	let rowAttrOptions = Object.keys(dataSet.rowAttrs);
	rowAttrOptions.sort();
	rowAttrOptions.push('(gene positions)');
	const rowAttrHC = handleChangeFactory('rowAttr');
	const rowModeHC = handleChangeFactory('rowMode');
	if (heatmap.rowAttr === '(gene positions)') {
		// var is on purpose here; abusing function-scope
		var rowGeneHC = handleChangeFactory('rowGene');
		var fetchRowGene = (
			<FetchGeneComponent
				dataSet={dataSet}
				dispatch={dispatch}
				onChange={rowGeneHC}
				value={heatmap.rowGene}
				multi clearable />
		);
	}
	let optionNames = ['Text', 'Bars', 'Heatmap', 'Categorical'];

	return (
		<Panel
			className='sidepanel'
			key='heatmap-settings'
			header='Settings'
			bsStyle='default'>
			<ListGroup fill>
				<ListGroupItem>
					<label>Cell attribute to show</label>
					<DropdownMenu
						value={heatmap.colAttr}
						options={colAttrOptions}
						onChange={colAttrHC}
						/>
					{fetchColGene}
					<label>Show cell attribute as</label>
					<DropdownMenu
						value={heatmap.colMode}
						options={optionNames}
						onChange={colModeHC}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<label>Gene attribute to display</label>
					<DropdownMenu
						value={heatmap.rowAttr}
						options={rowAttrOptions}
						onChange={rowAttrHC}
						/>
					{fetchRowGene}
					<label>Display gene attribute as</label>
					<DropdownMenu
						value={heatmap.rowMode}
						options={optionNames}
						onChange={rowModeHC}
						/>
				</ListGroupItem>
			</ListGroup>
		</Panel>
	);
};

HeatmapSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};