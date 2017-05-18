import { findMostCommon, arrayConstr, arraySubset } from '../js/util';
import { textSize, textStyle, drawText } from './canvas';

import * as colors from '../js/colors';
const { category20, solar256, YlGnBu256 } = colors;

// TODO: change the way sparkline plotters prepare and consume data
// current version is too memory-intensive and leads to issues with
// not having enough memory and allocation failures...
// (at the moment only happens if a 45k cell dataset plots 600+ genes,
// but bump the cell count up to 1 million and this will happen around
// thirty genes...)

// Convert data to a data range ready for plotting.
export function sparklineDataPrep(attr, dataRange, indices, unfiltered) {
	let { data, arrayType, indexedVal } = attr;

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
	// .. results in displaying datapoints 1 to 6, but datapoint 1
	// will only be 0.6 times the width of the other datapoints,
	// and point 6 will only be 0.3 times the width.

	// If dataRange is undefined, use the whole (filtered) dataset.
	const source = unfiltered ? data : arraySubset(data, arrayType, indices);
	let range = {
		left: (dataRange ? dataRange[0] : 0),
		right: (dataRange ? dataRange[1] : source.length),
	};


	// While we return if our total data range is zero, it *is*
	// allowed to be out of bounds for the dataset. For the
	// "datapoints" out of the range we simply don't display anything.
	// This allows us to zoom out!

	range.total = Math.ceil(range.right) - Math.floor(range.left);
	if (range.total <= 0) { return () => { }; }
	// When dealing with out of bounds ranges we rely on JS returning
	// "undefined" for empty indices, effectively padding the data
	// with empty entries on either or both ends.
	const iOffset = Math.floor(range.left);
	let i = range.total;
	// If we're not displaying text, then indexed string arrays
	// should remain Uint8Arrays, as they are more efficient.
	// Also note that we are basically guaranteed a typed array
	// at this point in the code, so we cannot use push.
	const arrConstr = indexedVal && arrayType === 'string' ? Uint8Array : arrayConstr(arrayType);
	range.data = new arrConstr(i);
	while (i--) {
		range.data[i] = source[iOffset + i];
	}
	if (indexedVal) {
		i = range.total;
		range.indexedData = new Array(i);
		while (i--) {
			range.indexedData[i] = indexedVal[source[iOffset + i]];
		}
	}
	return range;
}

export function sparkline(attr, indices, mode, dataRange, label, orientation, unfiltered) {
	if (!attr) {
		return () => { };
	}

	// Determine plotter
	let paint = null;
	switch (mode) {
		case 'Categorical':
			paint = categoriesPainter;
			break;
		case 'Stacked':
			paint = stackedCategoriesPainer;
			break;
		case 'Bars':
			paint = barPainter(attr);
			break;
		case 'Heatmap':
			paint = heatmapPainter(attr, solar256);
			break;
		case 'Heatmap2':
			paint = heatmapPainter(attr, YlGnBu256);
			break;
		default:
			paint = textPaint;
	}

	// =====================
	// Prep data for plotter
	// =====================
	let { data, arrayType, indexedVal } = attr;

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
	// .. results in displaying datapoints 1 to 6, but datapoint 1
	// will only be 0.6 times the width of the other datapoints,
	// and point 6 will only be 0.3 times the width.

	// If dataRange is undefined, use the whole (filtered) dataset.
	const source = unfiltered ? data : arraySubset(data, arrayType, indices);
	let range = {
		left: (dataRange ? dataRange[0] : 0),
		right: (dataRange ? dataRange[1] : source.length),
	};


	// While we return if our total data range is zero, it *is*
	// allowed to be out of bounds for the dataset. For the
	// "datapoints" out of the range (or any other `undefined`
	// values we simply don't display anything.
	// This allows us to zoom out!

	range.total = Math.ceil(range.right) - Math.floor(range.left);
	if (range.total <= 0) { return () => { }; }
	// When dealing with out of bounds ranges we rely on JS returning
	// "undefined" for empty indices, effectively padding the data
	// with empty entries on either or both ends.
	const iOffset = Math.floor(range.left);
	let i = range.total;
	if (mode === 'Text' && indexedVal) {
		range.data = new Array(i);
		while (i--) {
			range.data[i] = indexedVal[source[iOffset + i]];
		}
	} else {
		// If we're not displaying text, then indexed string arrays
		// should remain Uint8Arrays, as they are more efficient.
		// Also note that we are basically guaranteed a typed array
		// at this point in the code, so we cannot use push.
		const array = (indexedVal && arrayType === 'string' && mode !== 'Text') ? Uint8Array : arrayConstr(arrayType);
		range.data = new array(i);
		while (i--) {
			range.data[i] = source[iOffset + i];
		}
	}

	return (context) => {
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

		// draw sparkline + label
		sparklinePainter(context, paint, attr, mode, range, orientation);
		if (label) { labelPainter(context, label); }

		// Make sure our rotation from before is undone
		if (orientation === 'vertical') {
			context.restore();
			let t = context.width;
			context.width = context.height;
			context.height = t;
		}
	};
}

