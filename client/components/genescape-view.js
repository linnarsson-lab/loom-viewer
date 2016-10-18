import React, { PropTypes } from 'react';

import { GenescapeSidepanel } from './genescape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { scatterplot } from './scatterplot';

const GenescapeComponent = function (props) {
	const { dispatch, dataSet } = props;
	const { genescapeState } = dataSet;

	const { colorAttr, xCoordinate, yCoordinate } = genescapeState;
	let color = dataSet.rowAttrs[colorAttr];
	let x = dataSet.rowAttrs[xCoordinate];
	let y = dataSet.rowAttrs[yCoordinate];

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
	// Passed down by ViewInitialiser
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = {
	// Initialise genescapeState for this dataset
	xCoordinate: '_tSNE1',
	yCoordinate: '_tSNE2',
	colorMode: 'Heatmap',
};

export const GenescapeViewInitialiser = function (props) {
	return (
		<ViewInitialiser
			View={GenescapeComponent}
			viewStateName={'genescapeState'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			data={props.data} />
	);
};

GenescapeViewInitialiser.propTypes = {
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

export const GenescapeView = connect(mapStateToProps)(GenescapeViewInitialiser);