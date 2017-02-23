import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { FetchGeneComponent } from './fetch-gene';
//import { PrintSettings } from './print-settings';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

export const HeatmapSidepanel = function (props) {
	const { dispatch, dataset } = props;
	const hms = dataset.viewState.heatmap;

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'heatmap',
				path: dataset.path,
				viewState: { heatmap: { [field]: value } },
			});
		};
	};


	let colAttrOptions = dataset.col.keys.slice(0);
	colAttrOptions.sort();
	colAttrOptions.push('(gene)');
	const colAttrHC = handleChangeFactory('colAttr');
	const colModeHC = handleChangeFactory('colMode');
	if (hms.colAttr === '(gene)') {
		// abusing JS' weird function scoping
		var colGeneHC = handleChangeFactory('colGene');
		var fetchColGene = (
			<FetchGeneComponent
				dataset={dataset}
				dispatch={dispatch}
				onChange={colGeneHC}
				value={hms.colGene} />
		);
	}
	let rowAttrOptions = dataset.row.keys.slice(0);
	rowAttrOptions.sort();
	rowAttrOptions.push('(gene positions)');
	const rowAttrHC = handleChangeFactory('rowAttr');
	const rowModeHC = handleChangeFactory('rowMode');
	if (hms.rowAttr === '(gene positions)') {
		// var is on purpose here; abusing function-scope
		var rowGeneHC = handleChangeFactory('rowGene');
		var fetchRowGene = (
			<FetchGeneComponent
				dataset={dataset}
				dispatch={dispatch}
				onChange={rowGeneHC}
				value={hms.rowGene}
				multi clearable />
		);
	}
	let optionNames = ['Text', 'Bars', 'Categorical', 'Heatmap', 'Heatmap2'];

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
						value={hms.colAttr}
						options={colAttrOptions}
						onChange={colAttrHC}
						/>
					{fetchColGene}
					<label>Show cell attribute as</label>
					<DropdownMenu
						value={hms.colMode}
						options={optionNames}
						onChange={colModeHC}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<label>Gene attribute to display</label>
					<DropdownMenu
						value={hms.rowAttr}
						options={rowAttrOptions}
						onChange={rowAttrHC}
						/>
					{fetchRowGene}
					<label>Display gene attribute as</label>
					<DropdownMenu
						value={hms.rowMode}
						options={optionNames}
						onChange={rowModeHC}
						/>
				</ListGroupItem>
			</ListGroup>
		</Panel>
	);
};

HeatmapSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};