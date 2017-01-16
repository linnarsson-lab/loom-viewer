import React, { PropTypes } from 'react';

import { GenescapeSidepanel } from './genescape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { RemountOnResize } from './remount-on-resize';
import { scatterplot } from './scatterplot';

const GenescapeComponent = function (props) {
	const { dispatch, dataset } = props;
	const { coordinateAttrs, colorAttr, colorMode,
		logscale, jitter, filterZeros, asMatrix } = dataset.viewState.genescape;

	// filter out undefined attributes;
	let selectedAttrs = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			selectedAttrs.push(attr);
		}
	}
	const { row } = dataset;
	const color = row.attrs[colorAttr];
	let plot;
	if (asMatrix && selectedAttrs.length > 2) {
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
		for (let j = 0; j < selectedAttrs.length; j++) {
			let selectedRow = [];
			for (let i = 0; i < selectedAttrs.length; i++) {
				const x = row.attrs[selectedAttrs[i]];
				const y = row.attrs[selectedAttrs[j]];
				const paint = i <= j ? scatterplot(x, y, color, colorMode, logscale, jitter, filterZeros) : null;
				selectedRow.push(
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
					{selectedRow}
				</div>
			);
		}
		plot = <div className={'view-vertical'}>{matrix}</div>;
	} else {
		let x = row.attrs[selectedAttrs[0]];
		let y = row.attrs[selectedAttrs[1]];
		plot = (
			<Canvas
				paint={scatterplot(x, y, color, colorMode, logscale, jitter, filterZeros)}
				style={{ margin: '20px' }}
				redraw
				clear
				/>
		);
	}

	return (
		<div className='view' >
			<GenescapeSidepanel
				dataset={dataset}
				dispatch={dispatch}
				/>
			<RemountOnResize watchedVal={selectedAttrs.length}>
				{plot}
			</RemountOnResize>
		</div>
	);

};

GenescapeComponent.propTypes = {
	// Passed down by ViewInitialiser
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = {
	// Initialise genescape state for this dataset
	coordinateAttrs: ['_tSNE1', '_tSNE2'],
	logscale: {},
	jitter: {},
	filterZeros: {},
	asMatrix: false,
	colorAttr: '(original order)',
	colorMode: 'Heatmap',
};

export const GenescapeViewInitialiser = function (props) {
	return (
		<ViewInitialiser
			View={GenescapeComponent}
			stateName={'genescape'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			datasets={props.datasets} />

	);
};

GenescapeViewInitialiser.propTypes = {
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

export const GenescapeView = connect(mapStateToProps)(GenescapeViewInitialiser);