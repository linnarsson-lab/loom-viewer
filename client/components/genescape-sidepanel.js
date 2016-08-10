import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem,
	ButtonGroup, Button } from 'react-bootstrap';

export const GenescapeSidepanel = function (props) {
	const { dispatch, genescapeState, dataSet } = props;
	const {xCoordinate, yCoordinate, colorAttr, colorMode} = genescapeState;
	const rowAttrKeys = Object.keys(dataSet.rowAttrs).sort();

	return (


		<Panel
			key='genescape-settings'
			header='Settings'
			bsStyle='default'>
			<ListGroup fill>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'X Coordinate'}
						buttonName={xCoordinate}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'xCoordinate'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Y Coordinate'}
						buttonName={yCoordinate}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'yCoordinate'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Color'}
						buttonName={colorAttr}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'colorAttr'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<ButtonGroup>
						<Button
							bsStyle={ colorMode === 'Heatmap' ? "success" : "default" }
							onClick={ () => {
								dispatch({
									type: 'SET_GENESCAPE_PROPS',
									colorMode: 'Heatmap',
								});
							} }>
							Heatmap
						</Button>
						<Button
							bsStyle={ colorMode === 'Categorical' ? "success" : "default" }
							onClick={ () => {
								dispatch({
									type: 'SET_GENESCAPE_PROPS',
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

GenescapeSidepanel.propTypes = {
	genescapeState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};