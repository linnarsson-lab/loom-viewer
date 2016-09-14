import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem,
	Button } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';

export const SparklineSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const { sparklineState } = dataSet;

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
	const orderBy1HC = handleChangeFactory('orderByAttr1');
	const orderByGene1HC = handleChangeFactory('orderByGene1');
	const orderBy2HC = handleChangeFactory('orderByAttr2');
	const orderByGene2HC = handleChangeFactory('orderByGene2');
	const orderBy3HC = handleChangeFactory('orderByAttr3');
	const orderByGene3HC = handleChangeFactory('orderByGene3');

	const colModeOptions = ['Bars', 'Categorical', 'Heatmap'];
	const colModeHC = handleChangeFactory('colMode');

	const genesHC = handleChangeFactory('genes');

	const geneModeOptions = ['Bars', 'Heatmap'];
	const geneModeHC = handleChangeFactory('geneMode');

	const showLabels = handleChangeFactory('showLabels');
	const showLabelsHC = () => { showLabels(!sparklineState.showLabels); };


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
						buttonName={sparklineState.orderByAttr1}
						options={orderByOptions}
						onChange={orderBy1HC}
						/>
					{ sparklineState.orderByAttr1 === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={orderByGene1HC}
							value={sparklineState.orderByGene1} /> : null }
					<DropdownMenu
						buttonName={sparklineState.orderByAttr2}
						options={orderByOptions}
						onChange={orderBy2HC}
						/>
					{ sparklineState.orderByAttr2 === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={orderByGene2HC}
							value={sparklineState.orderByGene2} /> : null }
					<DropdownMenu
						buttonName={sparklineState.orderByAttr3}
						options={orderByOptions}
						onChange={orderBy3HC}
						/>
					{ sparklineState.orderByAttr3 === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={orderByGene3HC}
							value={sparklineState.orderByGene3} /> : null }
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
					<FetchGeneComponent
						dataSet={dataSet}
						dispatch={dispatch}
						onChange={genesHC}
						value={sparklineState.genes}
						multi
						clearable
						/>
					<DropdownMenu
						buttonLabel={'Show genes as'}
						buttonName={sparklineState.geneMode}
						options={geneModeOptions}
						onChange={geneModeHC}
						/>
					<Button
						bsStyle={ sparklineState.showLabels ? 'success' : 'default' }
						onClick={showLabelsHC}
						>
						Show labels
					</Button>
				</ListGroupItem>
			</ListGroup>
		</Panel>
	);
};

SparklineSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};