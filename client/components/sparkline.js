import { nMostFrequent, arrayConstr } from '../js/util';
import * as colors from '../js/colors';
import { textSize, textStyle, drawText } from './canvas';

export function sparkline(attr, mode, dataRange, label, orientation, unfiltered) {
	if (!attr){
		return () => {};
	}

	// Determine plotter
	let paint = null;
	switch (mode) {
		case 'Categorical':
			paint = categoriesPainter;
			break;
		case 'Bars':
			paint = barPainter(attr, label);
			break;
		case 'Heatmap':
			paint = heatmapPainter(attr, label, colors.solar256);
			break;
		case 'Heatmap2':
			paint = heatmapPainter(attr, label, colors.YlGnBu256);
			break;
		default:
			paint = textPaint;
	}

	// =====================
	// Prep data for plotter
	// =====================
	let { data, filteredData, arrayType, indexedVal } = attr;

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
	// indicate that only a fraction of a datapoint is displayed.
	// So for example:
	//   dataRange = [ 1.4, 5.3 ]
	// .. results in displaying datapoints 1 to6, but datapoint 1
	// will only be 0.6 times the width of the other datapoints,
	// and point 6 will only be 0.3 times the width.

	// If dataRange is undefined, use the whole (filtered) dataset.
	let range = {
		left: (dataRange ? dataRange[0] : 0),
		right: (
			dataRange ? dataRange[1] : (
				unfiltered ? data.length : filteredData.length
			)
		),
	};


	// While we return if our total data range is zero, it *is*
	// allowed to be out of bounds for the dataset. For the
	// "datapoints" out of the range we simply don't display anything.
	// This allows us to zoom out!

	range.total = Math.ceil(range.right) - Math.floor(range.left);
	if (range.total <= 0) { return () => { }; }
	// If we're not displaying text, then indexed string arrays 
	// should remain Uint8Arrays, as they are more efficient
	let array = (indexedVal && arrayType === 'string' && mode !== 'Text') ? Uint8Array : arrayConstr(arrayType);
	let source = unfiltered ? data : filteredData;
	// When dealing with out of bounds ranges we rely on JS returning
	// "undefined" for empty indices, effectively padding the data
	// with undefined entries on either or both ends.
	// (for typed arrays, JS converts undefined to 0)
	range.data = new array(range.total);
	if (mode === 'Text' && indexedVal) {
		for (let i = 0, i0 = Math.floor(range.left); i < range.total; i++) {
			range.data[i] = indexedVal[source[i0 + i]];
		}
	} else {
		for (let i = 0, i0 = Math.floor(range.left); i < range.total; i++) {
			range.data[i] = source[i0 + i];
		}
	}

	return (context) => {
		sparklinePainter(context, paint, attr, mode, range, orientation);
	};
}

function sparklinePainter(context, paint, attr, mode, range, orientation) {
	const { colorIndices } = attr;

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

	range.unrounded = range.right - range.left;
	// We need to find the effective rangeWidth spanned by all bars.
	// Mathematically speaking the following equation is true:
	//   rangeWidth/context.width = totalRange/unroundedRange
	// Therefore:
	range.width = (context.width * range.total / range.unrounded) | 0;

	// Note that the bars should have a width of:
	//   barWidth = range.width / range.total
	//            = context.width / range.unrounded;
	// Total pixels by which the first bar is outside the canvas:
	//   xOffset = range.leftFrac * barWidth
	// Which is equal to:
	range.leftFrac = Math.floor(range.left) - range.left;
	range.xOffset = (range.leftFrac * context.width / range.unrounded) | 0;
	paint(context, range, colorIndices);

	// Make sure our rotation from before is undone
	if (orientation === 'vertical') {
		context.restore();
		let t = context.width;
		context.width = context.height;
		context.height = t;
	}
}

// Helper functions

