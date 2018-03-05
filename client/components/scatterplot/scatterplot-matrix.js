import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TypedArrayProp } from 'js/proptypes-typedarray';

import { Remount } from 'components/remount';

import { SinglePlot } from './scatterplot-singleplot.js';

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
			ascendingIndices,
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
							ascendingIndices={ascendingIndices}
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
	ascendingIndices: TypedArrayProp.any,
};