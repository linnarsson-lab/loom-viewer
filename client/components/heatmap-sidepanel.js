import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
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
		<div className='panel panel-default'>
			<div className='panel-heading'><h3 className='panel-title'>Settings</h3></div>
			<div className='panel-body'>
				<form>

					<DropdownMenu
						buttonLabel={'Show cell attribute'}
						buttonName={heatmapState.colAttr}
						attributes={colAttrKeys}
						actionType={'SET_HEATMAP_PROPS'}
						actionName={'colAttr'}
						dispatch={dispatch}
						/>

					<DropdownMenu
						buttonLabel={undefined}
						buttonName={heatmapState.colMode}
						attributes={optionNames}
						actionType={'SET_HEATMAP_PROPS'}
						actionName={'colMode'}
						dispatch={dispatch}
						/>

					<div className='form-group'>
						<div className='btn-group btn-block'>
							{heatmapState.colAttr === '(gene)' ?
								<FetchGeneComponent
									dataSet={dataSet}
									fetchedGenes={fetchedGenes}
									selectableGenes={dataSet.rowAttrs.Gene}
									dispatch={dispatch}
									actionType={'SET_HEATMAP_PROPS'}
									actionName={'colGene'} /> : null }
						</div>
					</div>

					<DropdownMenu
						buttonLabel={'Show gene attribute'}
						buttonName={heatmapState.rowAttr}
						attributes={rowAttrKeys}
						actionType={'SET_HEATMAP_PROPS'}
						actionName={'rowAttr'}
						dispatch={dispatch}
						/>
					{
						(heatmapState.rowAttr === '(gene positions)') ?
							<div className='form-group'>
								<div className='btn-group btn-block'>
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
								</div>
							</div>
							:
							<DropdownMenu
								buttonLabel={undefined}
								buttonName={heatmapState.rowMode}
								attributes={optionNames}
								actionType={'SET_HEATMAP_PROPS'}
								actionName={'rowMode'}
								dispatch={dispatch}
								/>
					}
				</form>
			</div>
		</div>
	);
};

HeatmapSidepanel.propTypes = {
	heatmapState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	fetchedGenes: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};