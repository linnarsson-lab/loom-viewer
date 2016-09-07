import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';


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
					<DropdownMenu
						buttonLabel={'X Coordinate'}
						buttonName={xCoordinate}
						options={colAttrsOptions}
						onChange={xCoordinateHC}
						/>
					{ xCoordinate === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={xGeneHC}
							/> : null }
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Y Coordinate'}
						buttonName={yCoordinate}
						options={colAttrsOptions}
						onChange={yCoordinateHC}
						/>
					{ yCoordinate === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={yGeneHC}
							/> : null }
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Color'}
						buttonName={colorAttr}
						options={colAttrsOptions}
						onChange={colorAttrHC}
						/>
					{ colorAttr === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={colorGeneHC}
							/> : null  }
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
			</ListGroup>
		</Panel>
	);
};

LandscapeSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};