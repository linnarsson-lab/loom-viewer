import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';

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
	const colGeneHC = handleChangeFactory('colGene');
	const fetchColGene = heatmapState.colAttr === '(gene)' ? (
		<FetchGeneComponent
			dataSet={dataSet}
			dispatch={dispatch}
			onChange={colGeneHC}
			value={heatmapState.colGene} />) : null;

	let rowAttrOptions = Object.keys(dataSet.rowAttrs);
	rowAttrOptions.sort();
	rowAttrOptions.push('(gene positions)');
	const rowAttrHC = handleChangeFactory('rowAttr');
	const rowModeHC = handleChangeFactory('rowMode');
	const rowGeneHC = handleChangeFactory('rowGene');

	const fetchRowGene = (heatmapState.rowAttr === '(gene positions)') ? (
		<FetchGeneComponent
			dataSet={dataSet}
			dispatch={dispatch}
			onChange={rowGeneHC}
			value={heatmapState.rowGene}
			multi clearable />) : null;

	let optionNames = ['Text', 'Bars', 'Heatmap', 'Categorical'];

	return (
		<Panel
			className='sidepanel'
			key='heatmap-settings'
			header='Settings'
			bsStyle='default'>
			<ListGroup fill>
				<ListGroupItem>

					<DropdownMenu
						buttonLabel={'Cell attribute to show'}
						buttonName={heatmapState.colAttr}
						options={colAttrOptions}
						onChange={colAttrHC}
						/>
					{fetchColGene}
					<DropdownMenu
						buttonLabel={'Show cell attribute as'}
						buttonName={heatmapState.colMode}
						options={optionNames}
						onChange={colModeHC}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Gene attribute to display'}
						buttonName={heatmapState.rowAttr}
						options={rowAttrOptions}
						onChange={rowAttrHC}
						/>
					{fetchRowGene}
					<DropdownMenu
						buttonLabel={'Display gene attribute as'}
						buttonName={heatmapState.rowMode}
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