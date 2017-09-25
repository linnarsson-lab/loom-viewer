import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from '../../js/proptypes-typedarray';

import { Canvas } from '../canvas';

import { groupedSparkline } from '../../plotters/grouped-sparkline';

import { createComparator } from '../../js/state-comparator';

const sparklineHeight = 40;

function nullfunc() { }

class Legend extends PureComponent {
	render() {
		const {
			width,
			height,
			col,
			colAttr,
			colMode,
			groupedPainter,
		} = this.props;
		const data = col.attrs[colAttr];

		const label = data ? data.name : null;
		const painter = data ? groupedPainter(data, colMode, null, label, true) : nullfunc;

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
					ignoreHeight
				/>
			</div>
		);
	}
}

Legend.propTypes = {
	groupedPainter: PropTypes.func.isRequired,
	height: PropTypes.number.isRequired,
	width: PropTypes.number.isRequired,
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired,
};

// if any of these are not equal, all sparklines have to be updated
// otherwise, we can limit our updates to a selection.
const notAllSparklines = createComparator({
	groupedPainter: 'func',
	geneMode: 'sparklineType',
	settings: 'object',
	containerWidth: 'number',
	showLabels: 'boolean',
});

function makeSparklines(props) {
	const {
		groupedPainter,
		attrs,
		selection,
		geneMode,
		settings,
		containerWidth,
		showLabels,
	} = props;

	const styleOdd = {
		background: '#F4F4F4',
		minHeight: `${sparklineHeight}px`,
		maxHeight: `${sparklineHeight}px`,
		minWidth: `${containerWidth - 20}px`,
		maxWidth: `${containerWidth - 20}px`,
	};

	const styleEven = {
		background: '#FCFCFC',
		minHeight: `${sparklineHeight}px`,
		maxHeight: `${sparklineHeight}px`,
		minWidth: `${containerWidth - 20}px`,
		maxWidth: `${containerWidth - 20}px`,
	};

	let sparklines = [];
	for (let i = 0; i < selection.length; i++) {
		let gene = selection[i];
		let geneData = attrs[gene];
		const label = showLabels ? gene : '';
		sparklines.push(
			<Canvas
				key={'sparkline_' + gene}
				paint={groupedPainter(geneData, geneMode, settings, label)}
				style={(i & 1) ? styleOdd : styleEven}
				ignoreHeight
			/>
		);
	}
	return sparklines;
}

export class Sparklines extends PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			sparklines: makeSparklines(props),
		};
	}

	componentWillReceiveProps(nextProps) {
		if (notAllSparklines(nextProps, this.props)) {
			// only update the sparklines that changed
			const {
				groupedPainter,
				attrs,
				selection,
				geneMode,
				settings,
				containerWidth,
				showLabels,
			} = nextProps;
			const pSelection = this.props.selection,
				pAttrs = this.props.attrs;

			let sparklines = this.state.sparklines.slice(0),
				changedPlotters = false;

			// A sparkline only needs  updating when
			// the gene selection changed, or if
			// a fetched gene has arrived.
			for (let i = 0; i < selection.length; i++) {
				const gene = selection[i],
					geneData = attrs[gene];
				if (gene !== pSelection[i] || geneData !== pAttrs[gene]) {
					changedPlotters = true;
					// this is a bit of a weird construction,
					// but basically: if the gene was already
					// present in a different location,
					// and the gene data hasn't changed,
					// just move the plot from the other
					// location.
					if (geneData === pAttrs[gene]) {
						let j = pSelection.indexOf(gene, i + 1);
						if (j !== -1) {
							sparklines[i] = sparklines[j];
						}
					} else {
						const label = showLabels ? gene : '';
						sparklines[i] = (
							<Canvas
								key={'sparkline_' + gene}
								paint={groupedPainter(geneData, geneMode, settings, label)}
								style={{
									background: ((i % 2 === 0) ? '#F4F4F4' : '#FCFCFC'),
									minHeight: `${sparklineHeight}px`,
									maxHeight: `${sparklineHeight}px`,
									minWidth: `${containerWidth - 20}px`,
									maxWidth: `${containerWidth - 20}px`,
								}}
								ignoreHeight
							/>
						);
					}
				}
			}
			if (changedPlotters) {
				sparklines.length = selection.length;
				this.setState({ sparklines });
			}
		} else {
			// one of the props that requires an update
			// to all sparklines has changed, so we must
			// recreate all nodes.
			this.setState({ sparklines: makeSparklines(nextProps) });
		}
	}

	render() {
		const { containerWidth } = this.props;
		const { sparklines } = this.state;
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					minWidth: `${containerWidth - 20}px`,
					maxWidth: `${containerWidth - 20}px`,
					height: `${Math.max(200, sparklines.length * sparklineHeight)}px`,
				}}>
				{sparklines.length ? sparklines : (
					<div className='view centred'>
						<span>Select genes to display sparklines</span>
					</div>
				)}
			</div>
		);
	}
}


