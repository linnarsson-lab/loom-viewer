import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { FetchGeneComponent } from './fetch-gene';
import { PrintSettings } from './print-settings';
import { Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup } from 'react-bootstrap';


export const LandscapeSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const landscapeState = dataSet.landscapeState;
	const { xCoordinate, yCoordinate, colorAttr, colorMode } = landscapeState;

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: 'SET_LANDSCAPE_PROPS',
				datasetName: dataSet.dataset,
				landscapeState: { [field]: value },
			});
		};
	};

	const colAttrsOptions = Object.keys(dataSet.colAttrs).sort();
	colAttrsOptions.push('(gene)');

	const xCoordinateHC = handleChangeFactory('xCoordinate');
	const xGeneHC = handleChangeFactory('xGene');

	const yCoordinateHC = handleChangeFactory('yCoordinate');
	const yGeneHC = handleChangeFactory('yGene');

	const colorAttrHC = handleChangeFactory('colorAttr');
	const colorGeneHC = handleChangeFactory('colorGene');
	const filterZeros = handleChangeFactory('filterZeros');
	const filterZerosHC = () => { filterZeros(!landscapeState.filterZeros); };

	const isTSNE = (xCoordinate === '_tSNE1') && (yCoordinate === '_tSNE2');
	const isPCA = (xCoordinate === '_PC1') && (yCoordinate === '_PC2');

	return (
		<Panel
			className='sidepanel'
			key='landscape-settings'
			header='Settings'
			bsStyle='default'>

			<ListGroup fill>
				<ListGroupItem>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={ isTSNE ? 'success' : 'default' }
								onClick={ () => {
									dispatch({
										type: 'SET_LANDSCAPE_PROPS',
										datasetName: dataSet.dataset,
										landscapeState: {
											xCoordinate: '_tSNE1',
											yCoordinate: '_tSNE2',
										},
									});
								} }>
								tSNE
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={ isPCA ? 'success' : 'default' }
								onClick={ () => {
									dispatch({
										type: 'SET_LANDSCAPE_PROPS',
										datasetName: dataSet.dataset,
										landscapeState: {
											xCoordinate: '_PC1',
											yCoordinate: '_PC2',
										},
									});
								} }>
								PCA
							</Button>
						</ButtonGroup>
					</ButtonGroup>
				</ListGroupItem>
				<ListGroupItem>
					<label>X Coordinate</label>
					<DropdownMenu
						value={xCoordinate}
						options={colAttrsOptions}
						onChange={xCoordinateHC}
						/>
					{ xCoordinate === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={xGeneHC}
							value={landscapeState.xGene}
							/> : null }
				</ListGroupItem>
				<ListGroupItem>
					<label>Y Coordinate</label>
					<DropdownMenu
						value={yCoordinate}
						options={colAttrsOptions}
						onChange={yCoordinateHC}
						/>
					{ yCoordinate === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={yGeneHC}
							value={landscapeState.yGene}
							/> : null }
				</ListGroupItem>
				<ListGroupItem>
					<label>Color</label>
					<DropdownMenu
						value={colorAttr}
						options={colAttrsOptions}
						onChange={colorAttrHC}
						/>
					{ colorAttr === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={colorGeneHC}
							value={landscapeState.colorGene}
							/>
						: null }
					<Button
						bsStyle={ landscapeState.filterZeros ? 'success' : 'default' }
						onClick={filterZerosHC}
						>
						Filter zeros
					</Button>
				</ListGroupItem>
				<ListGroupItem>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={ colorMode === 'Heatmap' ? 'success' : 'default' }
								onClick={ () => {
									dispatch({
										type: 'SET_LANDSCAPE_PROPS',
										datasetName: dataSet.dataset,
										landscapeState: { colorMode: 'Heatmap' },
									});
								} }>
								Heatmap
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={ colorMode === 'Categorical' ? 'success' : 'default' }
								onClick={ () => {
									dispatch({
										type: 'SET_LANDSCAPE_PROPS',
										datasetName: dataSet.dataset,
										landscapeState: { colorMode: 'Categorical' },
									});
								} }>
								Categorical
							</Button>
						</ButtonGroup>
					</ButtonGroup>
				</ListGroupItem>
				<PrintSettings
					dispatch={dispatch}
					dataSet={dataSet}
					stateName={'landscapeState'}
					actionType={'SET_LANDSCAPE_PROPS'} />
			</ListGroup>
		</Panel >
	);
};

LandscapeSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};