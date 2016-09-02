import React, {PropTypes} from 'react';
import { nMostFrequent } from '../js/util';
import * as colors from '../js/colors';
import { Canvas } from './canvas';

// Sparkline Component


// Calculate the means, the max and the min
const calcMeans = function (rangeData) {
	let max = Number.MIN_VALUE, min = Number.MAX_VALUE;

	let means = rangeData.map((group) => {
		let mean = 0;
		for (let i = 0; i < group.length; i++) {
			mean += group[i];
		}
		mean /= group.length;
		max = mean > max ? mean : max;
		min = mean < min ? mean : min;
		return mean;
	});

	return { means, max, min };
};

export class Sparkline extends React.Component {
	constructor(props) {
		super(props);
		this.paint = this.paint.bind(this);
	}

	paint(context) {
		if (this.props.data === undefined) {
			return;
		}

		// All of our plotting functions draw horizontaly
		// To get a vertical plot, we simply rotate the canvas
		// before invoking them. To not mess up the context
		// settings, we save before and restore at the end
		if (this.props.orientation !== 'horizontal') {
			context.save();
			context.translate(this.props.width, 0);
			context.rotate(90 * Math.PI / 180);
			let t = context.width;
			context.width = context.height;
			context.height = t;
		}

		// Since the following involves a lot of mathematical trickery,
		// I figured I'd better document this inline in long-form.

		// dataRange consists of two doubles that indicate which part
		// of the data is displayed (using the bounds of the leaflet
		// heatmap actually works out here, because it has has a
		// one-to-one pixel width/height to column/row mapping.
		// If this ever changes we need to change this code too).

		// We're going to ignore the accumulated rounding errors in
		// intermediate calculations, since doubles have so much
		// precision that it's unlikely we'll ever be off by more
		// than one pixel.

		// The key insight is that the fractional part of these floats
		// indicate that only a fraction of a data point is displayed.
		// So for example:
		//   dataRange = [ 1.4, 5.3 ]
		// .. results in displaying datapoints 1 to6, but data point 1
		// will only be 0.6 times the width of the other data points,
		// and point 6 will only be 0.3 times the width.

		// If dataRange is undefined, use the whole dataset.
		const data = this.props.data;
		const dataRange = this.props.dataRange ?
			this.props.dataRange : [0, data.length];

		const leftRange = dataRange[0];
		const rightRange = dataRange[1];

		// While we return if our total data range is zero, it *is*
		// allowed to be out of bounds for the dataset. For the
		// "datapoints" out of the range we simply don't display anything.
		// This is a simple way of allowing us to zoom out!

		const totalRange = Math.ceil(rightRange) - Math.floor(leftRange);
		if (totalRange === 0) { return; }
		const unroundedRange = rightRange - leftRange;
		const leftRangeFrac = leftRange - Math.floor(leftRange);

		// We need to find the effective rangeWidth spanned by all bars.
		// Mathematically speaking the following equation is true:
		//   rangeWidth/context.width = totalRange/unroundedRange
		// Therefore:
		let rangeWidth = (context.width * totalRange / unroundedRange) | 0;

		// Note that the bars should have a width of:
		//   barWidth = rangeWidth / totalRange
		//            = context.width / unroundedRange;
		// Total pixels by which the first bar is outside the canvas:
		//   xOffset = barWidth * leftRangeFrac - barWidth
		//           = barWidth * (leftRangeFrac - 1)
		// Which is equal to:
		let xOffset = (context.width * (leftRangeFrac - 1) / unroundedRange) | 0;

		// When dealing with out of bounds ranges (in which case JS returns
		// undefined), we replace these "datapoints" with the relevant null
		// value for the type of data we have (0 for numbers, '' for strings)

		let rangeData = new Array(totalRange);
		let nullValue = typeof data[0] === 'number' ? 0 : '';
		for (let i = 0, i0 = Math.floor(leftRange); i < totalRange; i++) {
			rangeData[i] = data[i0 + i] || nullValue;
		}

		// Determine actual plotter
		let painter = null;
		switch (this.props.mode) {
			case 'TextAlways':
				painter = new TextAlwaysPainter();
				break;
			case 'Categorical':
				painter = new CategoriesPainter(this.props.data);
				break;
			case 'Bars':
				painter = new BarPainter();
				break;
			case 'Heatmap':
				painter = new HeatmapPainter();
				break;
			default:
				painter = new TextPainter();
		}
		if (painter) {
			painter.paint(context, rangeData, xOffset, rangeWidth);
		}

		// Make sure our rotation from before is undone
		if (this.props.orientation !== 'horizontal') {
			context.restor();
			let t = context.width;
			context.width = context.height;
			context.height = t;
		}
	}

	render() {
		// If not given a width or height prop, make these fill their parent div
		// This will implicitly set the size of the <Canvas> component, which
		// will then call the passed paint function with the right dimensions.
		const ratio = window.devicePixelRatio || 1;
		const style = {};
		if (this.props.width) {
			style['minWidth'] = ((this.props.width * ratio) | 0) + 'px';
			style['maxWidth'] = ((this.props.width * ratio) | 0) + 'px';
		}
		if (this.props.height) {
			style['minHeight'] = ((this.props.height * ratio) | 0) + 'px';
			style['maxHeight'] = ((this.props.height * ratio) | 0) + 'px';
		}
		return (
			<div className='view' style={style}>
				<Canvas paint={this.paint} clear />
			</div>
		);
	}
}

