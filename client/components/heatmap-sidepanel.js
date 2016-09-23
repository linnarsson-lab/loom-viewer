import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { FetchGeneComponent } from './fetch-gene';
import { PrintSettings } from './print-settings';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';

export const HeatmapSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const { heatmapState } = dataSet;

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: 'SET_HEATMAP_PROPS',
				datasetName: dataSet.dataset,
				heatmapState: { [field]: value },
			});
		};
	};


	let colAttrOptions = Object.keys(dataSet.colAttrs);
	colAttrOptions.sort();
	colAttrOptions.push('(gene)');
	const colAttrHC = handleChangeFactory('colAttr');
	const colModeHC = handleChangeFactory('colMode');
	if (heatmapState.colAttr === '(gene)') {
		// abusing JS' weird function scoping
		var colGeneHC = handleChangeFactory('colGene');
		var fetchColGene = (
			<FetchGeneComponent
				dataSet={dataSet}
				dispatch={dispatch}
				onChange={colGeneHC}
				value={heatmapState.colGene} />
		);
	}
	let rowAttrOptions = Object.keys(dataSet.rowAttrs);
	rowAttrOptions.sort();
	rowAttrOptions.push('(gene positions)');
	const rowAttrHC = handleChangeFactory('rowAttr');
	const rowModeHC = handleChangeFactory('rowMode');
	if (heatmapState.rowAttr === '(gene positions)') {
		var rowGeneHC = handleChangeFactory('rowGene');
		var fetchRowGene = (
			<FetchGeneComponent
				dataSet={dataSet}
				dispatch={dispatch}
				onChange={rowGeneHC}
				value={heatmapState.rowGene}
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
						value={heatmapState.colAttr}
						options={colAttrOptions}
						onChange={colAttrHC}
						/>
					{fetchColGene}
					<label>Show cell attribute as</label>
					<DropdownMenu
						value={heatmapState.colMode}
						options={optionNames}
						onChange={colModeHC}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<label>Gene attribute to display</label>
					<DropdownMenu
						value={heatmapState.rowAttr}
						options={rowAttrOptions}
						onChange={rowAttrHC}
						/>
					{fetchRowGene}
					<label>Display gene attribute as</label>
					<DropdownMenu
						value={heatmapState.rowMode}
						options={optionNames}
						onChange={rowModeHC}
						/>
				</ListGroupItem>
				<PrintSettings
					dispatch={dispatch}
					dataSet={dataSet}
					stateName={'heatmapState'}
					actionType={'SET_HEATMAP_PROPS'} />
			</ListGroup>
		</Panel>
	);
};

HeatmapSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};