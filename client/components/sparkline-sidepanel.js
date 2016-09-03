import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';
import { fetchGene } from '../actions/actions.js';
import { forEach } from 'lodash';

export const SparklineSidepanel = function (props) {
	const { dispatch, sparklineState, dataSet, fetchedGenes, selectableGenes } = props;

	const colAttrsSorted = Object.keys(dataSet.colAttrs).sort();
	let orderByOptions = Object.keys(dataSet.colAttrs).sort();
	orderByOptions.unshift('(gene)');
	orderByOptions.unshift('(original order)');
	const optionsForCols = ['Bars', 'Heatmap', 'Categorical'];
	const optionsForGenes = ['Bars', 'Heatmap'];

	return (
		<Panel
			className='sidepanel'
			key='sparkline-settings'
			header='Settings'
			bsStyle='default'>
			<ListGroup fill>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Order by'}
						buttonName={sparklineState.orderByAttr}
						attributes={orderByOptions}
						actionType={'SET_SPARKLINE_PROPS'}
						actionName={'orderByAttr'}
						dispatch={dispatch}
						/>
					<div className='btn-group btn-block'>
						{ sparklineState.orderByAttr === '(gene)' ?
							<FetchGeneComponent
								dataSet={dataSet}
								fetchedGenes={fetchedGenes}
								selectableGenes={selectableGenes}
								dispatch={dispatch}
								actionType={'SET_SPARKLINE_PROPS'}
								actionName={'orderByGene'} /> : null }
					</div>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Show cell attribute'}
						buttonName={sparklineState.colAttr}
						attributes={colAttrsSorted}
						actionType={'SET_SPARKLINE_PROPS'}
						actionName={'colAttr'}
						dispatch={dispatch}
						/>
					<DropdownMenu
						buttonName={sparklineState.colMode}
						attributes={optionsForCols}
						actionType={'SET_SPARKLINE_PROPS'}
						actionName={'colMode'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<label>Show genes</label>
					<textarea
						className='form-control'
						rows='5'
						value={sparklineState.genes}
						onChange={
							(event) => {
								dispatch({
									type: 'SET_SPARKLINE_PROPS',
									genes: event.target.value,
								});
								forEach(
									event.target.value.trim().split(/[ ,\r\n]+/),
									(gene) => {
										dispatch(
											fetchGene(dataSet, gene, fetchedGenes)
										);
									}
								);
							}
						}>
					</textarea>
					<FetchGeneComponent
						dataSet={dataSet}
						fetchedGenes={fetchedGenes}
						selectableGenes={selectableGenes}
						dispatch={dispatch}
						actionType={'SET_SPARKLINE_PROPS'}
						actionName={'genes'}
						multi
						clearable
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonName={sparklineState.geneMode}
						attributes={optionsForGenes}
						actionType={'SET_SPARKLINE_PROPS'}
						actionName={'geneMode'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
			</ListGroup>
		</Panel>
	);
};

SparklineSidepanel.propTypes = {
	sparklineState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	fetchedGenes: PropTypes.array.isRequired,
	selectableGenes: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
};