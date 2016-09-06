import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';
import { fetchGene } from '../actions/actions.js';
import { debounce } from 'lodash';

export const SparklineSidepanel = function (props) {
	const { dispatch, sparklineState, dataSet, fetchedGenes, selectableGenes } = props;

	const dispatchFetchGenes = (genes) => {
		dispatch(fetchGene(dataSet, genes, fetchedGenes));
	};
	// don't fire too often
	const debouncedFetch = debounce(dispatchFetchGenes, 200);
	const fetchShownGenes = (event) => {
		dispatch({
			type: 'SET_SPARKLINE_PROPS',
			genes: event.target.value,
		});
		const genes = event.target.value.trim().split(/[ ,\r\n]+/);
		debouncedFetch(genes);
	};

	const colAttrsSorted = Object.keys(dataSet.colAttrs).sort();
	let orderByOptions = Object.keys(dataSet.colAttrs).sort();
	orderByOptions.unshift('(gene)');
	orderByOptions.unshift('(original order)');
	const optionsForCols = ['Bars', 'Categorical', 'Heatmap'];
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
					{ sparklineState.orderByAttr === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							fetchedGenes={fetchedGenes}
							selectableGenes={selectableGenes}
							dispatch={dispatch}
							actionType={'SET_SPARKLINE_PROPS'}
							actionName={'orderByGene'} /> : null }
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
						onChange={fetchShownGenes}>
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
					<DropdownMenu
						buttonLabel={'Show genes as'}
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
	fetchedGenes: PropTypes.object.isRequired,
	selectableGenes: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
};