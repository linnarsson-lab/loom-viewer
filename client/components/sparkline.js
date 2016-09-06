import React, {PropTypes} from 'react';
import { nMostFrequent } from '../js/util';
import * as colors from '../js/colors';
import { Canvas } from './canvas';

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

		let leftRange = dataRange[0];
		let rightRange = dataRange[1];

		// While we return if our total data range is zero, it *is*
		// allowed to be out of bounds for the dataset. For the
		// "datapoints" out of the range we simply don't display anything.
		// This allows us to zoom out!

		const unboundedRange = rightRange - leftRange;
		const totalRange = Math.ceil(rightRange) - Math.floor(leftRange);
		if (totalRange <= 0) { return; }

		// We need to find the effective rangeWidth spanned by all bars.
		// Mathematically speaking the following equation is true:
		//   rangeWidth/context.width = totalRange/unroundedRange
		// Therefore:
		let rangeWidth = (context.width * totalRange / unboundedRange) | 0;

		// Note that the bars should have a width of:
		//   barWidth = rangeWidth / totalRange
		//            = context.width / unroundedRange;
		// Total pixels by which the first bar is outside the canvas:
		//   xOffset = -leftRangeFrac * barWidth
		// Which is equal to:
		const leftRangeFrac = Math.floor(leftRange) - leftRange;
		const xOffset = (leftRangeFrac * context.width / unboundedRange) | 0;

		// When dealing with out of bounds ranges we rely on JS returning
		// "undefined" for empty indices, effectively padding the data
		// with undefined entries on either or both ends.
		let rangeData = new Array(totalRange);
		for (let i = 0, i0 = Math.floor(leftRange); i < totalRange; i++) {
			rangeData[i] = data[i0 + i];
		}

		// Determine actual plotter
		let painter = null;
		switch (this.props.mode) {
			case 'Categorical':
				painter = new CategoriesPainter(this.props.data);
				break;
			case 'Bars':
				painter = new BarPainter(this.props.data, this.props.label);
				break;
			case 'Heatmap':
				painter = new HeatmapPainter(this.props.data, this.props.label);
				break;
			default:
				painter = new TextPainter();
		}
		if (painter) {
			painter.paint(context, rangeData, xOffset, rangeWidth);
		}

		// Make sure our rotation from before is undone
		if (this.props.orientation !== 'horizontal') {
			context.restore();
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
	label: PropTypes.string,
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
			const barWidth = rangeWidth / rangeData.length;
			for (let i = 0; i < rangeData.length; i++) {
				if (rangeData[i] !== undefined) {
					const color = this.categories.indexOf(rangeData[i]) + 1;
					context.fillStyle = colors.category20[color];
					context.fillRect(xOffset + i * barWidth, 0, barWidth, context.height);
				}
			}
		} else {
			// more data than pixels
			for (let i = 0; i < rangeWidth; i++) {
				const i0 = (i * rangeData.length / rangeWidth) | 0;
				const i1 = ((i + 1) * rangeData.length / rangeWidth) | 0;
				const slice = rangeData.slice(i0, i1);
				const commonest = nMostFrequent(slice, 1)[0];
				if (commonest !== undefined) {
					const color = this.categories.indexOf(commonest) + 1;
					context.fillStyle = colors.category20[color];
					context.fillRect(xOffset + i, 0, 1, context.height);
				}
			}
		}
	}
}

function calcMinMax(data) {
	let min = 0;
	let max = 0;
	if (typeof data[0] === 'number') {
		min = Number.MAX_VALUE;
		max = Number.MIN_VALUE;
		for (let i = 0; i < data.length; i++) {
			min = min < data[i] ? min : data[i];
			max = max > data[i] ? max : data[i];
		}
	}
	return { min, max };
}

