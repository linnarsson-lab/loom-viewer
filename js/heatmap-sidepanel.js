import React, { Component, PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { fetchGene } from './actions.js';

export class HeatmapSidepanel extends Component {
	render() {
		const { dispatch, heatmapState, dataState } = this.props;

		const colAttrKeys = Object.keys(dataState.currentDataset.colAttrs).sort().push("(gene)");
		const rowAttrKeys = Object.keys(dataState.currentDataset.colAttrs).sort().push("(gene positions)");
		const optionNames = ["Text", "Bars", "Heatmap", "Categorical"];

		return (
			<div className='panel panel-default'>
				<div className='panel-heading'><h3 className='panel-title'>Settings</h3></div>
				<div className='panel-body'>
					<form>

						<DropdownMenu
							buttonLabel={'Show cell attribute'}
							buttonName={heatmapState.colAttr}
							attributes={colAttrKeys}
							attrType={'SET_HEATMAP_PROPS'}
							attrName={'colAttr'}
							dispatch={dispatch}
							/>

						<DropdownMenu
							buttonLabel={undefined}
							buttonName={heatmapState.colMode}
							attributes={optionNames}
							attrType={'SET_HEATMAP_PROPS'}
							attrName={'colMode'}
							dispatch={dispatch}
							/>

						<div className='form-group'>
							<div className='btn-group btn-block'>
								{heatmapState.colAttr === "(gene)" ?
									<input
										className='form-control'
										placeholder='Gene'
										value={heatmapState.colGene}
										onChange={
											(event) => {
												dispatch({ type: 'SET_HEATMAP_PROPS', colGene: event.target.value });
												dispatch(fetchGene(dataState.currentDataset, event.target.value, dataState.genes));
											}
										}/>
									:
									<span></span>
								}
							</div>
						</div>

						<DropdownMenu
							buttonLabel={'Show gene attribute'}
							buttonName={heatmapState.rowAttr}
							attributes={rowAttrKeys}
							attrType={'SET_HEATMAP_PROPS'}
							attrName={'rowAttr'}
							dispatch={dispatch}
							/>
						{
							(heatmapState.rowAttr === '(gene positions)') ?
								<div className='form-group'>
									<div className='btn-group btn-block'>
										<textarea className='form-control' placeholder='Genes'
											value={heatmapState.rowGenes}
											onChange={
												(event) => { dispatch({ type: 'SET_HEATMAP_PROPS', rowGenes: event.target.value }); }
											}/>
									</div>
								</div>
								:
								<DropdownMenu
									buttonLabel={undefined}
									buttonName={heatmapState.rowMode}
									attributes={optionNames}
									attrType={'SET_HEATMAP_PROPS'}
									attrName={'rowMode'}
									dispatch={dispatch}
									/>
						}
					</form>
				</div>
			</div>
		);
	}
}

HeatmapSidepanel.propTypes = {
	heatmapState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};