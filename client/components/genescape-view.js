import React, { Component, PropTypes } from 'react';
import { GenescapeSidepanel } from './genescape-sidepanel';
import { Scatterplot } from './scatterplot';
import { fetchDataSet } from '../actions/actions';

const GenescapeViewComponent = function (props) {
	const { dispatch, genescapeState, dataSet } = props;
	const color = dataSet.rowAttrs[genescapeState.colorAttr ? genescapeState.colorAttr : 0];
	const x = dataSet.rowAttrs[genescapeState.xCoordinate ? genescapeState.xCoordinate : 0];
	const y = dataSet.rowAttrs[genescapeState.yCoordinate ? genescapeState.yCoordinate : 0];

	return (
		<div style={{ display: 'flex', flex: '1 1 auto' }}>
			<div className='view-sidepanel'>
				<GenescapeSidepanel
					genescapeState={genescapeState}
					dataSet={dataSet}
					dispatch={dispatch}
					/>
			</div>
			<div  style={{ display: 'flex', flex: '1 1 auto', padding: '0px', overflow: 'hidden' }}>
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

class GenescapeViewContainer extends Component {

	componentDidMount() {
		const { dispatch, data, params } = this.props;
		const { transcriptome, project, dataset } = params;
		const dataSetName = transcriptome + '__' + project + '__' + dataset;
		dispatch(fetchDataSet({ dataSets: data.dataSets, dataSetName: dataSetName }));
	}

	render() {
		const { dispatch, data, genescapeState, params } = this.props;
		const { transcriptome, project, dataset } = params;
		const fetchDatasetString = transcriptome + '__' + project + '__' + dataset;
		const dataSet = data.dataSets[fetchDatasetString];
		return (dataSet ?
			<GenescapeViewComponent
				dispatch={dispatch}
				genescapeState={genescapeState}
				dataSet={dataSet} />
			:
			<div className='container' >Fetching dataset...</div>
		);
	}
}

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

