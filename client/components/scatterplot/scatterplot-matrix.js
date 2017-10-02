import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from 'js/proptypes-typedarray';

import { scatterPlot } from 'plotters/scatterplot';
import { Canvas } from 'components/canvas';
import { Remount } from 'components/remount';

import { UPDATE_VIEWSTATE } from 'actions/actionTypes';

// See if an individual attr has changed -
// this may happen as the result of a gene
// being fetched or retrieved from cache
function changedAttrs(oldAttrs, newAttrs, settings) {

	if (!(oldAttrs, newAttrs, settings)) {
		return false;
	}

	const {
		x,
		y,
	} = settings;

	const xAttr = oldAttrs[x.attr],
		yAttr = oldAttrs[y.attr],
		colorAttr = oldAttrs[settings.colorAttr],
		newXAttr = newAttrs[x.attr],
		newYAttr = newAttrs[y.attr],
		newColorAttr = newAttrs[settings.colorAttr];
	return colorAttr !== newColorAttr ||
		xAttr !== newXAttr ||
		yAttr !== newYAttr;
}


class SinglePlot extends Component {
	constructor(...args) {
		super(...args);
		const {
			dispatch,
			dataset,
			axis,
			plotNr,
			attrs,
			indices,
			settings,
		} = this.props;

		const { path } = dataset;
		this.selectTab = () => {
			dispatch({
				type: UPDATE_VIEWSTATE,
				stateName: axis,
				path,
				viewState: {
					[axis]: {
						scatterPlots: {
							selectedPlot: plotNr,
						},
					},
				},
			});
		};

		this.state = {
			paint: scatterPlot(attrs, indices, settings),
		};
	}

	componentWillReceiveProps(nextProps) {
		const {
			attrs,
			indices,
			settings,
			plotNr,
		} = nextProps;
		const { props } = this;
		if (plotNr !== props.plotNr ||
			indices !== props.indices ||
			settings !== props.settings ||
			changedAttrs(attrs, props.attrs, settings)) {
			this.setState(() => {
				return {
					paint: scatterPlot(attrs, indices, settings),
				};
			});
		}
	}

	shouldComponentUpdate(nextProps) {
		const {
			attrs,
			indices,
			settings,
			plotNr,
			selectedPlot,
			totalPlots,
			width,
			height,
		} = nextProps;
		const { props } = this;
		return (
			indices !== props.indices ||
			settings !== props.settings ||
			changedAttrs(attrs, props.attrs, settings) ||
			(plotNr === selectedPlot) !== (props.plotNr === props.selectedPlot) ||
			(plotNr < totalPlots) !== (props.plotNr < props.totalPlots) ||
			plotNr !== props.plotNr ||
			width !== props.width ||
			height !== props.height
		);
	}


	render() {
		const {
			plotNr,
			selectedPlot,
			totalPlots,
			width,
			height,
		} = this.props;

		return (
			<button
				style={{
					border: plotNr === selectedPlot ?
						'1px solid black' :
						'1px solid lightgrey',
					flex: '0 0 auto',
					margin: '1px',
					padding: 0,
					backgroundColor: 'transparent',
				}}
				disabled={plotNr >= totalPlots || plotNr === selectedPlot}
				onClick={this.selectTab}>
				<Canvas
					paint={plotNr < totalPlots ?
						this.state.paint :
						null
					}
					width={width}
					height={height}
					// We are wrapped inside a component that remounts,
					// so we can skip the pointless event listeners
					ignoreResize
				/>
			</button>
		);
	}
}

SinglePlot.propTypes = {
	// props for button
	axis: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	plotNr: PropTypes.number.isRequired,
	selectedPlot: PropTypes.number.isRequired,
	totalPlots: PropTypes.number.isRequired,
	// props for canvas
	attrs: PropTypes.object.isRequired,
	indices: TypedArrayProp.any,
	settings: PropTypes.object.isRequired,
	width: PropTypes.number.isRequired,
	height: PropTypes.number.isRequired,
};

export class ScatterPlotMatrix extends Component {
	constructor(...args) {
		super(...args);
		this.mountedView = this.mountedView.bind(this);
		this.state = { matrix: [] };
	}

	mountedView(view) {
		if (view) {
			this.setState(() => {
				return { view };
			});
		}
	}

	render() {
		const {
			attrs,
			axis,
			dataset,
			dispatch,
			indices,
			plotSettings,
			selectedPlot,
			totalPlots,
		} = this.props;

		const { view } = this.state;

		let matrix;
		if (view) {
			matrix = [];

			// Avoid triggering presence of scrollbars
			const totalRows = totalPlots > 2 ? 2 : 1,
				totalColumns = totalPlots > 1 ? 2 : 1,
				containerW = view.clientWidth - 20 | 0,
				containerH = view.clientHeight - 20 | 0,
				rowW = containerW,
				rowH = containerH / totalRows | 0,
				plotW = rowW / totalColumns - 2 | 0,
				plotH = rowH - 2;

			for (let j = 0; j < totalRows; j++) {
				let row = [];
				for (let i = 0; i < totalColumns; i++) {
					const plotNr = i + j * 2;
					row.push(
						<SinglePlot
							key={`plot-${plotNr}`}
							axis={axis}
							dataset={dataset}
							dispatch={dispatch}
							plotNr={plotNr}
							selectedPlot={selectedPlot}
							totalPlots={totalPlots}
							attrs={attrs}
							indices={indices}
							settings={plotSettings[plotNr]}
							width={plotW}
							height={plotH}
						/>
					);
				}

				matrix.push(
					<div
						key={'row_' + j}
						className={'view'}
						style={{
							flex: '0 0 auto',
							minWidth: `${rowW}px`,
							maxWidth: `${rowW}px`,
							minHeight: `${rowH}px`,
							maxHeight: `${rowH}px`,
						}}>
						{row}
					</div>
				);
			}
		}

		return (
			<Remount watchedVal={totalPlots}>
				<div className='view-vertical' ref={this.mountedView}>
					{matrix}
				</div>
			</Remount>
		);
	}
}

ScatterPlotMatrix.propTypes = {
	// Passed down by ViewInitialiser
	attrs: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	plotSettings: PropTypes.object.isRequired,
	selectedPlot: PropTypes.number.isRequired,
	totalPlots: PropTypes.number.isRequired,
	indices: TypedArrayProp.any,
};