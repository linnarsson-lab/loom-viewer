import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from '../js/proptypes-typedarray';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { RemountOnResize } from './remount-on-resize';
import { ViewInitialiser } from './view-initialiser';

import { Canvas } from './canvas';
import { sparkline } from './sparkline';

import { isEqual } from 'lodash';

class Legend extends PureComponent {

	shouldComponentUpdate(nextProps) {
		return (
			this.props.colAttr !== nextProps.colAttr ||
			this.props.colMode !== nextProps.colMode ||
			nextProps.indicesChanged
		);
	}

	render() {
		const { col, colAttr, colMode } = this.props;
		const legendData = col.attrs[colAttr];
		if (legendData) {
			return (
				<div style={{
					flex: '0 0 auto',
					overflowY: 'scroll',
					overflowX: 'hidden',
				}}>
					<Canvas
						height={60}
						paint={sparkline(legendData, col.sortedFilterIndices, colMode, null, legendData.name)}
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
	path: PropTypes.string.isRequired,
	indicesChanged: PropTypes.bool.isRequired,
};

class Sparkline extends PureComponent {

	shouldComponentUpdate(nextProps) {
		// let gene = this.props.gene !== nextProps.gene,
		// 	indices = this.props.order !== nextProps.order,
		// 	mode = this.props.geneMode !== nextProps.geneMode,
		// 	label = this.props.showLabels !== nextProps.showLabels,
		// 	data = this.props.geneData === undefined && (this.props.geneData !== nextProps.geneData);

		return this.props.gene !== nextProps.gene ||
			this.props.geneMode !== nextProps.geneMode ||
			this.props.showLabels !== nextProps.showLabels ||
			nextProps.indicesChanged ||
			(this.props.geneData === undefined &&
			nextProps.geneData !== undefined);
	}

	render() {
		const { gene, geneData, sortedFilterIndices, geneMode, showLabels, style } = this.props;
		return (
			<div style={style}>
				<Canvas
					height={30}
					paint={sparkline(geneData, sortedFilterIndices, geneMode, false, showLabels ? gene : null)}
					redraw
					clear
				/>
			</div>
		);
	}
}

Sparkline.propTypes = {
	gene: PropTypes.string,
	geneData: PropTypes.object,
	geneMode: PropTypes.string,
	indicesChanged: PropTypes.bool,
	showLabels: PropTypes.bool,
	sortedFilterIndices: TypedArrayProp.any,
	style: PropTypes.object,
};

class Sparklines extends PureComponent {

	shouldComponentUpdate(nextProps) {
		// attrs object changes, so we check if
		// the objects contained are different
		return this.props.selection !== nextProps.selection ||
			this.props.geneMode !== nextProps.geneMode ||
			this.props.showLabels !== nextProps.showLabels ||
			nextProps.indicesChanged ||
			!isEqual(this.props.attrs, nextProps.attrs);
	}


	render() {
		const {
			attrs,
			selection,
			sortedFilterIndices,
			indicesChanged,
			geneMode,
			showLabels,
		} = this.props;

		let sparklines = [];
		for (let i = 0; i < selection.length; i++) {
			let gene = selection[i];
			let geneData = attrs[gene];
			sparklines.push(
				<Sparkline
					key={gene}
					gene={gene}
					geneData={geneData}
					geneMode={geneMode}
					indicesChanged={indicesChanged}
					sortedFilterIndices={sortedFilterIndices}
					showLabels={showLabels}
					style={{
						background: ((i % 2 === 0) ? '#FFFFFF' : '#F8F8F8'),
						minHeight: '30px',
						maxHeight: '30px',
					}}
				/>
			);
		}

		return (
			<div
				style={{
					display: 'flex',
					flex: 1,
					overflowX: 'hidden',
					overflowY: 'scroll',
					minHeight: 0,
				}}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						width: '100%',
						height: `${selection.length * 30}px`,
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
	sortedFilterIndices: TypedArrayProp.any,
	indicesChanged: PropTypes.bool,
	geneMode: PropTypes.string,
	showLabels: PropTypes.bool,
};

class SparklineViewComponent extends PureComponent {
	componentWillMount() {
		this.setState({
			indicesChanged: false,
		});
	}

	componentWillUpdate(nextProps) {
		const indicesChanged = !isEqual(
			this.props.dataset.col.sortedFilterIndices,
			nextProps.dataset.col.sortedFilterIndices);
		this.setState({
			indicesChanged,
		});

	}

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
		const { indicesChanged } = this.state;

		return (
			<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
				<div style={{ overflowY: 'scroll', minWidth: '300px' }}>
					<SparklineSidepanel
						dispatch={dispatch}
						dataset={dataset}
					/>
				</div>
				<RemountOnResize>
					<div className='view-vertical' style={{ overflowX: 'hidden', minHeight: 0, padding: '20px' }}>
						<Legend
							col={col}
							colAttr={sl.colAttr}
							colMode={sl.colMode}
							path={dataset.path}
							indicesChanged={indicesChanged}
						/>
						<Sparklines
							attrs={dataset.col.attrs}
							selection={sl.genes}
							indicesChanged={indicesChanged}
							sortedFilterIndices={col.sortedFilterIndices}
							geneMode={sl.geneMode}
							showLabels={sl.showLabels} />
					</div>
				</RemountOnResize>
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
	genes: [],
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
