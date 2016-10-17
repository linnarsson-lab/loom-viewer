import { nMostFrequent, calcMinMax } from '../js/util';
import * as colors from '../js/colors';

export function sparkline(data, mode, dataRange, label, orientation) {
	// Determine plotter
	let paint = null;
	switch (mode) {
		case 'Categorical':
			paint = categoriesPainter(data);
			break;
		case 'Bars':
			paint = barPainter(data, label);
			break;
		case 'Heatmap':
			paint = heatmapPainter(data, label);
			break;
		default:
			paint = textPaint;
	}

	return (context) => {
		sparklinePainter(context, paint, data, mode, dataRange, orientation);
	};
}

function sparklinePainter(context, paint, data, mode, dataRange, orientation) {
	if (data === undefined) {
		return;
	}

	// All of our plotting functions draw horizontaly
	// To get a vertical plot, we simply rotate the canvas
	// before invoking them. To not mess up the context
	// settings, we save before and restore at the end
	if (orientation === 'vertical') {
		context.save();
		context.translate(context.width, 0);
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
	dataRange = dataRange ? dataRange : [0, data.length];

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

	paint(context, rangeData, xOffset, rangeWidth);

	// Make sure our rotation from before is undone
	if (orientation === 'vertical') {
		context.restore();
		let t = context.width;
		context.width = context.height;
		context.height = t;
	}
}

// Helper functions

function calcMeans(rangeData, rangeWidth) {
	// determine real start and end of range,
	// skipping undefined padding if present.
	let start = 0;
	let end = rangeData.length;
	while (rangeData[start] === undefined && start < end) { start++; }
	while (rangeData[end] === undefined && end > start) { end--; }

	let barWidth = 0;
	// outlier = visually most relevant datapoint
	let means, minima, maxima, outliers;
	if (rangeData.length <= rangeWidth) {
		// more pixels than data
		barWidth = rangeWidth / rangeData.length;
		means = rangeData;
		minima = rangeData;
		maxima = rangeData;
		outliers = rangeData;
	} else {
		// more data than pixels
		barWidth = 1;

		// calculate means, find minima and maxima
		means = new Array(rangeWidth);
		minima = new Array(rangeWidth);
		maxima = new Array(rangeWidth);
		for (let i = 0; i < rangeWidth; i++) {
			let i0 = (i * rangeData.length / rangeWidth) | 0;
			let i1 = (((i + 1) * rangeData.length / rangeWidth) | 0);
			// skip the zero-padding on both sides
			if (i0 < start || i0 >= end) {
				means[i] = 0;
				continue;
			}
			i1 = i1 < end ? i1 : end;
			let sum = 0;
			minima[i0] = rangeData[i0];
			maxima[i0] = rangeData[i0];
			for (let j = i0; j < i1; j++) {
				let val = rangeData[j];
				sum += val;
				minima[j] = val < minima[j] ? val : minima[j];
				maxima[j] = val > maxima[j] ? val : maxima[j];
			}
			const mean = (i1 - i0) !== 0 ? sum / (i1 - i0) : sum;
			means[i] = mean;
		}

		// Variant of the Largest Triangle Three Buckets algorithm
		// by Sven Steinnarson. Essentially: keep the value with
		// the largest difference to the surrounding averages.
		outliers = new Array(rangeWidth);
		for (let i = 0; i < rangeWidth; i++) {
			let i0 = (i * rangeData.length / rangeWidth) | 0;
			let i1 = (((i + 1) * rangeData.length / rangeWidth) | 0);
			if (i0 < start || i0 >= end) {
				// skip zero-padding
				outliers[i] = 0;
				continue;
			}
			i1 = i1 < end ? i1 : end;

			// this distorts the values at the edges,
			// but keeps the code fast.
			const meanPrev = means[i - 1] | 0;
			const meanNext = means[i + 1] | 0;
			let mean = (meanPrev + meanNext) * 0.5;

			// find largest difference to the surrounding averages
			let max = rangeData[i0];
			let diff = Math.abs(max - mean);
			for (let j = i0 + 1; j < i1; j++) {
				let newDiff = Math.abs(rangeData[j] - mean);
				if (newDiff > diff) {
					diff = newDiff;
					max = rangeData[j];
				}
			}
			outliers[i] = max;
		}
	}
	return { means, minima, maxima, outliers, barWidth };
}

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



function categoriesPainter(data) {
	const categories = nMostFrequent(data, 20).values;
	return (context, rangeData, xOffset, rangeWidth) => {
		categoriesPaint(context, rangeData, xOffset, rangeWidth, categories);
	};
}

function categoriesPaint(context, rangeData, xOffset, rangeWidth, categories) {
	if (rangeData.length <= rangeWidth) {
		// more pixels than data
		const barWidth = rangeWidth / rangeData.length;
		for (let i = 0; i < rangeData.length; i++) {
			if (rangeData[i] !== undefined) {
				const color = categories.indexOf(rangeData[i]) + 1;
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
			const commonest = nMostFrequent(slice, 1).values[0];
			if (commonest !== undefined) {
				const color = categories.indexOf(commonest) + 1;
				context.fillStyle = colors.category20[color];
				context.fillRect(xOffset + i, 0, 1, context.height);
			}
		}
	}
}


function barPainter(data, label) {
	const { min, max } = calcMinMax(data);
	return (context, rangeData, xOffset, rangeWidth) => {
		barPaint(context, rangeData, xOffset, rangeWidth, label, min, max);
	};
}


function barPaint(context, rangeData, xOffset, rangeWidth, label, min, max) {

	const { outliers, barWidth } = calcMeans(rangeData, rangeWidth);
	// factor to multiply the mean values by, to calculate bar height
	// Scaled down a tiny bit to keep vertical space between sparklines
	const scaleMean = context.height / (max * 1.1);
	context.fillStyle = '#404040';
	for (let i = 0, x = xOffset; i < outliers.length; i++) {
		// Even if outliers[i] is non a number, OR-masking forces it to 0
		let barHeight = (outliers[i] * scaleMean) | 0;
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
		context.drawText(min.toPrecision(3), 4 * ratio, context.height - 2);
		context.drawText(max.toPrecision(3), 4 * ratio, 2 + minmaxSize);
	}
	if (label) {
		const labelSize = Math.max(8, 10 * ratio);
		context.textSize(labelSize);
		context.drawText(label, 6 * ratio, (context.height + labelSize) * 0.5);
	}
}



function heatmapPainter(data, label) {
	const { min, max } = calcMinMax(data);
	return (context, rangeData, xOffset, rangeWidth) => {
		heatmapPaint(context, rangeData, xOffset, rangeWidth, label, min, max);
	};
}

function heatmapPaint(context, rangeData, xOffset, rangeWidth, label, min, max) {
	const { outliers, barWidth } = calcMeans(rangeData, rangeWidth);
	const colorIdxScale = (colors.solar9.length / (max - min) || 1);
	for (let i = 0, x = xOffset; i < outliers.length; i++) {
		// Even if outliers[i] is not a number, OR-masking forces it to 0
		let colorIdx = (outliers[i] * colorIdxScale) | 0;
		context.fillStyle = colors.solar9[colorIdx];
		context.fillRect(x, 0, barWidth, context.height);
		x += barWidth;
	}
	context.textStyle();
	if (label) {
		const labelSize = Math.max(8, 10 * context.pixelRatio);
		context.textSize(labelSize);
		context.drawText(label, 6 * context.pixelRatio, (context.height + labelSize) * 0.5);
	}
}


function textPaint(context, rangeData, xOffset, rangeWidth) {
	const lineSize = (rangeWidth / rangeData.length) | 0;
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
