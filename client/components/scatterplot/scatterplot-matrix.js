import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from '../../js/proptypes-typedarray';

import { scatterPlot } from '../../plotters/scatterplot';
import { Canvas } from '../canvas';
import { RemountOnResize } from '../remount-on-resize';

import { setViewProps } from '../../actions/set-viewprops';


class SinglePlot extends Component {
	constructor(props) {
		super(props);
		const { dispatch, dataset, axis, idx } = this.props;
		const { path } = dataset;
		this.selectTab = () => {
			dispatch(setViewProps(
				dataset,
				{
					stateName: axis,
					path,
					viewState: {
						[axis]: {
							scatterPlots: {
								selectedPlot: idx,
							},
						},
					},
				}
			));
		};
	}


	render() {
		const {
			idx,
			selectedPlot,
			canvasW,
			canvasH,
			paintFunctions,
		} = this.props;

		return (
			<button
				style={{
					border: idx === selectedPlot ? '1px solid black' : '1px solid lightgrey',
					flex: '0 0 auto',
					margin: '1px',
					padding: 0,
					backgroundColor: 'transparent',
				}}
				onClick={this.selectTab}>
				<Canvas
					width={canvasW}
					height={canvasH}
					paint={paintFunctions[idx]}
					redraw
					clear
				/>
			</button>
		);
	}
}

SinglePlot.propTypes = {
	axis: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	idx: PropTypes.number.isRequired,
	selectedPlot: PropTypes.number.isRequired,
	canvasW: PropTypes.number.isRequired,
	canvasH: PropTypes.number.isRequired,
	paintFunctions: PropTypes.arrayOf(PropTypes.func).isRequired,

};

// see if individual attr has changed -
// this may happen as the result of
// a fetched gene
function changedAttrs(oldAttrs, newAttrs, settings) {
	const xAttr = oldAttrs[settings.x.attr],
		yAttr = oldAttrs[settings.y.attr],
		colorAttr = oldAttrs[settings.colorAttr],
		newXAttr = newAttrs[settings.x.attr],
		newYAttr = newAttrs[settings.y.attr],
		newColorAttr = newAttrs[settings.colorAttr];
	return xAttr !== newXAttr ||
		yAttr !== newYAttr ||
		colorAttr !== newColorAttr;
}

function preparePlot(idx, dataset, dispatch, axis, canvasW, canvasH, paintFunctions, totalPlots, selectedPlot){
	return(
		<SinglePlot
			key={`plot-${idx}`}
			axis={axis}
			dataset={dataset}
			dispatch={dispatch}
			idx={idx}
			selectedPlot={selectedPlot}
			canvasW={canvasW}
			canvasH={canvasH}
			paintFunctions={paintFunctions}
		/>
	);
}

// We want to keep these as constant as possible
function preparePlots(dataset, dispatch, axis, canvasW, canvasH, paintFunctions, totalPlots, selectedPlot){
	let plots = [];
	for (let i = 0; i < totalPlots; i++) {
		plots.push(preparePlot(
			i,
			dataset, dispatch, axis,
			canvasW, canvasH,
			paintFunctions,
			totalPlots, selectedPlot));
	}
	return plots;
}

export class ScatterPlotMatrix extends Component {
	constructor(props) {
		super(props);
		this.mountedView = this.mountedView.bind(this);

		const {
			attrs,
			plotSettings,
			indices,
		} = this.props;

		const paintFunctions = plotSettings.map((settings) => {
			return scatterPlot(attrs, indices, settings);
		});

		this.state = { paintFunctions, plots: [] };
	}

