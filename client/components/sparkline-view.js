import React, { PropTypes } from 'react';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { ViewInitialiser } from './view-initialiser';

import { Canvas } from './canvas';
import { sparkline } from './sparkline';

const SparklineViewComponent = (props) => {
	const { dispatch, dataset} = props;
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

	// only show the genes that actually have been fetched
	// note that genes are now stored in col.attrs
	let sparklines = [], j = 0;
	for (let i = 0; i < selection.length; i++) {
		let geneData = dataset.col.attrs[selection[i]];
		// no point trying to generate genes without data
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
