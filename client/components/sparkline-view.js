import React, { Component, PropTypes } from 'react';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { ViewInitialiser } from './view-initialiser';

import { Canvas } from './canvas';
import { sparkline } from './sparkline';

import * as _ from 'lodash';

const SparklineViewComponent = (props) => {
	const { dataSet, dispatch } = props;
	const sl = dataSet.sparklineState;
	// The old column attribute values that we displayed in the "legend"
	let legendData = dataSet.colAttrs[sl.colAttr];
	// if colAttr does not exist (for example, the default values
	// in the Loom interface is not present), pick the first column
	if (legendData === undefined) {
		legendData = dataSet.colAttrs[dataSet.colKeys[0]];
	}

	// selected genes in state
	const selection = sl.genes;

	// only show the genes that actually have been fetched
	let sparklines = [], j = 0;
	for (let i = 0; i < selection.length; i++) {
		let geneData = dataSet.fetchedGenes[selection[i]];
		// no point trying to generate genes without data
		if (geneData) {
			sparklines.push(
				<div
					key={selection[i]}
					style={{
						background: ((j++ % 2 === 0) ? '#FFFFFF' : '#F8F8F8'),
						display: 'flex',
						flexDirection: 'column',
						minHeight: '30px',
						maxHeight: '30px',
					}}>
					<Canvas
						height={30}
						paint={sparkline(geneData, sl.geneMode, undefined, sl.showLabels ? selection[i] : null)}
						redraw
						clear
						/>
				</div>
			);
		}
	}

	const legend = (
		<div style={{
			flex: '0 0 auto',
			minHeight: '20px',
			overflowY: 'scroll',
			overflowX: 'hidden',
		}}>
			<Canvas
				height={20}
				paint={sparkline(legendData, sl.colMode)}
				redraw
				clear
				/>
		</div>
	);

	const sparklineview = (
		<div className='view-vertical' style={{ margin: '20px 20px 20px 20px' }}>
			{legend}
			<div style={{
				display: 'flex',
				flex: 1,
				overflowY: 'scroll',
				overflowX: 'hidden',
			}}>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
				}}>
					{sparklines}
				</div>
			</div>
			{legend}
		</div>
	);


	return (
		<div className='view' style={{ overflowX: 'hidden' }}>
			<div style={{ overflowY: 'auto' }}>
				<SparklineSidepanel
					dataSet={dataSet}
					dispatch={dispatch}
					/>
			</div>
			{sparklineview}
		</div>
	);
};


SparklineViewComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise sparklineState for this dataset
	colMode: 'Categorical',
	geneMode: 'Bars',
	genes: '',
	showLabels: true,
};

export const SparklineViewInitialiser = function (props) {
	return (
		<ViewInitialiser
			View={SparklineViewComponent}
			viewStateName={'sparklineState'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			data={props.data} />
	);
};

SparklineViewInitialiser.propTypes = {
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

export const SparklineView = connect(mapStateToProps)(SparklineViewInitialiser);