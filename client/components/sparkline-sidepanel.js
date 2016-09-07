import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';
import { fetchGene } from '../actions/actions.js';
import { debounce } from 'lodash';

export const SparklineSidepanel = function (props) {
	const { dispatch, sparklineState, dataSet } = props;

	const dispatchFetchGenes = (genes) => {
		dispatch(fetchGene(dataSet, genes));
	};
	// don't fire too often
	const debouncedFetch = debounce(dispatchFetchGenes, 200);

	const fetchShownGenes = (event) => {
		dispatch({
			type: 'SET_SPARKLINE_PROPS',
			datasetName: dataSet.dataset,
			sparklineState: { genes: event.target.value },
		});
		const genes = event.target.value.trim().split(/[ ,\r\n]+/);
		debouncedFetch(genes);
	};

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: 'SET_SPARKLINE_PROPS',
				datasetName: dataSet.dataset,
				sparklineState: { [field]: value },
			});
		};
	};

	const colAttrsOptions = Object.keys(dataSet.colAttrs).sort();
	const colAttrsHC = handleChangeFactory('colAttr');

	let orderByOptions = Object.keys(dataSet.colAttrs).sort();
	orderByOptions.unshift('(gene)');
	orderByOptions.unshift('(original order)');
	const orderByHC = handleChangeFactory('orderByAttr');
	const orderByGeneHC = handleChangeFactory('orderByGene');

	const colModeOptions = ['Bars', 'Categorical', 'Heatmap'];
	const colModeHC = handleChangeFactory('colMode');

	const genesHC = handleChangeFactory('genes');

	const geneModeOptions = ['Bars', 'Heatmap'];
	const geneModeHC = handleChangeFactory('geneMode');

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
						options={orderByOptions}
						onChange={orderByHC}
						/>
					{ sparklineState.orderByAttr === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={orderByGeneHC} /> : null }
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Show cell attribute'}
						buttonName={sparklineState.colAttr}
						options={colAttrsOptions}
						onChange={colAttrsHC}
						/>
					<DropdownMenu
						buttonName={sparklineState.colMode}
						options={colModeOptions}
						onChange={colModeHC}
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
						dispatch={dispatch}
						onChange={genesHC}
						multi
						clearable
						/>
					<DropdownMenu
						buttonLabel={'Show genes as'}
						buttonName={sparklineState.geneMode}
						options={geneModeOptions}
						onChange={geneModeHC}
						/>
				</ListGroupItem>
			</ListGroup>
		</Panel>
			);
};

SparklineSidepanel.propTypes = {
	sparklineState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};