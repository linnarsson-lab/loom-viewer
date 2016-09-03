import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem,
	ButtonGroup, Button } from 'react-bootstrap';

export const GenescapeSidepanel = function (props) {
	const { dispatch, genescapeState, dataSet } = props;
	const {xCoordinate, yCoordinate, colorAttr, colorMode} = genescapeState;
	const rowAttrKeys = Object.keys(dataSet.rowAttrs).sort();

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
										type: 'SET_GENESCAPE_PROPS',
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
						attributes={rowAttrKeys}
						actionType={'SET_GENESCAPE_PROPS'}
						actionName={'xCoordinate'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Y Coordinate'}
						buttonName={yCoordinate}
						attributes={rowAttrKeys}
						actionType={'SET_GENESCAPE_PROPS'}
						actionName={'yCoordinate'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Color'}
						buttonName={colorAttr}
						attributes={rowAttrKeys}
						actionType={'SET_GENESCAPE_PROPS'}
						actionName={'colorAttr'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={ colorMode === 'Heatmap' ? 'success' : 'default' }
								onClick={ () => {
									dispatch({
										type: 'SET_GENESCAPE_PROPS',
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
										type: 'SET_GENESCAPE_PROPS',
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

GenescapeSidepanel.propTypes = {
	genescapeState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};