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
		const { width, height, col, colAttr, colMode } = this.props;
		const legendData = col.attrs[colAttr];
		const painter = legendData ? sparkline(legendData, col.sortedFilterIndices, colMode, null, legendData ? legendData.name : null) : () => { };
		return (
			<div style={{
				flex: '0 0 auto',
				overflowY: 'scroll',
				overflowX: 'hidden',
				height: `${height}px`,
				minHeight: `${height}px`,
				maxHeight: `${height}px`,
				minWidth: `${width}px`,
				maxWidth: `${width}px`,
				width: `${width}px`,
			}}>
				<Canvas
					width={width - 20}
					height={height}
					paint={painter}
					redraw
					clear
				/>
			</div>
		);
	}
}


Legend.propTypes = {
	height: PropTypes.number.isRequired,
	width: PropTypes.number.isRequired,
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
			containerWidth,
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
						minWidth: `${containerWidth - 20}px`,
						maxWidth: `${containerWidth - 20}px`,
					}}
				/>
			);
		}
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					minWidth: `${containerWidth - 20}px`,
					maxWidth: `${containerWidth - 20}px`,
					height: `${Math.max(200, selection.length * 30)}px`,
				}}>
				{sparklines.length ? sparklines : (
					<div className='view centered'>
						<span>Select genes to display sparklines</span>
					</div>
				)}
			</div>
		);
	}
}


Sparklines.propTypes = {
	containerWidth: PropTypes.number.isRequired,
	attrs: PropTypes.object,
	selection: PropTypes.arrayOf(PropTypes.string),
	sortedFilterIndices: TypedArrayProp.any,
	indicesChanged: PropTypes.bool,
	geneMode: PropTypes.string,
	showLabels: PropTypes.bool,
};

class SparklineList extends PureComponent {
	componentWillMount() {
		this.setState({ mounted: false });
	}

	componentDidMount() {
		this.setState({ mounted: true });
	}

	render() {
		if (this.state.mounted) {
			const {
				col,
				colAttr,
				colMode,
				path,
				attrs,
				selection,
				sortedFilterIndices,
				indicesChanged,
				geneMode,
				showLabels,
			} = this.props;

			const el = this.refs.sparklineContainer;
			const containerWidth = el.clientWidth - 20;
			const containerHeight = el.clientHeight - 20;
			const legendHeight = 60;

			return (
				<div
					className='view-vertical'
					style={{
						overflowX: 'hidden',
						overFloxY: 'hidden',
						minHeight: 0,
					}}
					ref='sparklineContainer'>
					<Legend
						height={legendHeight}
						width={containerWidth}
						col={col}
						colAttr={colAttr}
						colMode={colMode}
						path={path}
						indicesChanged={indicesChanged}
					/>
					<div
						style={{
							display: 'flex',
							flex: '0 0 auto',
							minWidth: `${containerWidth}px`,
							maxWidth: `${containerWidth}px`,
							minHeight: `${containerHeight - legendHeight}px`,
							maxHeight: `${containerHeight - legendHeight}px`,
							overflowX: 'hidden',
							overflowY: 'scroll',
						}}>
						<Sparklines
							attrs={attrs}
							selection={selection}
							sortedFilterIndices={sortedFilterIndices}
							indicesChanged={indicesChanged}
							geneMode={geneMode}
							showLabels={showLabels}
							containerWidth={containerWidth}
						/>
					</div>
				</div >
			);
		}
		else {
			return (
				<div className='view centered' ref='sparklineContainer'>
					Initialising sparklines
				</div>
			);
		}
	}
}

SparklineList.propTypes = {
	attrs: PropTypes.object,
	selection: PropTypes.arrayOf(PropTypes.string),
	sortedFilterIndices: TypedArrayProp.any,
	indicesChanged: PropTypes.bool,
	geneMode: PropTypes.string,
	showLabels: PropTypes.bool,
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired,
};

class SparklineViewComponent extends PureComponent {
	componentWillMount() {
		this.setState({
			indicesChanged: false,
		});
	}

	componentWillReceiveProps(nextProps) {
		const indicesChanged = !isEqual(
			this.props.dataset.viewState.col.order,
			nextProps.dataset.viewState.col.order
		) || !isEqual(
			this.props.dataset.col.sortedFilterIndices,
			nextProps.dataset.col.sortedFilterIndices
		);
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
			<RemountOnResize>
				<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
					<div
						style={{
							width: '300px',
							margin: '10px',
							overflowY: 'scroll',
						}}>
						<SparklineSidepanel
							dispatch={dispatch}
							dataset={dataset}
						/>
					</div>
					<SparklineList
						attrs={dataset.col.attrs}
						selection={sl.genes}
						indicesChanged={indicesChanged}
						sortedFilterIndices={col.sortedFilterIndices}
						geneMode={sl.geneMode}
						col={col}
						colAttr={sl.colAttr}
						colMode={sl.colMode}
						path={dataset.path}
						showLabels={sl.showLabels} />
				</div>
			</RemountOnResize>
		);
	}
}


SparklineViewComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise sparklineState for this dataset
	colAttr: 'Clusters',
	colMode: 'Stacked',
	geneMode: 'Bars',
	genes: ['Cdk1', 'Top2a', 'Hexb', 'Mrc1', 'Lum', 'Col1a1', 'Cldn5', 'Acta2', 'Tagln', 'Foxj1', 'Ttr', 'Aqp4', 'Meg3', 'Stmn2', 'Gad2', 'Slc32a1', 'Plp1', 'Sox10', 'Mog', 'Mbp', 'Mpz'],
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
