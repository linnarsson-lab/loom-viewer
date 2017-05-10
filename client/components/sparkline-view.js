import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from '../js/proptypes-typedarray';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { ViewInitialiser } from './view-initialiser';

import { Canvas } from './canvas';
import { sparkline } from './sparkline';
import { AttrLegend } from './legend';

import { isEqual } from 'lodash';


import {
	SET_VIEW_PROPS,
} from '../actions/actionTypes';


class Legend extends PureComponent {
	render() {
		const { col, colAttr, colMode, dispatch, path } = this.props;
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
}

Legend.propTypes = {
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
	path: PropTypes.string.isRequired,
};

class Sparklines extends PureComponent {

	shouldComponentUpdate(nextProps){
		// attrs object changes, so we check if
		// the objects contained are different
		return this.props.selection !== nextProps.selection ||
		this.props.sortedFilterIndices !== nextProps.sortedFilterIndices ||
		this.props.geneMode !== nextProps.geneMode ||
		this.props.showLabels !== nextProps.showLabels ||
		!isEqual(this.props.attrs, nextProps.attrs);
	}

	render() {
		const { attrs, selection, sortedFilterIndices, geneMode, showLabels } = this.props;

		let sparklines = [], j = 0;
		for (let i = 0; i < selection.length; i++) {
			let geneData = attrs[selection[i]];
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
						paint={sparkline(geneData, sortedFilterIndices, geneMode, false, showLabels ? selection[i] : null)}
						redraw
						clear
					/>
				</div>
			);
		}

		return (
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
		);
	}
}

Sparklines.propTypes = {
	attrs: PropTypes.object,
	selection: PropTypes.arrayOf(PropTypes.string),
	sortedFilterIndices: PropTypes.oneOf([PropTypes.array, TypedArrayProp]),
	geneMode: PropTypes.string,
	showLabels: PropTypes.bool,
};

class SparklineViewComponent extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;
		const { col } = dataset;
		const sl = dataset.viewState.sparkline;
		// The old column attribute values that we displayed in the "legend"
		let legendData = col.attrs[sl.colAttr];
		// if colAttr does not exist (for example, the default values
		// in the Loom interface is not present), pick the first column
		if (legendData === undefined) {
			legendData = col.attrs[col.keys[0]];
		}

		return (
			<div className='view' style={{ overflowX: 'hidden' }}>
				<div style={{ overflowY: 'auto' }}>
					<SparklineSidepanel
						dispatch={dispatch}
						dataset={dataset}
					/>
				</div>
				<div className='view-vertical' style={{ margin: '20px 20px 20px 20px' }}>
					<Legend
						col={col}
						colAttr={sl.colAttr}
						colMode={sl.colMode}
						dispatch={dispatch}
						path={dataset.path}
					/>
					<Sparklines
						attrs={dataset.col.attrs}
						selection={sl.genes}
						sortedFilterIndices={col.sortedFilterIndices}
						geneMode={sl.geneMode}
						showLabels={sl.showLabels} />
				</div>
			</div>
		);
	}
}


SparklineViewComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise sparklineState for this dataset
	colMode: 'Stacked',
	geneMode: 'Bars',
	genes: '',
	showLabels: true,
};

export class SparklineViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={SparklineViewComponent}
				stateName={'sparkline'}
				initialState={initialState}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

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