Sparkline.propTypes = {
	orientation: PropTypes.string.isRequired,
	mode: PropTypes.string.isRequired,
	width: PropTypes.number,
	height: PropTypes.number,
	data: PropTypes.array,
	dataRange: PropTypes.arrayOf(PropTypes.number),
};



// Plotting functions. The plotters assume a horizontal plot.
// To draw vertically we rotate/translate the context before
// passing it to the plotter.

// Depending on the dataset size, we either have:
//  - one or more pixels/lines available per data point
//  - multiple data points per available pixel/line
// In the former case, the painter functions will widen the bars
// or spread the strings across the space
// To accomodate for the latter case, we calculate the means of
// the data at that pixel.
// If we have strings for data, we concatenate them.


class CategoriesPainter {
	constructor(data) {
		this.categories = nMostFrequent(data, 20);
	}

	paint(context, rangeData, xOffset, rangeWidth) {
		if (rangeData.length <= rangeWidth) {
			// more pixels than data

		} else {
			// more data than pixels
		}

		let x = 0;
		const xStepSize = context.width / rangeData.length;
		for (let i = 0; i < rangeData.length; i++) {
			const commonest = nMostFrequent(rangeData[i], 1)[0];
			const color = this.categories.indexOf(commonest) + 1;
			context.fillStyle = colors.category20[color];
			context.fillRect(x, 0, xStepSize, context.height);
			x += xStepSize;
		}
	}
}

class BarPainter {

	paint(context, rangeData, xOffset, rangeWidth) {

		if (typeof rangeData[0][0] === 'number') {

			const { means, min, max } = calcMeans(rangeData);

			// factor to multiply the mean values by,
			// to calculate their's height (see below)
			const scaleMean = context.height / (max - min);

			context.fillStyle = '#404040';
			const meanWidth = context.width / rangeData.length;
			for (let i = 0, xOffset = 0; i < means.length; i++) {
				// canvas defaults to positive y going *down*, so to
				// draw from bottom to top we start at height and
				// subtract the height.
				let meanHeight = (means[i] * scaleMean) | 0;
				let yOffset = context.height - meanHeight;
				context.fillRect(xOffset, yOffset, meanWidth, meanHeight);
				xOffset += meanWidth;
			}

			textSize(context, 10);
			textStyle(context);
			drawText(context, min.toPrecision(3), 2, context.height - 2);
			drawText(context, max.toPrecision(3), 2, 10);
		} else {
			textSize(context, 10);
			textStyle(context);
			drawText(context, 'Cannot draw bars for non-numerical data', 2, context.height - 2);
		}
	}
}

class HeatmapPainter {

	paint(context, rangeData, xOffset, rangeWidth) {
		const { means, max } = calcMeans(rangeData);
		const colorIdxScale = colors.solar9.length / max;
		const xStepSize = context.width / means.length;
		for (let i = 0, x = 0; i < means.length; i++) {
			const colorIdx = (means[i] * colorIdxScale) | 0;
			context.fillStyle = colors.solar9[colorIdx];
			context.fillRect(x, 0, xStepSize, context.height);
			x += xStepSize;
		}
	}
}

class TextPainter {
	paint(context, rangeData, xOffset, rangeWidth) {


		const stepSize = context.width / rangeData.length;
		if (stepSize < 4) {
			return;
		}
		const fontSize = Math.min(stepSize, 12);
		textSize(context, fontSize);
		textStyle(context);

		context.save();
		// The default is drawing horizontally,
		// so the text should be vertical.
		// Instead of drawing at (x, y), we
		// rotate and move the whole context
		// with rotate() and translate(), then
		// and draw at (0, 0) and translate().
		context.translate(0, context.height);
		context.rotate(-Math.PI / 2);
		context.translate(2, stepSize);
		rangeData.forEach((group) => {
			// We only draw text if zoomed in far
			// enough that there's a single element
			// per group
			const text = group[0];
			drawText(context, text, 0, 0);
			context.translate(0, stepSize);
		});
		// undo all rotations/translations
		context.restore();
	}
}

class TextAlwaysPainter {
	paint(context, rangeData, xOffset, rangeWidth) {
		console.log('[TextAlwaysPainter] rangeData: ', rangeData);

		textSize(context, 10);
		textStyle(context);

		const stepSize = context.width / rangeData.length;
		context.save();
		context.translate(0, context.height);
		context.rotate(-Math.PI / 2);
		context.translate(0, stepSize / 2);
		rangeData.forEach((group) => {
			const text = group[0];
			drawText(context, text, 0, 0);
			context.translate(0, stepSize);
		});
		context.restore();

	}
}



// Some helper functions for context.
// This should probably be encapsulated by <Canvas> at some point,
// and set as prototypical methods on the context object

const textSize = function (context, size = 10) {
	// will return an array with [ size, font ] as strings
	const fontArgs = context.font.split(' ');
	const font = fontArgs[fontArgs.length - 1];
	switch (typeof size) {
		case 'number':
			context.font = size + 'px ' + font;
			break;
		case 'string':
			context.font = size + font;
			break;
	}
};

const textStyle = function (context, fill = 'black', stroke = 'white', lineWidth = 2) {
	context.fillStyle = fill;
	context.strokeStyle = stroke;
	context.lineWidth = lineWidth;
};

const drawText = function (context, text, x, y) {
	context.strokeText(text, x, y);
	context.fillText(text, x, y);
};