Sparklines.propTypes = {
	groupedPainter: PropTypes.func.isRequired,
	containerWidth: PropTypes.number.isRequired,
	attrs: PropTypes.object,
	selection: PropTypes.arrayOf(PropTypes.string),
	geneMode: PropTypes.string,
	settings: PropTypes.object.isRequired,
	showLabels: PropTypes.bool.isRequired,
};

export class SparklineList extends PureComponent {
	constructor(props) {
		super(props);

		const { attrs, groupAttr, indices } = this.props;

		this.sparklineContainer = (div) => {
			if (div) {
				const containerWidth = div.clientWidth - 20;
				const containerHeight = div.clientHeight - 20;
				const legendHeight = 60;
				const sparklineContainerStyle = {
					display: 'flex',
					flex: '0 0 auto',
					minWidth: `${containerWidth}px`,
					maxWidth: `${containerWidth}px`,
					minHeight: `${containerHeight - legendHeight}px`,
					maxHeight: `${containerHeight - legendHeight}px`,
					overflowX: 'hidden',
					overflowY: 'scroll',
				};
				this.setState({
					mountedContainer: div,
					containerWidth,
					containerHeight,
					legendHeight,
					sparklineContainerStyle,
				});
			}
		};

		this.state = {
			groupedPainter: groupedSparkline(indices, attrs[groupAttr]),
		};
	}

	componentWillReceiveProps(nextProps) {
		const { indices, attrs, groupAttr } = nextProps;
		if (groupAttr !== this.props.groupAttr ||
			indices !== this.props.indices ||
			groupAttr && attrs[groupAttr] !== this.props.attrs[groupAttr]) {
			this.setState({
				groupedPainter: groupedSparkline(indices, attrs[groupAttr]),
			});
		}
	}

	render() {
		const {
			groupedPainter,
			mountedContainer,
			sparklineContainerStyle,
			containerWidth,
			legendHeight,
		} = this.state;

		if (mountedContainer) {
			const {
				col,
				colAttr,
				colMode,
				path,
				attrs,
				selection,
				indices,
				geneMode,
				showLabels,
				settings,
			} = this.props;

			return (
				<div
					className='view-vertical'
					style={{
						overflowX: 'hidden',
						overflowY: 'hidden',
						minHeight: 0,
					}}
					ref={this.sparklineContainer}>
					<Legend
						groupedPainter={groupedPainter}
						height={legendHeight}
						width={containerWidth}
						col={col}
						colAttr={colAttr}
						colMode={colMode}
						indices={indices}
						path={path}
					/>
					<div
						style={sparklineContainerStyle}>
						<Sparklines
							groupedPainter={groupedPainter}
							containerWidth={containerWidth}
							attrs={attrs}
							selection={selection}
							geneMode={geneMode}
							settings={settings}
							showLabels={showLabels}
						/>
					</div>
				</div >
			);
		}
		else {
			return (
				<div className='view centred' ref={this.sparklineContainer}>
					Initialising sparklines
				</div>
			);
		}
	}
}

SparklineList.propTypes = {
	attrs: PropTypes.object,
	selection: PropTypes.arrayOf(PropTypes.string),
	groupAttr: PropTypes.string,
	indices: TypedArrayProp.any,
	geneMode: PropTypes.string,
	settings: PropTypes.object.isRequired,
	showLabels: PropTypes.bool.isRequired,
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired,
};