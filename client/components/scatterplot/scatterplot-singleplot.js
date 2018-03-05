import React, {
	PureComponent,
} from 'react';
import PropTypes from 'prop-types';
import {
	TypedArrayProp,
} from 'js/proptypes-typedarray';

import {
	memoizedScatterPlot,
} from 'plotters/scatterplot';
import {
	Canvas,
} from 'components/canvas';

import {
	UPDATE_VIEWSTATE,
} from 'actions/action-types';
import {
	nullFunc,
} from '../../js/util';
import { nullPainter } from '../../plotters/nullpainter';


const singlePlotSelectedStyle = {
	border: '1px solid black',
	flex: '0 0 auto',
	margin: '1px',
	padding: 0,
	backgroundColor: 'transparent',
};

const singlePlotStyle = {
	border: '1px solid lightgrey',
	flex: '0 0 auto',
	margin: '1px',
	padding: 0,
	backgroundColor: 'transparent',
};

export class SinglePlot extends PureComponent {
	constructor(...args) {
		super(...args);
		const {
			dispatch,
			dataset,
			axis,
			plotNr,
			totalPlots,
		} = this.props;

		const {
			path,
		} = dataset;
		this.selectTab = plotNr < totalPlots ? (
			() => {
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
			}) : nullFunc;
		this.state = {
			scatterPlot: memoizedScatterPlot(),
		};
	}

	render() {
		const {
			attrs,
			ascendingIndices,
			settings,
			plotNr,
			selectedPlot,
			totalPlots,
			width,
			height,
		} = this.props;

		const {
			scatterPlot,
		} = this.state;
		let painter = nullPainter;
		if (plotNr < totalPlots){
			const cAttr = attrs[settings.colorAttr],
				xAttr = attrs[settings.x.attr],
				yAttr = attrs[settings.y.attr];
			painter = scatterPlot(cAttr, xAttr, yAttr, ascendingIndices, settings);
		}

		// Wrapping the entire canvas in a button is probably a dirty
		// hack and breaks ARIA, but it does give keyboard support
		// out of the box for "free"
		return (
			<button
				style={plotNr === selectedPlot ? singlePlotSelectedStyle : singlePlotStyle}
				disabled={plotNr >= totalPlots || plotNr === selectedPlot}
				onClick={this.selectTab} >
				<Canvas
					paint={painter}
					forceUpdate
					width={width}
					height={height}
					// We are wrapped inside a component that remounts,
					// so we can skip the pointless event listeners
					ignoreResize />
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
	ascendingIndices: TypedArrayProp.any,
	settings: PropTypes.object,
	width: PropTypes.number.isRequired,
	height: PropTypes.number.isRequired,
};