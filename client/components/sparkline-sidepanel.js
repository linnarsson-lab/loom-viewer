import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';
import { fetchGene } from '../actions/actions.js';

import { forEach } from 'lodash';

export const SparklineSidepanel = function (props) {
	const { dispatch, sparklineState, dataSet, geneCache, geneList } = props;

	// // The full list of available genes is part of rowAttrs
	// // Not to be confused with gene data that has been fetched!
	// const geneList = dataSet.rowAttrs.Gene;

	const colAttrsSorted = Object.keys(dataSet.colAttrs).sort();
	let orderByOptions = Object.keys(dataSet.colAttrs).sort();
	orderByOptions.unshift('(gene)');
	orderByOptions.unshift('(original order)');
	const optionsForCols = ['Text', 'Bars', 'Heatmap', 'Categorical'];
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
						attrType={'SET_SPARKLINE_PROPS'}
						attrName={'orderByAttr'}
						dispatch={dispatch}
						/>
					<div className='btn-group btn-block'>
						{ sparklineState.orderByAttr === '(gene)' ?
							<FetchGeneComponent
								dataSet={dataSet}
								geneCache={geneCache}
								geneList={geneList}
								dispatch={dispatch}
								attrType={'SET_SPARKLINE_PROPS'}
								attrName={'orderByGene'} /> : null }
					</div>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Show cell attribute'}
						buttonName={sparklineState.colAttr}
						attributes={colAttrsSorted}
						attrType={'SET_SPARKLINE_PROPS'}
						attrName={'colAttr'}
						dispatch={dispatch}
						/>
					<DropdownMenu
						buttonName={sparklineState.colMode}
						attributes={optionsForCols}
						attrType={'SET_SPARKLINE_PROPS'}
						attrName={'colMode'}
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
											fetchGene(dataSet, gene, geneCache)
										);
									}
								);
							}
						}>
					</textarea>

							<FetchGeneComponent
								dataSet={dataSet}
								geneCache={geneCache}
								geneList={geneList}
								dispatch={dispatch}
								attrType={'SET_SPARKLINE_PROPS'}
								attrName={'genes'}
								multi
								clearable
								/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonName={sparklineState.geneMode}
						attributes={optionsForGenes}
						attrType={'SET_SPARKLINE_PROPS'}
						attrName={'geneMode'}
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
	geneCache: PropTypes.array.isRequired,
	geneList: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
};