function sparklinePainter(context, paint, attr, mode, range, orientation) {
	const { colorIndices } = attr;



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
	range.ratio = context.pixelRatio;
	paint(context, range, colorIndices);

}

// Helper functions

const abs = Math.abs;

function calcMeans(range) {
	const { data } = range;
	// Support high-density displays.
	// Downside: using browser-zoom scales up plots as well
	const ratio = range.ratio > 1 ? range.ratio : 1;
	const width = range.width / ratio;
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
		barWidth = range.width / data.length;
		means = data;
		minima = data;
		maxima = data;
		outliers = data;
	} else {
		// more data than pixels
		barWidth = ratio;

		// calculate means, find minima and maxima
		means = [];
		minima = [];
		maxima = [];
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
			minima[i] = data[i0];
			maxima[i] = data[i0];
			for (let j = i0; j < i1; j++) {
				let val = data[j];
				sum += val;
				minima[i] = val < minima[i] ? val : minima[i];
				maxima[i] = val > maxima[i] ? val : maxima[i];
			}
			const mean = (i1 - i0) !== 0 ? sum / (i1 - i0) : sum;
			means[i] = mean;
		}

		// Largest Triangle Three Buckets algorithm by Sven Steinnarson.
		// Essentially: divide in buckets, calculate mean value per
		// bucket, then from left to right select the value that has
		// the biggest difference with the average of the selected value
		// of the previous bucket, and the mean of the next bucket.
		outliers = [];
		let prevMax = 0;
		for (let i = 0; i < width; i++) {
			let i0 = (i * data.length / width) | 0;
			let i1 = (((i + 1) * data.length / width) | 0);
			if (i0 < start || i0 >= end) {
				// skip zero-padding
				outliers[i] = 0;
				continue;
			}
			i1 = i1 < end ? i1 : end;

			const meanNext = means[i + 1] | 0;
			let mean = (prevMax + meanNext) * 0.5;

			let max = data[i0];
			let absDiff = abs(max - mean);
			for (let j = i0 + 1; j < i1; j++) {
				let newAbsDiff = abs(data[j] - mean);
				if (newAbsDiff > absDiff) {
					absDiff = newAbsDiff;
					max = data[j];
				}
			}
			outliers[i] = max;
			prevMax = max;
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
	const { mostFreq } = colorIndices;
	if (data.length <= width) {
		// more pixels than data
		const barWidth = width / data.length;
		let i = 0;
		context.fillStyle = category20[0];
		while (i < data.length) {
			let val = data[i];
			let j = i, nextVal;
			// advance while value doesn't change
			do {
				j++;
				nextVal = data[j];
			} while (val === nextVal && i + j < data.length);
			val = val || 0;
			const cIdx = mostFreq[val] | 0;
			context.fillStyle = category20[cIdx];
			// force to pixel grid
			const x = (xOffset + i * barWidth) | 0;
			const roundedWidth = ((xOffset + (i + j) * barWidth) | 0) - x;
			context.fillRect(x, 0, roundedWidth, context.height);
			i = j;
		}
	} else {
		// more data than pixels
		let i = 0;
		context.fillStyle = category20[0];
		while (i < width) {
			const i0 = (i * data.length / width) | 0;
			const i1 = ((i + 1) * data.length / width) | 0;
			const mostCommonValue = findMostCommon(data, i0, i1) || 0;
			let j = i, nextCommonValue;
			do {
				j++;
				const j0 = (j * data.length / width) | 0;
				const j1 = ((j + 1) * data.length / width) | 0;
				nextCommonValue = findMostCommon(data, j0, j1) || 0;
			} while (mostCommonValue === nextCommonValue && j < width);
			const cIdx = mostFreq[mostCommonValue] | 0;
			context.fillStyle = category20[cIdx];
			context.fillRect(xOffset + i, 0, (j - i), context.height);
			i = j;
		}
	}
}

