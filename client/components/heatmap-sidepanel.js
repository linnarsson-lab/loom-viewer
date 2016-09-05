import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';

export const HeatmapSidepanel = function (props) {
	const { dispatch, heatmapState, dataSet, fetchedGenes } = props;

	let colAttrKeys = Object.keys(dataSet.colAttrs);
	colAttrKeys.sort();
	colAttrKeys.push('(gene)');
	let rowAttrKeys = Object.keys(dataSet.rowAttrs);
	rowAttrKeys.sort();
	rowAttrKeys.push('(gene positions)');
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
						attributes={colAttrKeys}
						actionType={'SET_HEATMAP_PROPS'}
						actionName={'colAttr'}
						dispatch={dispatch}
						/>
					{heatmapState.colAttr === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							fetchedGenes={fetchedGenes}
							selectableGenes={dataSet.rowAttrs.Gene}
							dispatch={dispatch}
							actionType={'SET_HEATMAP_PROPS'}
							actionName={'colGene'} /> : null }
					<DropdownMenu
						buttonLabel={'Show cell attribute as'}
						buttonName={heatmapState.colMode}
						attributes={optionNames}
						actionType={'SET_HEATMAP_PROPS'}
						actionName={'colMode'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Gene attribute to display'}
						buttonName={heatmapState.rowAttr}
						attributes={rowAttrKeys}
						actionType={'SET_HEATMAP_PROPS'}
						actionName={'rowAttr'}
						dispatch={dispatch}
						/>
					{
						(heatmapState.rowAttr === '(gene positions)') ?
							<textarea className='form-control' placeholder='Genes'
								value={heatmapState.rowGenes}
								onChange={
									(event) => {
										dispatch({
											type: 'SET_HEATMAP_PROPS',
											rowGenes: event.target.value,
										});
									}
								} />
							:
							null
					}
					<DropdownMenu
								buttonLabel={'Display gene attribute as'}
								buttonName={heatmapState.rowMode}
								attributes={optionNames}
								actionType={'SET_HEATMAP_PROPS'}
								actionName={'rowMode'}
								dispatch={dispatch}
								/>
				</ListGroupItem>
			</ListGroup>
		</Panel>
	);
};

HeatmapSidepanel.propTypes = {
	heatmapState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	fetchedGenes: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};