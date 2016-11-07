import React, { PropTypes } from 'react';

import { LandscapeSidepanel } from './landscape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { scatterplot } from './scatterplot';

function makeData(attr, gene, fetchedGenes, colAttrs) {
	const data = ((attr === '(gene)' && fetchedGenes[gene]) ?
		fetchedGenes[gene] : colAttrs[attr]);
	// don't mutate data from the redux store
	return data ? data.filteredData.slice(0) : null;
}

const LandscapeComponent = function (props) {
	const { dispatch, dataSet } = props;
	const { fetchedGenes, landscapeState, colAttrs } = dataSet;
	const { colorAttr, colorGene, colorMode, xCoordinate, xGene, yCoordinate, yGene, filterZeros } = landscapeState;

	let color = makeData(colorAttr, colorGene, fetchedGenes, colAttrs);
	let x = makeData(xCoordinate, xGene, fetchedGenes, colAttrs);
	let y = makeData(yCoordinate, yGene, fetchedGenes, colAttrs);

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

const initialState = { // Initialise landscapeState for this dataset
	xCoordinate: '_tSNE1',
	xGene: '',
	yCoordinate: '_tSNE2',
	yGene: '',
	colorAttr: '(original order)',
	colorMode: 'Heatmap',
	colorGene: '',
};

export const LandscapeViewInitialiser = function (props) {
	return (
		<ViewInitialiser
			View={LandscapeComponent}
			viewStateName={'landscapeState'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			data={props.data} />
	);
};

LandscapeViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

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

export const LandscapeView = connect(mapStateToProps)(LandscapeViewInitialiser);