function calcMeans(rangeData, rangeWidth) {
	// determine real start and end of range,
	// skipping undefined padding if present.
	let start = 0;
	let end = rangeData.length;
	while (rangeData[start] === undefined && start < end) { start++; }
	while (rangeData[end] === undefined && end > start) { end--; }

	let barWidth = 0;
	let means = null;
	if (rangeData.length <= rangeWidth) {
		// more pixels than data
		means = rangeData;
		barWidth = rangeWidth / rangeData.length;
	} else {
		// more data than pixels
		barWidth = 1;
		means = new Array(rangeWidth);
		for (let i = 0; i < rangeWidth; i++) {
			let i0 = (i * rangeData.length / rangeWidth) | 0;
			let i1 = (((i + 1) * rangeData.length / rangeWidth) | 0);
			if (i0 < start || i0 >= end) {
				means[i] = 0;
				continue;
			}
			i1 = i1 < end ? i1 : end;
			let sum = 0;
			for (let j = i0; j < i1; j++) {
				sum += rangeData[j];
			}
			const mean = (i1 - i0) !== 0 ? sum / (i1 - i0) : sum;
			means[i] = mean;
		}
	}
	return { means, barWidth };
}

class BarPainter {

	constructor(data, label) {
		const { min, max } = calcMinMax(data);
		this.min = min;
		this.max = max;
		this.label = label;
	}

	paint(context, rangeData, xOffset, rangeWidth) {

		const { means, barWidth } = calcMeans(rangeData, rangeWidth);
		// factor to multiply the mean values by, to calculate bar height
		const scaleMean = context.height / this.max;
		context.fillStyle = '#404040';
		for (let i = 0, x = xOffset; i < means.length; i++) {
			// Even if means[i] is non a number, OR-masking forces it to 0
			let barHeight = (means[i] * scaleMean) | 0;
			// canvas defaults to positive y going *down*, so to
			// draw from bottom to top we start at height and
			// subtract the height.
			let y = context.height - barHeight;
			context.fillRect(x, y, barWidth, barHeight);
			x += barWidth;
		}
		const ratio = context.pixelRatio;
		context.textStyle();
		if (ratio > 0.5) {
			const minmaxSize = 8 * ratio;
			context.textSize(minmaxSize);
			context.drawText(this.min.toPrecision(3), 4 * ratio, context.height - 2);
			context.drawText(this.max.toPrecision(3), 4 * ratio, 2 + minmaxSize);
		}
		if (this.label) {
			const labelSize = Math.max(8, 10 * ratio);
			context.textSize(labelSize);
			context.drawText(this.label, 6 * ratio, (context.height + labelSize) * 0.5);
		}
	}
}


class HeatmapPainter {

	constructor(data, label) {
		const { min, max } = calcMinMax(data);
		this.min = min;
		this.max = max;
		this.label = label;
	}

	paint(context, rangeData, xOffset, rangeWidth) {
		const { means, barWidth } = calcMeans(rangeData, rangeWidth);
		const colorIdxScale = (colors.solar9.length / (this.max - this.min) || 1);
		for (let i = 0, x = xOffset; i < means.length; i++) {
			// Even if means[i] is non a number, OR-masking forces it to 0
			let colorIdx = (means[i] * colorIdxScale) | 0;
			context.fillStyle = colors.solar9[colorIdx];
			context.fillRect(x, 0, barWidth, context.height);
			x += barWidth;
		}
		context.textStyle();
		if (this.label) {
			const labelSize = Math.max(8, 10 * context.pixelRatio);
			context.textSize(labelSize);
			context.drawText(this.label, 6 * context.pixelRatio, (context.height + labelSize) * 0.5);
		}
	}
}

class TextPainter {
	paint(context, rangeData, xOffset, rangeWidth) {
		const lineSize = rangeWidth / rangeData.length;
		// only draw if we have six pixels per
		const minLineSize = 8;
		if (lineSize >= minLineSize) {
			context.textSize(Math.min(lineSize - 2, 12));
			context.textStyle();
			context.save();
			// The default is drawing horizontally,
			// so the text should be vertical.
			// Instead of drawing at (x, y), we
			// rotate and move the whole context
			// with rotate() and translate(), then
			// and draw at (0, 0) and translate().
			context.translate(0, context.height);
			context.rotate(-Math.PI / 2);
			context.translate(2, lineSize / 2 + xOffset);
			rangeData.forEach((label) => {
				if (label) { context.drawText(label, 0, 0); }
				context.translate(0, lineSize);
			});
			// undo all rotations/translations
			context.restore();
		}
	}
}