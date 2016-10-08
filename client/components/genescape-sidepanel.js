import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { PrintSettings } from './print-settings';
import { Panel, ListGroup, ListGroupItem,
	ButtonGroup, Button } from 'react-bootstrap';

export const GenescapeSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const { genescapeState } = dataSet;
	const {xCoordinate, yCoordinate, colorAttr, colorMode} = genescapeState;

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: 'SET_GENESCAPE_PROPS',
				datasetName: dataSet.dataset,
				genescapeState: { [field]: value },
			});
		};
	};

	const rowAttrOptions = Object.keys(dataSet.rowAttrs).sort();

	const xCoordinateHC = handleChangeFactory('xCoordinate');
	const yCoordinateHC = handleChangeFactory('yCoordinate');
	const colorAttrHC = handleChangeFactory('colorAttr');
	const filterZeros = handleChangeFactory('filterZeros');
	const filterZerosHC = () => { filterZeros(!genescapeState.filterZeros); };


	const isTSNE = (xCoordinate === '_tSNE1') && (yCoordinate === '_tSNE2');
	const isPCA = (xCoordinate === '_PC1') && (yCoordinate === '_PC2');

	return (
		<Panel
			className='sidepanel'
			key='genescape-settings'
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
										type: 'SET_GENESCAPE_PROPS',
										datasetName: dataSet.dataset,
										genescapeState: {
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
										type: 'SET_GENESCAPE_PROPS',
										datasetName: dataSet.dataset,
										genescapeState: {
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
						options={rowAttrOptions}
						onChange={xCoordinateHC}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<label>Y Coordinate</label>
					<DropdownMenu
						value={yCoordinate}
						options={rowAttrOptions}
						onChange={yCoordinateHC}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<label>Color</label>
					<DropdownMenu
						value={colorAttr}
						options={rowAttrOptions}
						onChange={colorAttrHC}
						/>
					<Button
						bsStyle={ genescapeState.filterZeros ? 'success' : 'default' }
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
										type: 'SET_GENESCAPE_PROPS',
										datasetName: dataSet.dataset,
										genescapeState: { colorMode: 'Heatmap' },
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
										type: 'SET_GENESCAPE_PROPS',
										datasetName: dataSet.dataset,
										genescapeState: { colorMode: 'Categorical' },
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
					stateName={'genescapeState'}
					actionType={'SET_GENESCAPE_PROPS'} />
			</ListGroup>
		</Panel>
	);
};

GenescapeSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};