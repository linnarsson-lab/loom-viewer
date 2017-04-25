import React, { PropTypes } from 'react';

import { LandscapeSidepanel } from './landscape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { RemountOnResize } from './remount-on-resize';
import { scatterplot } from './scatterplot';

const LandscapeComponent = function (props) {
	const { dispatch, dataset } = props;
	const { xAttrs, yAttrs, colorAttr, colorMode, scaleFactor } = dataset.viewState.landscape;

	// filter out undefined attributes;
	let newXattrs = [];
	for (let i = 0; i < xAttrs.length; i++) {
		let attr = xAttrs[i];
		if (attr) {
			newXattrs.push(attr);
		}
	}
	let newYattrs = [];
	for (let i = 0; i < yAttrs.length; i++) {
		let attr = yAttrs[i];
		if (attr) {
			newYattrs.push(attr);
		}
	}

	const { col } = dataset;
	const color = col.attrs[colorAttr];

	const cellStyle = {
		border: '1px solid lightgrey',
		flex: '1 1 auto',
		margin: '1px',
	};
	const rowStyle = {
		flex: '1 1 auto',
	};
	let matrix = [];
	for (let j = 0; j < newYattrs.length; j++) {
		let row = [];
		for (let i = 0; i < newXattrs.length; i++) {
			let paint;
			const xAttr = newXattrs[i], yAttr = newYattrs[j];
			const logscale = { x: xAttr.logscale, y: yAttr.logscale };
			const jitter = { x: xAttr.jitter, y: yAttr.jitter };
			const x = col.attrs[xAttr.attr];
			const y = col.attrs[yAttr.attr];
			paint = scatterplot(x, y, color, col.sortedFilterIndices, colorMode, logscale, jitter, scaleFactor);
			row.push(
				<Canvas
					key={`${j}_${newYattrs[j].attr}_${i}_${newXattrs[i].attr}`}
					style={cellStyle}
					paint={paint}
					redraw
					clear
				/>
			);

		}
		matrix.push(
			<div
				key={'row_' + j}
				className={'view'}
				style={rowStyle}>
				{row}
			</div>
		);
	}

	let matrixChanged = [];
	for (let i = 0; i < newXattrs.length; i++){
		matrixChanged.push(newXattrs[i].attr);
	}
	for (let i = 0; i < newYattrs.length; i++){
		matrixChanged.push(newYattrs[i].attr);
	}
	return (
		<div className='view'>
			<LandscapeSidepanel
				dataset={dataset}
				dispatch={dispatch}
			/>
			{/*If any x or y attributes in our grid change, we need to remount*/}
			<RemountOnResize watchedVal={matrixChanged.join('')}>
				<div className={'view-vertical'}>{matrix}</div>
			</RemountOnResize>
		</div>
	);

};

LandscapeComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise landscapeState for this dataset
	xAttrs: [{ attr: '_tSNE1', jitter: false, logscale: false }],
	yAttrs: [{ attr: '_tSNE2', jitter: false, logscale: false }],
	scaleFactor: 50,
	colorAttr: '(original order)',
	colorMode: 'Heatmap',
};

export const LandscapeViewInitialiser = function (props) {
	return (
		<ViewInitialiser
			View={LandscapeComponent}
			stateName={'landscape'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			datasets={props.datasets} />
	);
};

LandscapeViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	datasets: PropTypes.object,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		datasets: state.datasets.list,
	};
};

export const LandscapeView = connect(mapStateToProps)(LandscapeViewInitialiser);