	mountedView(view) {
		// Scaling lets us adjust the painter function for
		// high density displays and zoomed browsers.
		// Painter functions decide how to use scaling
		// on a case-by-case basis.
		if (view) {
			const { props } = this;
			const { axis, dataset, dispatch, selectedPlot } = props;
			const totalPlots = props.plotSettings.length;
			// Avoid triggering presence of scrollbars
			const totalRows = totalPlots > 2 ? 2 : 1,
				totalColumns = totalPlots > 1 ? 2 : 1,
				containerW = view.clientWidth - 20 | 0,
				containerH = view.clientHeight - 20 | 0,
				rowW = containerW,
				rowH = containerH / totalRows | 0,
				canvasW = containerW / totalColumns - 2 | 0,
				canvasH = rowH - 2;

			const { paintFunctions } = this.state;
			const plots = preparePlots(dataset, dispatch, axis, canvasW, canvasH, paintFunctions, totalPlots, selectedPlot);

			this.setState({
				view,
				totalPlots,
				totalColumns,
				totalRows,
				containerW,
				containerH,
				rowW,
				rowH,
				canvasW,
				canvasH,
				plots,
			});
		}
	}

	componentWillUpdate(nextProps) {
		const {
			dataset,
			dispatch,
			axis,
			attrs,
			indices,
			plotSettings,
			selectedPlot,
		} = this.props;

		const nextDataset = nextProps.dataset;
		const nextIndices = nextProps.indices;
		const nextAttrs = nextProps.attrs;
		const newPlotSettings = nextDataset.viewState[axis].scatterPlots.plotSettings;

		const { state } = this;
		const {
			canvasW,
			canvasH,
			totalPlots,
			view,
		} = state;

		let paintFunctions = state.paintFunctions.slice(0),
			plots = state.plots.slice(0),
			changedPaintFunctions = false;

		// if the indices change, all plots have to be updated
		if (nextIndices !== indices) {
			changedPaintFunctions = true;
			paintFunctions = newPlotSettings.map((newSettings) => {
				return scatterPlot(nextAttrs, nextIndices, newSettings);
			});
			if (view){
				plots = preparePlots(dataset, dispatch, axis, canvasW, canvasH, paintFunctions, totalPlots, selectedPlot);
			}

		} else {
			// only update paintFunctions if their settings have changed.
			// Only one plot changes settings at a time, but what
			// might happen is that we fetch genes for all plots
			// at once, and they arrive all at once. This would
			// cause attrs to update for multiple plots
			plotSettings.map((settings, idx) => {
				const newSettings = newPlotSettings[idx];
				if (settings !== newSettings || changedAttrs(attrs, nextAttrs, settings)) {
					changedPaintFunctions = true;
					paintFunctions[idx] = scatterPlot(nextAttrs, nextIndices, newSettings);
					if (view){
						plots[idx] = preparePlot(idx, dataset, dispatch, axis, canvasW, canvasH, paintFunctions, totalPlots, selectedPlot);
					}
				}
			});
		}

		if (changedPaintFunctions) {
			this.setState({ paintFunctions, plots });
		}

	}

	render() {
		const {
			axis,
			dataset,
			dispatch,
			plotSettings,
			selectedPlot,
		} = this.props;

		let matrix;
		if (this.state.view && this.state.totalPlots === plotSettings.length) {
			matrix = [];
			const {
				totalPlots,
				totalColumns,
				totalRows,
				rowW,
				rowH,
				canvasW,
				canvasH,
				paintFunctions,
			} = this.state;

			for (let j = 0; j < totalRows; j++) {
				let row = [];
				for (let i = 0; i < totalColumns; i++) {
					const idx = i + j * 2;
					if (idx < totalPlots){
						row.push(
							<SinglePlot
								key={`plot-${idx}`}
								axis={axis}
								dataset={dataset}
								dispatch={dispatch}
								idx={idx}
								selectedPlot={selectedPlot}
								canvasW={canvasW}
								canvasH={canvasH}
								paintFunctions={paintFunctions}
							/>
						);
					}
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
			<RemountOnResize watchedVal={plotSettings.length}>
				<div className='view-vertical' ref={this.mountedView}>
					{matrix}
				</div>
			</RemountOnResize>
		);
	}
}

ScatterPlotMatrix.propTypes = {
	// Passed down by ViewInitialiser
	attrs: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	plotSettings: PropTypes.array.isRequired,
	selectedPlot: PropTypes.number.isRequired,
	indices: TypedArrayProp.any,
};