function stackedCategoriesPainer(context, range, colorIndices) {
	const { data, xOffset } = range;
	const { mostFreq } = colorIndices;
	// Support high-density displays.
	// Downside: using browser-zoom scales up plots as well
	const ratio = range.ratio > 1 ? range.ratio : 1;
	// Important: we MUST round this number, or the plotter
	// crashes the browser for results that are not
	// powers of two.
	const width = (range.width / ratio) | 0;
	const { height } = context;

	if (data.length <= width) {
		// more pixels than data
		const barWidth = width / data.length;
		let i = 0;
		context.fillStyle = category20[0];
		while (i < data.length) {
			let val = data[i];
			let j = i, nextVal;
			// advance while value doesn't change
			do {
				j++;
				nextVal = data[j];
			} while (val === nextVal && i + j < data.length);
			val = val || 0;
			const cIdx = mostFreq[val] | 0;
			context.fillStyle = category20[cIdx];
			// force to pixel grid
			const x = xOffset + i * barWidth;
			const roundedWidth = ((xOffset + (i + j) * barWidth) | 0) - (x | 0);
			context.fillRect(x | 0, 0, roundedWidth, height);
			i = j;
		}
	} else {
		// more data than pixels
		const barWidth = ratio;
		context.fillStyle = category20[0];

		let barSlices = {}, i = width;
		while (i--) {
			const x = (xOffset + i * barWidth) | 0;
			const x1 = (xOffset + (i + 1) * barWidth) | 0;
			const roundedWidth = x1 - x;

			let i0 = i - 1 < 0 ? 0 : i - 1;
			let i1 = i + 2 > width ? width : i + 2;
			i0 = (i0 * data.length / width) | 0;
			i1 = (i1 * data.length / width) | 0;

			/**
			 * Old way. Don't do this! Creates too many throwaway arrays,
			 * leads to high GC churn, and sometimes allocation errors
			 * can crash the tab! Only kept as a reminder why we should
			 *  not "simplify" this code later
			 */
			// let barSlice = data.slice(i0, i1);
			// barSlice.sort();

			const l = i1 - i0;
			let barSlice = barSlices[l];
			if (barSlice) {
				while (i1 - 16 > i0) {
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
					barSlice[--i1 - i0] = data[i1];
				}
				while (i1-- > i0) {
					barSlice[i1 - i0] = data[i1];
				}
			} else {
				// Cach the barSlice to avoid allocating thousands of
				// tiny typed arrays and immediately throwing them away.
				// Realistically we only have to cache a few options
				// due to possible rounding error.
				barSlice = data.slice(i0, i1);
				barSlices[l] = barSlice;
			}
			barSlice.sort();
			let j = 0, k = 0;
			while (j < l) {
				const val = barSlice[k];
				do {
					k++;
				} while (k < l && val === barSlice[k]);
				const y = (height * j / l) | 0;
				const y1 = (height * k / l) | 0;
				const roundedHeight = y1 - y;
				const cIdx = mostFreq[val] | 0;
				context.fillStyle = category20[cIdx];
				context.fillRect(x, y, roundedWidth, roundedHeight);
				j = k;
			}
		}
	}
}

function barPainter(attr) {
	let { min, max } = attr;
	min = min || 0;
	max = max || 0;
	return (context, range) => {
		barPaint(context, range, min, max);
	};
}


