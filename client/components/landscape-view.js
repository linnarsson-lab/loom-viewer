import React, { Component, PropTypes } from 'react';

import { LandscapeSidepanel } from './landscape-sidepanel';
import { FetchDatasetComponent } from './fetch-dataset';
import { Canvas } from './canvas';
import { scatterplot } from './scatterplot';

import { SET_LANDSCAPE_PROPS } from '../actions/actionTypes';

import JSURL from 'jsurl';

function makeData(attr, gene, fetchedGenes, colAttrs) {
	const data = ((attr === '(gene)' && fetchedGenes[gene]) ?
		fetchedGenes[gene] : colAttrs[attr]);
	// don't mutate data from the redux store
	return data ? data.slice(0) : null;
}

const LandscapeComponent = function (props) {
	const { dispatch, dataSet } = props;
	const { fetchedGenes, landscapeState } = dataSet;
	const { colorAttr, colorGene, colorMode, xCoordinate, xGene, yCoordinate, yGene, filterZeros } = landscapeState;

	let color = makeData(colorAttr, colorGene, fetchedGenes, dataSet.colAttrs);
	let x = makeData(xCoordinate, xGene, fetchedGenes, dataSet.colAttrs);
	let y = makeData(yCoordinate, yGene, fetchedGenes, dataSet.colAttrs);

	if (filterZeros && color) {
		const filterData = color.slice(0);
		const data = (v, i) => { return filterData[i]; };
		color = color.filter(data);
		x = x ? x.filter(data) : null;
		y = y ? y.filter(data) : null;
	}

	const logColor = colorAttr === '(gene)';
	const logX = xCoordinate === '(gene)';
	const logY = yCoordinate === '(gene)';

	const paint = scatterplot(x, y, color, colorMode, logColor, logX, logY);
	return (
		<div className='view'>
			<LandscapeSidepanel
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

LandscapeComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};


class LandscapeStateInitialiser extends Component {

	componentWillMount() {
		const { dispatch, dataSet, viewsettings } = this.props;

		const landscapeState = viewsettings ?
			JSURL.parse(viewsettings) :
			(dataSet.landscapeState ?
				dataSet.landscapeState
				:
				({ // Initialise landscapeState for this dataset
					xCoordinate: '_tSNE1',
					xGene: '',
					yCoordinate: '_tSNE2',
					yGene: '',
					colorAttr: 'CellID',
					colorMode: 'Heatmap',
					colorGene: '',
				})
			);

		// We dispatch even in case of existing state,
		// to synchronise the view-settings URL
		dispatch({
			type: SET_LANDSCAPE_PROPS,
			datasetName: dataSet.dataset,
			landscapeState,
		});
	}

	render() {
		const { dispatch, dataSet } = this.props;
		return dataSet.landscapeState ? (
			<LandscapeComponent
				dispatch={dispatch}
				dataSet={dataSet}
				/>
		) : <div className='view'>Initialising Landscape View Settings</div>;
	}
}


LandscapeStateInitialiser.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	viewsettings: PropTypes.string,
};

const LandscapeDatasetFetcher = function (props) {
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
		<LandscapeStateInitialiser
			dataSet={dataSet}
			dispatch={dispatch}
			viewsettings={viewsettings} />
	);
};

LandscapeDatasetFetcher.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};


//connect LandscapeDatasetFetcher to store
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

export const LandscapeView = connect(mapStateToProps)(LandscapeDatasetFetcher);