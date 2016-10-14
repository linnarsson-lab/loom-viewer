import React, { Component, PropTypes } from 'react';

import { GenescapeSidepanel } from './genescape-sidepanel';
import { FetchDatasetComponent } from './fetch-dataset';
import { Canvas } from './canvas';
import { scatterplot } from './scatterplot';

import { SET_GENESCAPE_PROPS } from '../actions/actionTypes';

import JSURL from 'jsurl';

const GenescapeComponent = function (props) {
	const { dispatch, dataSet } = props;
	const { genescapeState } = dataSet;
	let color = dataSet.rowAttrs[genescapeState.colorAttr ? genescapeState.colorAttr : 0];
	let x = dataSet.rowAttrs[genescapeState.xCoordinate ? genescapeState.xCoordinate : 0];
	let y = dataSet.rowAttrs[genescapeState.yCoordinate ? genescapeState.yCoordinate : 0];

	if (genescapeState.filterZeros && color) {
		const filterData = color.slice(0);
		const data = (v, i) => { return filterData[i]; };
		color = color.filter(data);
		x = x ? x.filter(data) : null;
		y = y ? y.filter(data) : null;
	}

	const paint = scatterplot(x, y, color, genescapeState.colorMode);
	return (
		<div className='view' >
			<GenescapeSidepanel
				genescapeState={genescapeState}
				dataSet={dataSet}
				dispatch={dispatch}
				/>
			<Canvas
				paint={paint}
				style={{ margin: '20px' }}
				redraw
				clear
				/>
		</div>
	);

};

GenescapeComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class GenescapeStateInitialiser extends Component {

	componentWillMount() {
		const { dispatch, dataSet, viewsettings } = this.props;

		const genescapeState = viewsettings ?
			JSURL.parse(viewsettings) :
			(dataSet.genescapeState ?
				dataSet.genescapeState
				:
				({ // Initialise genescapeState for this dataset
					xCoordinate: '_tSNE1',
					yCoordinate: '_tSNE2',
					colorAttr: dataSet.rowAttrs[0],
					colorMode: 'Heatmap',
				})
			);

		// We dispatch even in case of existing state,
		// to synchronise the view-settings URL
		dispatch({
			type: SET_GENESCAPE_PROPS,
			datasetName: dataSet.dataset,
			genescapeState,
		});
	}

	render() {
		const { dispatch, dataSet } = this.props;
		return dataSet.genescapeState ? (
			<GenescapeComponent
				dispatch={dispatch}
				dataSet={dataSet}
				/>
		) : <div className='view'>Initialising Gene View Settings</div>;
	}
}

GenescapeStateInitialiser.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	viewsettings: PropTypes.string,
};

const GenescapeDatasetFetcher = function (props) {
	const { dispatch, data, params } = props;
	const { dataset, project, viewsettings } = params;
	const dataSet = data.dataSets[dataset];
	return (dataSet === undefined ?
		<FetchDatasetComponent
			dispatch={dispatch}
			dataSets={data.dataSets}
			dataset={dataset}
			project={project} />
		:
		<GenescapeStateInitialiser
			dataSet={dataSet}
			dispatch={dispatch}
			viewsettings={viewsettings} />
	);
};

GenescapeDatasetFetcher.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect GenescapeDatasetFetcher to store
import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		data: state.data,
	};
};

export const GenescapeView = connect(mapStateToProps)(GenescapeDatasetFetcher);

