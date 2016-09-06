import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';


export const LandscapeSidepanel = function (props) {
	const { dispatch, dataSet, fetchedGenes } = props;
	const landscapeState = props.landscapeState;
	const { xCoordinate, yCoordinate, colorAttr, colorMode } = landscapeState;
	const selectableGenes = dataSet.rowAttrs.Gene;
	const temp = Object.keys(dataSet.colAttrs).sort();
	temp.push('(gene)');

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
										xCoordinate: '_tSNE1',
										yCoordinate: '_tSNE2',
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
										xCoordinate: '_PC1',
										yCoordinate: '_PC2',
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
						attributes={temp}
						actionType={'SET_LANDSCAPE_PROPS'}
						actionName={'xCoordinate'}
						dispatch={dispatch}
						/>
					{ xCoordinate === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							fetchedGenes={fetchedGenes}
							selectableGenes={selectableGenes}
							dispatch={dispatch}
							actionType={'SET_LANDSCAPE_PROPS'}
							actionName={'xGene'}
							/> : null }
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Y Coordinate'}
						buttonName={yCoordinate}
						attributes={temp}
						actionType={'SET_LANDSCAPE_PROPS'}
						actionName={'yCoordinate'}
						dispatch={dispatch}
						/>
					{ yCoordinate === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							fetchedGenes={fetchedGenes}
							selectableGenes={selectableGenes}
							dispatch={dispatch}
							actionType={'SET_LANDSCAPE_PROPS'}
							actionName={'yGene'}
							/> : null }
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Color'}
						buttonName={colorAttr}
						attributes={temp}
						actionType={'SET_LANDSCAPE_PROPS'}
						actionName={'colorAttr'}
						dispatch={dispatch}
						/>
					{ colorAttr === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							fetchedGenes={fetchedGenes}
							selectableGenes={selectableGenes}
							dispatch={dispatch}
							actionType={'SET_LANDSCAPE_PROPS'}
							actionName={'colorGene'}
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
										colorMode: 'Heatmap',
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
										colorMode: 'Categorical',
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
	landscapeState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	fetchedGenes: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
};