function calcMeans(range) {
	const { data, width } = range;
	// determine real start and end of range,
	// skipping undefined padding if present.
	let start = 0;
	let end = data.length;
	while (data[start] === undefined && start < end) { start++; }
	while (data[end] === undefined && end > start) { end--; }

	let barWidth = 0;
	// outlier = visually most relevant datapoint
	let means, minima, maxima, outliers;
	if (data.length <= width) {
		// more pixels than data
		barWidth = width / data.length;
		means = data;
		minima = data;
		maxima = data;
		outliers = data;
	} else {
		// more data than pixels
		barWidth = 1;

		// calculate means, find minima and maxima
		means = new Array(width);
		minima = new Array(width);
		maxima = new Array(width);
		for (let i = 0; i < width; i++) {
			let i0 = (i * data.length / width) | 0;
			let i1 = (((i + 1) * data.length / width) | 0);
			// skip the zero-padding on both sides
			if (i0 < start || i0 >= end) {
				means[i] = 0;
				continue;
			}
			i1 = i1 < end ? i1 : end;
			let sum = 0;
			minima[i0] = data[i0];
			maxima[i0] = data[i0];
			for (let j = i0; j < i1; j++) {
				let val = data[j];
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
		outliers = new Array(width);
		for (let i = 0; i < width; i++) {
			let i0 = (i * data.length / width) | 0;
			let i1 = (((i + 1) * data.length / width) | 0);
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
			let max = data[i0];
			let diff = Math.abs(max - mean);
			for (let j = i0 + 1; j < i1; j++) {
				let newDiff = Math.abs(data[j] - mean);
				if (newDiff > diff) {
					diff = newDiff;
					max = data[j];
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


function categoriesPainter(context, range, colorIndices) {
	const { data, width, xOffset } = range;
	if (data.length <= width) {
		// more pixels than data
		const barWidth = width / data.length;
		let i = 0;
		while (i < data.length) {
			const val = data[i];

			let j = i + 1;
			let nextVal = data[j];
			// advance while value doesn't change 
			while (val === nextVal && i + j < data.length) {
				nextVal = data[++j];
			}

			if (val !== undefined){
				const cIdx = colorIndices.mostFreq[val];
				context.fillStyle = colors.category20[cIdx];
				// force to pixel grid
				const x = xOffset + i * barWidth;
				const roundedWidth = ((xOffset + (i + j) * barWidth) | 0) - (x | 0);
				context.fillRect(x | 0, 0, roundedWidth, context.height);
			}
			i = j;
		}
	} else {
		// more data than pixels
		for (let i = 0; i < width; i++) {
			const i0 = (i * data.length / width) | 0;
			const i1 = ((i + 1) * data.length / width) | 0;
			const slice = data.slice(i0, i1);
			const commonest = nMostFrequent(slice, 1).values[0];
			if (commonest){
				const cIdx = colorIndices.mostFreq[commonest];
				context.fillStyle = colors.category20[cIdx];
				context.fillRect(xOffset + i, 0, 1, context.height);
			}
		}
	}
}


function barPainter(attr, label) {
	let { min, max, hasZeros } = attr;
	min = min||0;
	max = max||0;
	min = hasZeros && min > 0 ? 0 : min;
	return (context, range) => {
		barPaint(context, range, min, max, label);
	};
}


function barPaint(context, range, min, max, label) {

	const { outliers, barWidth } = calcMeans(range);
	// factor to multiply the mean values by, to calculate bar height
	// Scaled down a tiny bit to keep vertical space between sparklines
	const scaleMean = context.height / (max * 1.1);
	context.fillStyle = '#404040';
	let i = 0, x = range.xOffset;
	while (i < outliers.length) {

		// Even if outliers[i] is non a number, OR-masking forces it to 0
		const barHeight = (outliers[i] * scaleMean) | 0;

		// advance while height doesn't change 
		let j = i, nextHeight;
		do {
			nextHeight = (outliers[++j] * scaleMean) | 0;
		}  while (barHeight === nextHeight && i + j < outliers.length);

		const w = (j - i) * barWidth;

		// zero values are an extremely common case,
		// so skip those pointless draw calls
		if (barHeight) {
			// canvas defaults to positive y going *down*, so to
			// draw from bottom to top we start at height and
			// subtract the height.
			let y = context.height - barHeight;

			// force to pixel grid
			context.fillRect(x | 0, y, ((x + w) | 0) - (x | 0), barHeight);
		}
		i = j; x += w;
	}
	const ratio = context.pixelRatio;
	textStyle(context);
	if (ratio > 0.5) {
		const minmaxSize = 8 * ratio;
		textSize(context, minmaxSize);
		drawText(context, min.toPrecision(3), 4 * ratio, context.height - 2);
		drawText(context, max.toPrecision(3), 4 * ratio, 2 + minmaxSize);
	}
	if (label) {
		const labelSize = Math.max(8, 10 * ratio);
		textSize(context, labelSize);
		drawText(context, label, 6 * ratio, (context.height + labelSize) * 0.5);
	}
}



function heatmapPainter(attr, label, colorLUT) {
	let { min, max, hasZeros } = attr;
	min = min || 0;
	max = max || 0;
	min = hasZeros && min > 0 ? 0 : min;
	return (context, range) => {
		heatmapPaint(context, range, min, max, label, colorLUT);
	};
}

function heatmapPaint(context, range, min, max, label, colorLUT) {
	const { outliers, barWidth } = calcMeans(range);
	const colorIdxScale = (colorLUT.length / (max - min) || 1);
	let i = 0, x = range.xOffset;
	while (i < outliers.length) {
		// Even if outliers[i] is not a number, OR-masking forces it to 0
		let colorIdx = ((outliers[i] - min) * colorIdxScale) | 0;
		context.fillStyle = colorLUT[colorIdx];

		let j = i + 1;
		let nextIdx = ((outliers[j] - min) * colorIdxScale) | 0;
		// advance while colour value doesn't change 
		while (colorIdx === nextIdx && i + j < outliers.length) {
			nextIdx = ((outliers[++j] - min) * colorIdxScale) | 0;
		}
		const w = (j - i) * barWidth;

		// force to pixel grid
		context.fillRect(x | 0, 0, ((x + w) | 0) - (x | 0), context.height);
		i = j; x += w;
	}
	textStyle(context);
	if (label) {
		const labelSize = Math.max(8, 10 * context.pixelRatio);
		textSize(context, labelSize);
		drawText(context, label, 6 * context.pixelRatio, (context.height + labelSize) * 0.5);
	}
}


function textPaint(context, range) {
	const lineSize = (range.width / range.data.length) | 0;
	// only draw if we have six pixels per
	const minLineSize = 8;
	if (lineSize >= minLineSize) {
		textSize(context, Math.min(lineSize - 2, 12));
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
		context.translate(2, lineSize / 2 + range.xOffset);
		range.data.forEach((label) => {
			if (label) { drawText(context, label, 0, 0); }
			context.translate(0, lineSize);
		});
		// undo all rotations/translations
		context.restore();
	}
}
