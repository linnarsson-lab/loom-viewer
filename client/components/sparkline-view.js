import React, { PropTypes } from 'react';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { ViewInitialiser } from './view-initialiser';

import { Canvas } from './canvas';
import { sparkline } from './sparkline';
import { AttrLegend } from './legend';

import {
	SET_VIEW_PROPS,
} from '../actions/actionTypes';


function Legend(props) {
	const { col, colAttr, colMode, dispatch, path } = props;
	const legendData = col.attrs[colAttr];
	if (legendData) {
		const filterFunc = (val) => {
			return () => {
				dispatch({
					type: SET_VIEW_PROPS,
					path,
					axis: 'col',
					filterAttrName: colAttr,
					filterVal: val,
				});
			};
		};
		return (
			<div style={{
				flex: '0 0 auto',
				minHeight: '20px',
				overflowY: 'scroll',
				overflowX: 'hidden',
			}}>
				<AttrLegend
					mode={colMode}
					filterFunc={filterFunc}
					attr={legendData}
				/>
				<Canvas
					height={20}
					paint={sparkline(legendData, col.sortedFilterIndices, colMode)}
					redraw
					clear
				/>
			</div>
		);
	} else {
		return null;
	}

}

Legend.propTypes = {
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
	path: PropTypes.string.isRequired,
};

const SparklineViewComponent = (props) => {
	const { dispatch, dataset } = props;
	const { col } = dataset;
	const sl = dataset.viewState.sparkline;
	// The old column attribute values that we displayed in the "legend"
	let legendData = col.attrs[sl.colAttr];
	// if colAttr does not exist (for example, the default values
	// in the Loom interface is not present), pick the first column
	if (legendData === undefined) {
		legendData = col.attrs[col.keys[0]];
	}

	// selected genes in state
	const selection = sl.genes;

	let sparklines = [], j = 0;
	for (let i = 0; i < selection.length; i++) {
		// genes are now stored in col.attrs
		let geneData = dataset.col.attrs[selection[i]];
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
					paint={sparkline(geneData, col.sortedFilterIndices, sl.geneMode, false, sl.showLabels ? selection[i] : null)}
					redraw
					clear
				/>
			</div>
		);
	}

	const sparklineview = (
		<div className='view-vertical' style={{ margin: '20px 20px 20px 20px' }}>
			<Legend
				col={col}
				colAttr={sl.colAttr}
				colMode={sl.colMode}
				dispatch={dispatch}
				path={dataset.path}
			/>
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
		</div>
	);


	return (
		<div className='view' style={{ overflowX: 'hidden' }}>
			<div style={{ overflowY: 'auto' }}>
				<SparklineSidepanel
					dispatch={dispatch}
					dataset={dataset}
				/>
			</div>
			{sparklineview}
		</div>
	);
};


SparklineViewComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
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
			stateName={'sparkline'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			datasets={props.datasets} />
	);
};

SparklineViewInitialiser.propTypes = {
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

export const SparklineView = connect(mapStateToProps)(SparklineViewInitialiser);
