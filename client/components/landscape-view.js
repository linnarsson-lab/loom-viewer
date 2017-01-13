import React, { PropTypes } from 'react';

import { LandscapeSidepanel } from './landscape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { RemountOnResize } from './remount-on-resize';
import { scatterplot } from './scatterplot';

const LandscapeComponent = function (props) {
	const { dispatch, dataset } = props;
	const { coordinateAttrs, colorAttr, colorMode,
		logscale, jitter, filterZeros, asMatrix } = dataset.viewState.landscape;
	const { col } = dataset.data;

	// filter out undefined attributes;
	let attrs = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			attrs.push(attr);
		}
	}


	const color = col.attrs[colorAttr];
	let plot;
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
					const x = col.attrs[attrs[i]];// makeData(attrs[i], genes[i], fetchedGenes, colAttrs);
					const y = col.attrs[attrs[j]];// makeData(attrs[j], genes[j], fetchedGenes, colAttrs);
					paint = scatterplot(x, y, color, colorMode, logscale, jitter, filterZeros);
				}
				row.push(
					<Canvas
						key={j + '_' + i}
						style={i <= j ? cellStyle : cellStyleNoBorder}
						paint={paint}
						redraw
						clear
						/>
				);

			}
			matrix.push(
				<div
					key={j}
					className={'view'}
					style={rowStyle}>
					{row}
				</div>
			);
		}
		plot = <div className={'view-vertical'}>{matrix}</div>;
	} else {
		let x = col.attrs[attrs[0]];// makeData(attrs[0], genes[0], fetchedGenes, colAttrs);
		let y = col.attrs[attrs[1]];// makeData(attrs[1], genes[1], fetchedGenes, colAttrs);
		const paint = scatterplot(x, y, color, colorMode, logscale, jitter, filterZeros);
		plot = (
			<Canvas
				paint={paint}
				style={{ margin: '20px' }}
				redraw
				clear
				/>
		);

	}

	return (
		<div className='view'>
			<LandscapeSidepanel
				dataset={dataset}
				dispatch={dispatch}
				/>
			<RemountOnResize watchedVal={attrs.length}>
				{plot}
			</RemountOnResize>
		</div>
	);
};

LandscapeComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise landscapeState for this dataset
	coordinateAttrs: ['_tSNE1', '_tSNE2'],
	coordinateGenes: ['', ''],
	logscale: {},
	jitter: {},
	filterZeros: {},
	asMatrix: false,
	colorAttr: '(original order)',
	colorGene: '',
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