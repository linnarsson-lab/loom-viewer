import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';


import {
	Button,
} from 'react-bootstrap';

import { scatterPlot } from '../../plotters/scatterplot';
import { Canvas } from '../canvas';
import { RemountOnResize } from '../remount-on-resize';

import { setViewProps } from '../../actions/set-viewprops';

import { merge } from '../../js/util';


export class ScatterPlotMatrix extends PureComponent {
	constructor(props) {
		super(props);
		this.mountedView = this.mountedView.bind(this);
		this.selectTab = this.selectTab.bind(this);
		this.state = {};
	}

	selectTab(key) {
		const { dispatch, dataset, axis } = this.props;
		dispatch(setViewProps(
			dataset,
			{
				stateName: axis,
				path: dataset.path,
				viewState: {
					[axis]: {
						scatterPlots: {
							selected: key,
						},
					},
				},
			}
		));
	}

	mountedView(view) {
		// Scaling lets us adjust the painter function for
		// high density displays and zoomed browsers.
		// Painter functions decide how to use scaling
		// on a case-by-case basis.
		if (view) {
			const { props } = this;
			const totalPlots = props.dataset.viewState[props.axis].scatterPlots.plots.length;
			// Avoid triggering presence of scrollbars
			const totalRows = totalPlots > 2 ? 2 : 1,
				totalColumns = totalPlots > 1 ? 2 : 1,
				containerW = view.clientWidth - 20 | 0,
				containerH = view.clientHeight - 20 | 0,
				rowW = containerW,
				rowH = containerH / totalRows | 0,
				canvasW = containerW / totalColumns - 2 | 0,
				canvasH = rowH - 2;

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
			});
		}
	}

	render() {
		const {
			dataset,
			axis,
		} = this.props;

		const { attrs } = dataset[axis];

		const {
			ascendingIndices,
			scatterPlots,
			settings,
		} = dataset.viewState[axis];

		const {
			plots,
			selected,
		} = scatterPlots;

		let matrix;
		if (this.state.view && this.state.totalPlots === plots.length) {
			matrix = [];

			const plotters = plots.map((plot) => {
				const xAttr = attrs[plot.x.attr],
					yAttr = attrs[plot.y.attr],
					colorAttr = attrs[plot.colorAttr],
					scatterPlotSettings = merge(plot, settings);
				return scatterPlot(xAttr, yAttr, colorAttr, ascendingIndices, scatterPlotSettings);
			});

			const {
				totalColumns,
				totalRows,
				rowW,
				rowH,
				canvasW,
				canvasH,
			} = this.state;

			for (let j = 0; j < totalRows; j++) {
				let row = [];
				for (let i = 0; i < totalColumns; i++) {
					let idx = i + j * 2;

					row.push(
						<button
							style={{
								border: idx === selected ? '1px solid black' : '1px solid lightgrey',
								flex: '0 0 auto',
								margin: '1px',
								padding: 0,
								backgroundColor: 'transparent',
							}}
							onClick={() => { this.selectTab(idx); }}>
							<Canvas
								key={`${i}_${j}-${plots[idx].x.attr}-${plots[idx].y.attr}`}
								width={canvasW}
								height={canvasH}
								paint={plotters[idx]}
								redraw
								clear
							/>
						</button>
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
			<RemountOnResize watchedVal={scatterPlots}>
				<div className='view-vertical' ref={this.mountedView}>
					{matrix}
				</div>
			</RemountOnResize>
		);
	}
}

ScatterPlotMatrix.propTypes = {
	// Passed down by ViewInitialiser
	axis: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};