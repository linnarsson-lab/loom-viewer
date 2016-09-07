import React, { Component, PropTypes } from 'react';

import { LandscapeSidepanel } from './landscape-sidepanel';
import { Scatterplot } from './scatterplot';
import { FetchDatasetComponent } from './fetch-dataset';

import { SET_LANDSCAPE_PROPS } from '../actions/actionTypes';


const LandscapeComponent = function (props) {
	const { dispatch, dataSet } = props;
	const { fetchedGenes, landscapeState } = dataSet;
	const { colorAttr, colorGene, xCoordinate, xGene, yCoordinate, yGene} = landscapeState;

	const makeData = (attr, gene) => {
		if (attr === '(gene)' && fetchedGenes.hasOwnProperty(gene)) {
			return fetchedGenes[gene];
		}
		return dataSet.colAttrs[attr];
	};

	const color = makeData(colorAttr, colorGene);
	const x = makeData(xCoordinate, xGene);
	const y = makeData(yCoordinate, yGene);
	return (
		<div className='view'>
			<LandscapeSidepanel
				landscapeState={landscapeState}
				dataSet={dataSet}
				fetchedGenes={fetchedGenes}
				dispatch={dispatch}
				/>
			<Scatterplot
				x={x}
				y={y}
				color={color}
				colorMode={landscapeState.colorMode}
				logScaleColor={landscapeState.colorAttr === '(gene)'}
				logScaleX={landscapeState.xCoordinate === '(gene)'}
				logScaleY={landscapeState.yCoordinate === '(gene)'}
				style={{ margin: '20px' }}
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
		const { dispatch, dataSet } = this.props;
		if (!dataSet.landscapeState) {
			// Initialise landscapeState for this dataset
			dispatch({
				type: SET_LANDSCAPE_PROPS,
				datasetName: dataSet.dataset,
				landscapeState: {
					xCoordinate: '_tSNE1',
					xGene: '',
					yCoordinate: '_tSNE2',
					yGene: '',
					colorAttr: 'CellID',
					colorMode: 'Heatmap',
					colorGene: '',
				},
			});
		}
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
};

const LandscapeDatasetFetcher = function (props) {
	const { dispatch, data, params } = props;
	const { dataset, project } = params;
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
			dispatch={dispatch} />
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