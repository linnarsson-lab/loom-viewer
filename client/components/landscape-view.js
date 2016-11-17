import React, { PropTypes } from 'react';

import { LandscapeSidepanel } from './landscape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { RemountOnResize } from './remount-on-resize';
import { scatterplot } from './scatterplot';

function makeData(attr, gene, fetchedGenes, colAttrs) {
	return ((attr === '(gene)' && fetchedGenes[gene]) ?
		fetchedGenes[gene] : colAttrs[attr]);
}

const LandscapeComponent = function (props) {
	const { dispatch, dataSet } = props;
	const { fetchedGenes, landscapeState, colAttrs } = dataSet;
	const { coordinateAttrs, coordinateGenes, asMatrix, colorAttr, colorGene, colorMode } = landscapeState;

	// filter out undefined attributes;
	let attrs = [], genes = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			attrs.push(attr);
			genes.push(coordinateGenes[i]);
		}
	}


	const color = makeData(colorAttr, colorGene, fetchedGenes, colAttrs);
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
					const x = makeData(attrs[i], genes[i], fetchedGenes, colAttrs);
					const y = makeData(attrs[j], genes[j], fetchedGenes, colAttrs);
					const logX = attrs[i] === '(gene)';
					const logY = attrs[j] === '(gene)';
					paint = scatterplot(x, y, color, colorMode, logX, logY);
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
		let x = makeData(attrs[0], genes[0], fetchedGenes, colAttrs);
		let y = makeData(attrs[1], genes[1], fetchedGenes, colAttrs);

		const logX = attrs[0] === '(gene)';
		const logY = attrs[1] === '(gene)';

		const paint = scatterplot(x, y, color, colorMode, logX, logY);
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
				dataSet={dataSet}
				dispatch={dispatch}
				/>
			<RemountOnResize watchedVal={attrs.length}>
				{plot}
			</RemountOnResize>
		</div>
	);
};

LandscapeComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise landscapeState for this dataset
	coordinateAttrs: ['_tSNE1', '_tSNE2'],
	coordinateGenes: ['', ''],
	asMatrix: false,
	colorAttr: '(original order)',
	colorGene: '',
	colorMode: 'Heatmap',
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