import React, { PropTypes } from 'react';
import { GenescapeSidepanel } from './genescape-sidepanel';
import { Scatterplot } from './scatterplot';
import { FetchDatasetComponent } from './fetch-dataset';

const GenescapeViewComponent = function (props) {
	const { dispatch, genescapeState, dataSet } = props;
	const color = dataSet.rowAttrs[genescapeState.colorAttr ? genescapeState.colorAttr : 0];
	const x = dataSet.rowAttrs[genescapeState.xCoordinate ? genescapeState.xCoordinate : 0];
	const y = dataSet.rowAttrs[genescapeState.yCoordinate ? genescapeState.yCoordinate : 0];

	return (
		<div style={{ display: 'flex', flex: '1 1 auto'}} >
			<div className='view-sidepanel'>
				<GenescapeSidepanel
					genescapeState={genescapeState}
					dataSet={dataSet}
					dispatch={dispatch}
					/>
			</div>
			<div  style={{ display: 'flex', flex: '1 1 auto', padding: '20px', overflow: 'hidden' }}>
				<Scatterplot
					x={x}
					y={y}
					color={color}
					colorMode={genescapeState.colorMode}
					logScaleColor={false}
					logScaleX={false}
					logScaleY={false}
					/>
			</div>
		</div>
	);
};

GenescapeViewComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	genescapeState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const GenescapeViewContainer = function (props) {
	const { dispatch, data, genescapeState, params } = props;
	const { project, dataset } = params;
	const dataSet = data.dataSets[dataset];
	return (dataSet === undefined ?
		<FetchDatasetComponent
			dispatch={dispatch}
			dataSets={data.dataSets}
			dataset={dataset}
			project={project} />
		:
		<GenescapeViewComponent
			dispatch={dispatch}
			genescapeState={genescapeState}
			dataSet={dataSet} />
	);
};

GenescapeViewContainer.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	genescapeState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect GenescapeViewContainer to store
import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		genescapeState: state.genescapeState,
		data: state.data,
	};
};

export const GenescapeView = connect(mapStateToProps)(GenescapeViewContainer);

