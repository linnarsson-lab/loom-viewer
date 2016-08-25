import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { fetchGene } from '../actions/actions.js';
import { Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup } from 'react-bootstrap';
import { FetchGeneComponent } from './fetch-gene';


export const LandscapeSidepanel = function (props) {
	const { dispatch, dataSet, genes } = props;
	const landscapeState = props.landscapeState;
	const { xCoordinate, yCoordinate, colorAttr, colorMode, xGene, yGene, colorGene } = landscapeState;
	const geneList = dataSet.rowAttrs.Gene;
	const temp = Object.keys(dataSet.colAttrs).sort();
	temp.push("(gene)");

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
								bsStyle={ isTSNE ? "success" : "default" }
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
								bsStyle={ isPCA ? "success" : "default" }
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
						attrType={'SET_LANDSCAPE_PROPS'}
						attrName={'xCoordinate'}
						dispatch={dispatch}
						/>
					{ xCoordinate === "(gene)" ?
						<FetchGeneComponent
							dataSet={dataSet}
							geneCache={genes}
							geneList={geneList}
							dispatch={dispatch}
							attrType={'SET_LANDSCAPE_PROPS'}
							attrName={'xGene'}
							/> : null }
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Y Coordinate'}
						buttonName={yCoordinate}
						attributes={temp}
						attrType={'SET_LANDSCAPE_PROPS'}
						attrName={'yCoordinate'}
						dispatch={dispatch}
						/>
					{ yCoordinate === "(gene)" ?
						<FetchGeneComponent
							dataSet={dataSet}
							geneCache={genes}
							geneList={geneList}
							dispatch={dispatch}
							attrType={'SET_LANDSCAPE_PROPS'}
							attrName={'yGene'}
							/> : null }
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Color'}
						buttonName={colorAttr}
						attributes={temp}
						attrType={'SET_LANDSCAPE_PROPS'}
						attrName={'colorAttr'}
						dispatch={dispatch}
						/>
					{ colorAttr === "(gene)" ?
						<FetchGeneComponent
							dataSet={dataSet}
							geneCache={genes}
							geneList={geneList}
							dispatch={dispatch}
							attrType={'SET_LANDSCAPE_PROPS'}
							attrName={'colorGene'}
							/> : null  }
				</ListGroupItem>
				<ListGroupItem>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={ colorMode === 'Heatmap' ? "success" : "default" }
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
								bsStyle={ colorMode === 'Categorical' ? "success" : "default" }
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
	genes: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired,
};