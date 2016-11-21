import React, { PropTypes } from 'react';

import { GenescapeSidepanel } from './genescape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { RemountOnResize } from './remount-on-resize';
import { scatterplot } from './scatterplot';

const GenescapeComponent = function (props) {
	const { dispatch, dataSet } = props;
	const { coordinateAttrs, asMatrix, colorAttr, colorMode,
		logX, logY, jitterX, jitterY } = dataSet.viewState.genescape;

	// filter out undefined attributes;
	let attrs = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			attrs.push(attr);
		}
	}

	const color = dataSet.rowAttrs[colorAttr];
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
				const x = dataSet.rowAttrs[attrs[i]];
				const y = dataSet.rowAttrs[attrs[j]];
				const paint = i <= j ? scatterplot(x, y, color, colorMode, logX, logY, jitterX, jitterY) : null;
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
		let x = dataSet.rowAttrs[attrs[0]];
		let y = dataSet.rowAttrs[attrs[1]];
		plot = (
			<Canvas
				paint={scatterplot(x, y, color, colorMode, logX, logY, jitterX, jitterY)}
				style={{ margin: '20px' }}
				redraw
				clear
				/>
		);
	}

	return (
		<div className='view' >
			<GenescapeSidepanel
				dataSet={dataSet}
				dispatch={dispatch}
				/>
			<RemountOnResize watchedVal={attrs.length}>
				{plot}
			</RemountOnResize>
		</div>
	);

};

GenescapeComponent.propTypes = {
	// Passed down by ViewInitialiser
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = {
	// Initialise genescape state for this dataset
	coordinateAttrs: ['_tSNE1', '_tSNE2'],
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