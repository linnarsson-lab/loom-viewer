import React, { PropTypes } from 'react';

import { LandscapeSidepanel } from './landscape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { RemountOnResize } from './remount-on-resize';
import { scatterplot } from './scatterplot';

const LandscapeComponent = function (props) {
	const { dispatch, dataset } = props;
	const { coordinateAttrs, colorAttr, colorMode,
		logscale, jitter, asMatrix } = dataset.viewState.landscape;

	// filter out undefined attributes;
	let attrs = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			attrs.push(attr);
		}
	}

	const { col } = dataset;
	const color = col.attrs[colorAttr];

	if (asMatrix && attrs.length > 2) {
		const cellStyle = {
			border: '1px solid lightgrey',
			flex: '1 1 auto',
			margin: '1px',
		};
		const cellStyleNoBorder = {
			flex: '1 1 auto',
			margin: '1px',
		};
		const rowStyle = {
			flex: '1 1 auto',
		};
		let matrix = [];
		for (let j = 0; j < attrs.length; j++) {
			let row = [];
			for (let i = 0; i < attrs.length; i++) {
				let paint;
				if (i <= j) {
					const x = col.attrs[attrs[i]];
					const y = col.attrs[attrs[j]];
					paint = scatterplot(x, y, color, col.sortedFilterIndices, colorMode, logscale, jitter);
				}
				row.push(
					<Canvas
						key={attrs[j] + '_' + attrs[i]}
						style={i <= j ? cellStyle : cellStyleNoBorder}
						paint={paint}
						redraw
						clear
					/>
				);

			}
			matrix.push(
				<div
					key={j + '_' + attrs[j]}
					className={'view'}
					style={rowStyle}>
					{row}
				</div>
			);
		}
		return (
			<div className='view'>
				<LandscapeSidepanel
					dataset={dataset}
					dispatch={dispatch}
				/>
				{/*If our grid changes in lenght, we need to remount*/}
				<RemountOnResize watchedVal={attrs.length}>
					<div className={'view-vertical'}>{matrix}</div>
				</RemountOnResize>
			</div>
		);


	} else {
		let x = col.attrs[attrs[0]];
		let y = col.attrs[attrs[1]];
		const paint = scatterplot(x, y, color, col.sortedFilterIndices, colorMode, logscale, jitter);
		return (
			<div className='view'>
				<LandscapeSidepanel
					dataset={dataset}
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
	}

};

LandscapeComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise landscapeState for this dataset
	coordinateAttrs: ['_tSNE1', '_tSNE2'],
	logscale: {},
	jitter: {},
	asMatrix: false,
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