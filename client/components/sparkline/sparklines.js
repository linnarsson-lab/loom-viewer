import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from 'js/proptypes-typedarray';

import { Remount } from 'components/remount';

import { Canvas } from 'components/canvas';

import { groupedSparkline } from 'plotters/grouped-sparkline';

import { asyncPainterQueue } from 'plotters/async-painter';

import { createComparator } from 'js/state-comparator';

import { nullFunc } from 'js/util';

const sparklineHeight = 40;


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
		const painter = data ?
			groupedPainter(data, colMode, null, label, true) :
			nullFunc;

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
					// We're wrapped inside a component that
					// automatically remounts, so there is
					// no need to add resize event listeners
					ignoreResize
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
		selection,
		containerWidth,
	} = props;

	let i = selection.length,
		painters = new Array(i),
		canvases = new Array(i);

	while (i--) {
		let gene = selection[i];
		painters[i] = makePainter(props, gene);
		canvases[i] = makeCanvas(gene, containerWidth, painters, i);
	}
	return {
		painters,
		canvases,
	};
}

function makePainter(props, gene) {
	const {
		attrs,
		showLabels,
		groupedPainter,
		geneMode,
		settings,
	} = props;
	let geneData = attrs[gene];
	const label = showLabels ? gene : '';
	return groupedPainter(geneData, geneMode, settings, label);
}

function makeCanvas(gene, containerWidth, painters, idx) {
	return (
		<Canvas
			key={'sparkline_' + gene}
			paint={painters[idx]}
			style={{ background: (idx & 1) ? '#F4F4F4' : '#FCFCFC' }}
			width={containerWidth - 20}
			height={sparklineHeight}
			ignoreResize
			noBump
		/>
	);
}

export class Sparklines extends PureComponent {
	constructor(...args) {
		super(...args);
		this.updateChangedSparklines = this.updateChangedSparklines.bind(this);
		this.state = makeSparklines(this.props);
	}

	componentWillReceiveProps(nextProps) {
		if (!notAllSparklines(nextProps, this.props)) {
			// one of the props that requires an update
			// to all sparklines has changed, so we must
			// recreate all nodes.
			this.setState(makeSparklines(nextProps));
		} else {
			this.updateChangedSparklines(nextProps);
		}
	}

	updateChangedSparklines(nextProps) {
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

		let {
			painters, canvases,
		} = this.state;

		let i = selection.length,
			changedPlotters = i !== canvases.length;

		// A sparkline only needs updating when
		// the gene selection changed, or if
		// a fetched gene has arrived.
		while (i--) {
			const gene = selection[i],
				geneData = attrs[gene];
			if (gene !== pSelection[i] || geneData !== pAttrs[gene]) {
				changedPlotters = true;
				const label = showLabels ? gene : '';
				painters[i] = groupedPainter(geneData, geneMode, settings, label);
				canvases[i] = makeCanvas(gene, containerWidth, painters, i);
			}
		}
		if (changedPlotters) {
			painters.length = selection.length;
			canvases.length = selection.length;
			this.setState(() => {
				return {
					painters,
					canvases,
				};
			});
		}
	}

	render() {
		const { containerWidth } = this.props;
		const { canvases } = this.state;
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					minWidth: `${containerWidth - 20}px`,
					maxWidth: `${containerWidth - 20}px`,
					height: `${Math.max(200, canvases.length * sparklineHeight)}px`,
				}}>
				{canvases.length ? canvases : (
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

class SparklineListMounter extends PureComponent {
	constructor(...args) {
		super(...args);
		this.sparklineContainer = this.sparklineContainer.bind(this);
		this.state = {};
	}

	sparklineContainer(div){
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
			this.setState(() => {
				return {
					mountedContainer: div,
					containerWidth,
					containerHeight,
					legendHeight,
					sparklineContainerStyle,
				};
			});
		}
	}

	render() {
		const {
			mountedContainer,
			sparklineContainerStyle,
			containerWidth,
			legendHeight,
		} = this.state;

		if (mountedContainer) {
			const {
				attrs,
				col,
				colAttr,
				colMode,
				geneMode,
				groupedPainter,
				indices,
				path,
				selection,
				settings,
				showLabels,
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
				<div
					ref={this.sparklineContainer}
					className='view centred'>
					Initialising sparklines
				</div>
			);
		}
	}
}

SparklineListMounter.propTypes = {
	attrs: PropTypes.object,
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	geneMode: PropTypes.string,
	groupAttr: PropTypes.string,
	groupedPainter: PropTypes.func.isRequired,
	indices: TypedArrayProp.any,
	path: PropTypes.string.isRequired,
	selection: PropTypes.arrayOf(PropTypes.string),
	settings: PropTypes.object.isRequired,
	showLabels: PropTypes.bool.isRequired,
};

export class SparklineList extends PureComponent {
	constructor(...args) {
		super(...args);

		const {
			attrs,
			groupAttr,
			indices,
		} = this.props;

		this.state = {
			groupedPainter: groupedSparkline(indices, attrs[groupAttr]),
		};
	}

	componentWillReceiveProps(nextProps) {
		const {
			indices, attrs, groupAttr,
		} = nextProps;
		if (
			groupAttr &&
			attrs[groupAttr] !== this.props.attrs[groupAttr] ||
			groupAttr !== this.props.groupAttr ||
			indices !== this.props.indices) {
			this.setState(() => {
				return {
					groupedPainter: groupedSparkline(indices, attrs[groupAttr]),
				};
			});
		}
	}

	render() {
		const {
			groupedPainter,
		} = this.state;

		const {
			col,
			colAttr,
			colMode,
			path,
			attrs,
			selection,
			indices,
			geneMode,
			groupAttr,
			showLabels,
			settings,
		} = this.props;

		return (
			<Remount
				onUnmount={asyncPainterQueue.clear}>
				<SparklineListMounter
					attrs={attrs}
					col={col}
					colAttr={colAttr}
					colMode={colMode}
					geneMode={geneMode}
					groupAttr={groupAttr}
					groupedPainter={groupedPainter}
					indices={indices}
					path={path}
					selection={selection}
					settings={settings}
					showLabels={showLabels} />
			</Remount>
		);
	}
}

SparklineList.propTypes = {
	attrs: PropTypes.object,
	col: PropTypes.object.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
	geneMode: PropTypes.string,
	groupAttr: PropTypes.string,
	indices: TypedArrayProp.any,
	path: PropTypes.string.isRequired,
	selection: PropTypes.arrayOf(PropTypes.string),
	settings: PropTypes.object.isRequired,
	showLabels: PropTypes.bool.isRequired,
};