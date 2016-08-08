import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';

export const GenescapeSidepanel = function (props) {
	const { dispatch, genescapeState, dataSet } = props;
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
						buttonName={genescapeState.xCoordinate}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'xCoordinate'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Y Coordinate'}
						buttonName={genescapeState.yCoordinate}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'yCoordinate'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={'Color'}
						buttonName={genescapeState.colorAttr}
						attributes={rowAttrKeys}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'colorAttr'}
						dispatch={dispatch}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<DropdownMenu
						buttonLabel={undefined}
						buttonName={genescapeState.colorMode}
						attributes={['Categorical', 'Heatmap']}
						attrType={'SET_GENESCAPE_PROPS'}
						attrName={'colorMode'}
						dispatch={dispatch}
						/>
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