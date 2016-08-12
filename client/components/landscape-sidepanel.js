import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { fetchGene } from '../actions/actions.js';
import { Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup } from 'react-bootstrap';


export const LandscapeSidepanel = function (props) {
	const { dispatch, dataSet, genes } = props;
	const landscapeState = props.landscapeState;
	const { xCoordinate, yCoordinate, colorAttr, colorMode, xGene, yGene, colorGene } = landscapeState;
	const temp = Object.keys(dataSet.colAttrs).sort();
	temp.push("(gene)");

	const isTSNE = (xCoordinate === '_tSNE1') && (yCoordinate === '_tSNE2');
	const isPCA = (xCoordinate === '_PC1') && (yCoordinate === '_PC2');

	return (
		<Panel
			key='landscape-settings'
			header='Settings'
			bsStyle='default'>

			<ListGroup fill>
				<ListGroupItem>
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
					{xCoordinate === "(gene)" ?
						<input
							className='form-control'
							placeholder='Gene'
							value={xGene}
							onChange={(event) => {
								dispatch({
									type: 'SET_LANDSCAPE_PROPS',
									xGene: event.target.value,
								});
								dispatch(fetchGene(dataSet, event.target.value, genes));
							} } /> :
						null
					}
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
					{
						yCoordinate === "(gene)" ?
							<input
								className='form-control'
								placeholder='Gene'
								value={yGene}
								onChange={(event) => {
									dispatch({
										type: 'SET_LANDSCAPE_PROPS',
										yGene: event.target.value,
									});
									dispatch(fetchGene(dataSet, event.target.value, genes));
								} } />
							:
							null
					}
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
					{
						colorAttr === "(gene)" ?
							<input
								className='form-control'
								placeholder='Gene'
								value={colorGene}
								onChange={ () => {
									dispatch({
										type: 'SET_LANDSCAPE_PROPS',
										colorGene: event.target.value,
									});
									dispatch(fetchGene(dataSet, event.target.value, genes));
								} } />
							:
							null
					}
				</ListGroupItem>
				<ListGroupItem>
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
				</ListGroupItem>
			</ListGroup>
		</Panel>
	);
};

LandscapeSidepanel.propTypes = {
	landscapeState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	genes: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};