function barPaint(context, range, min, max) {

	const { means, outliers, barWidth } = calcMeans(range);
	// factor to multiply the bar values by, to calculate bar height
	// Scaled down a tiny bit to keep vertical space between sparklines
	const barScale = context.height / (max * 1.1);
	let i = 0, x = range.xOffset;

	// draw bars (outliers)
	context.fillStyle = '#000000';
	while (i < outliers.length) {

		// Even if outliers[i] is not a number, OR-masking forces it to 0
		const barHeight = (outliers[i] * barScale) | 0;

		// advance while height doesn't change
		let j = i, nextHeight;
		do {
			j++;
			nextHeight = (outliers[j] * barScale) | 0;
		} while (barHeight === nextHeight && i + j < outliers.length);

		const w = (j - i) * barWidth;

		// zero values are an extremely common case,
		// so skip those pointless draw calls
		if (barHeight) {
			// canvas defaults to positive y going *down*, so to
			// draw from bottom to top we start at context height and
			// subtract the bar height.
			let y = context.height - barHeight | 0;

			// force to pixel grid
			context.fillRect(x | 0, y, ((x + w) | 0) - (x | 0), barHeight);
		}
		i = j; x += w;
	}

	// draw mean values
	context.fillStyle = '#888888';
	i = 0;
	x = range.xOffset;
	while (i < means.length) {
		const meanHeight = (means[i] * barScale) | 0;

		let j = i, nextHeight;
		do {
			j++;
			nextHeight = (means[j] * barScale) | 0;
		} while (meanHeight === nextHeight && i + j < means.length);

		const w = (j - i) * barWidth;

		if (meanHeight) {
			let y = context.height - meanHeight - 1;

			context.fillRect(x | 0, y, ((x + w) | 0) - (x | 0), 3);
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
}



function heatmapPainter(attr, colorLUT) {
	let { min, max } = attr;
	min = min || 0;
	max = max || 0;
	return (context, range) => {
		heatmapPaint(context, range, min, max, colorLUT);
	};
}

function heatmapPaint(context, range, min, max, colorLUT) {
	const { means, outliers, barWidth } = calcMeans(range);
	const colorIdxScale = (colorLUT.length / (max - min) || 1);
	let i = 0, x = range.xOffset;
	while (i < outliers.length) {
		// Even if outliers[i] is not a number, OR-masking forces it to 0
		let colorIdx = (((outliers[i] || 0 + means[i] || 0) * 0.5 - min) * colorIdxScale) | 0;
		context.fillStyle = colorLUT[colorIdx];

		let j = i, nextIdx;
		// advance while colour value doesn't change
		do {
			j++;
			nextIdx = (((outliers[j] || 0 + means[j] || 0) * 0.5 - min) * colorIdxScale) | 0;
		} while (colorIdx === nextIdx && i + j < outliers.length);

		const w = (j - i) * barWidth;

		// force to pixel grid
		context.fillRect(x | 0, 0, ((x + w) | 0) - (x | 0), context.height);
		i = j; x += w;
	}
}


function textPaint(context, range) {
	const lineSize = (range.width / range.data.length) | 0;
	// only draw if we have six pixels height per word, meaning
	// ten pixels per line
	const minLineSize = 8;
	if (lineSize >= minLineSize) {
		textSize(context, Math.min(lineSize - 2, 16));
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
		context.translate(-2, ((lineSize * 0.625) | 0) + range.xOffset);
		const rotation = Math.PI / 6;
		range.data.forEach((label) => {
			if (label || label === 0) {
				context.rotate(rotation);
				drawText(context, '– ' + label, 0, 0);
				context.rotate(-rotation);
			}
			context.translate(0, lineSize);
		});
		// undo all rotations/translations
		context.restore();
	}
}

function labelPainter(context, label) {
	textStyle(context);
	const ratio = context.pixelRatio, labelSize = Math.max(8, 12 * ratio);
	textSize(context, labelSize);
	drawText(context, label, 6 * ratio, (context.height + labelSize) * 0.5);
}