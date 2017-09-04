import {
	textSize,
	textStyle,
	drawText,
} from './canvas';

import {
	findMostCommon,
	groupAttr,
	arrayConstr,
	attrIndexedSubset,
	attrSubset,
	attrToColorFactory,
	logProject,
} from '../js/util';

const noop = () => { };

const categoriesPainter = {
	directly: categoriesDirectly,
	grouped: categoriesGrouped,
};

const stackedCategoriesPainter = {
	directly: categoriesDirectly,
	grouped: stackedCategoriesGrouped,
};

const barPaint = {
	directly: barPaintDirectly,
	grouped: barPaintGrouped,
};

const boxPaint = {
	directly: barPaintDirectly,
	grouped: barPaintBoxPlot,
};

const heatMapPainter = {
	directly: heatMapDirectly,
	grouped: heatMapGrouped,
};
const flameMapPainter = {
	directly: heatMapDirectly,
	grouped: flameMapGrouped,
};

const textPaint = {
	directly: textPaintDirectly,
	grouped: noop,
};


function selectPlotter(mode) {
	switch (mode) {
		case 'Categorical':
			return categoriesPainter;
		case 'Stacked':
			return stackedCategoriesPainter;
		case 'Bars':
			return barPaint;
		case 'Box':
			return boxPaint;
		case 'Heatmap':
		case 'Heatmap2':
			return heatMapPainter;
		case 'Flame':
		case 'Flame2':
			return flameMapPainter;
		default:
			return textPaint;
	}
}

function prepRange(indices, mode, settings) {
	// Since the following involves a lot of mathematical trickery,
	// I figured I'd better document this inline in long-form.

	// dataRange consists of two doubles that indicate which part
	// of the data is displayed (using the bounds of the leaflet
	// heatMap actually works out here, because it has has a
	// one-to-one pixel width/height to column/row mapping.
	// If this ever changes we need to change this code too).
	settings = settings || {};
	const {
		dataRange,
	} = settings;

	// We're going to ignore the accumulated rounding errors in
	// intermediate calculations, since doubles have so much
	// precision that it's unlikely we'll ever be off by more
	// than one pixel.

	// The key insight is that the fractional part of these floats
	// indicate that only a fraction of a data point is displayed.
	// For example: `dataRange = [ 1.4, 5.3 ]` shows data values
	// 1 to 6, but value 1 will only be 0.6x the width of the
	// other value, and value 6 will only be 0.3x the width.

	// While we return if our total data range is zero,
	// the range is allowed to be of the data bounds.
	// For the "data points" out of the range we simply
	// don't display anything.

	// If dataRange is undefined, use the whole (filtered) dataset.
	// If mode is 'Text' and we have indexed values, convert to string array

	const length = indices.length;

	let left = 0,
		leftRounded = 0,
		// using indices, since that actually tells us
		// how much data we're using (if data is filtered out)
		right = length,
		rightRounded = length;

	if (dataRange) {
		left = dataRange[0];
		right = dataRange[1];
		leftRounded = Math.floor(left);
		rightRounded = Math.ceil(right);
	}
	let unrounded = right - left,
		total = rightRounded - leftRounded;

	return {
		visible: (
			total > 0 &&
			rightRounded >= 0 &&
			leftRounded < length
		),
		left,
		right,
		total,
		leftRounded,
		rightRounded,
		unrounded,
	};
}

export function sparkline(attr, indices, mode, settings, label) {
	if (attr) { // attr may be undefined if it is an unfetched gene
		settings = settings || {};
		let range = prepRange(indices, mode, settings);
		const plot = selectPlotter(mode);
		const dataToColor = attrToColorFactory(attr, mode, settings);
		return sparklineFactory(attr, plot, range, indices, mode, settings, dataToColor, label);
	}
	return noop;
}

function sparklineFactory(attr, plot, range, indices, mode, settings, dataToColor, label) {
	// note that this will be called after rotation, so we don't have to
	// worry about duplicating the logic for vertical sparklines.
	const sparkline = (context) => {
		if (range.visible) {

			const {
				unrounded,
				left,
				leftRounded,
				rightRounded,
			} = range;
			// We need to find the effective number of pixels
			// covered by the whole range; left and right
			// fractions are rounded in such a way that partial
			// coverage equals full coverage. Because range.left,
			// range.right and range.total are already rounded to
			// reflect this, the following equation is true:
			//   "range width"/context.width = range.total/range.unrounded
			// where range width is the covered nr of pixels.

			const ratio = (context.pixelRatio > 1 ? context.pixelRatio | 0 : 1);

			// Therefore, the columns should have a width of:
			//   barWidth = ratio * range.width / range.total
			//            = ratio * context.width / range.unrounded
			const groupSize = ratio * unrounded / context.width;

			// If barWidth is < 1, we have multiple data points per pixel.
			// Otherwise, we have one (or less) data points per pixel.
			// We use separate plotters for both, to keep the functions simple
			// and hopefully easier to optimise for the JIT compiler.
			if (groupSize > 1) {
				// more data than pixels, so we group the data
				// as an array of left-padded groups, one per column
				// Then we can plot the groups to columns directly.
				const data = groupAttr(attr, indices, range, mode, groupSize);
				plot.grouped(context, attr, data, range, ratio, dataToColor, settings, label);
			} else {
				// data is an unpadded selection of the visible data
				// We also include an xOffset (negative) and a barWidth
				// xOffset is the total pixels by which the first bar
				// is outside the canvas.
				// If left = [0, data.length), then this is the fraction
				// part of it times barWidth
				// If left < 0, it is -left * barWidth
				const leftFrac = left < 0 ? -left : leftRounded - left;
				const barWidth = ratio * context.width / unrounded;
				const xOffset = (leftFrac * barWidth) | 0;
				// copy relevant subset of data
				const i0 = leftRounded < 0 ? 0 : leftRounded;
				const i1 = rightRounded > attr.data.length ? attr.data.length : rightRounded;
				const indexedText = mode === 'Text' && attr.indexedVal !== undefined;
				const data = indexedText ? attrIndexedSubset(attr, indices, i0, i1) : attrSubset(attr, indices, i0, i1);

				// xOffset is the lef-padding in pixels, after which we can
				// simply draw the passed data from left to right, with barWidth
				// sized columns
				plot.directly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings, label);
			}
		}
		if (label) { nameLabelPainter(context, label); }
	};


	if (settings.orientation !== 'vertical') {
		return sparkline;
	} else {
		return (context) => {
			// All of our plotting functions draw horizontally
			// To get a vertical plot, we simply rotate the canvas
			// before invoking them. To not mess up the context
			// settings, we save before and restore at the end
			context.save();
			context.translate(context.width, 0);
			context.rotate(90 * Math.PI / 180);
			let t = context.width;
			context.width = context.height;
			context.height = t;

			// draw sparkline
			sparkline(context);

			context.restore();
			t = context.width;
			context.width = context.height;
			context.height = t;
		};
	}
}

// Helper functions

/** mutates `data`, clipping it to new values */
function clip(data, clipMin, clipMax) {
	for (let i = 0; i < data.length; i++) {
		const v = data[i];
		if (v < clipMin) {
			data[i] = clipMin;
		} else if (v > clipMax) {
			data[i] = clipMax;
		}
	}
}

// Plotting functions. The plotters assume a horizontal plot.
// To draw vertically we rotate/translate the context before
// passing it to the plotter.

// Depending on the dataset size, we either have:
//  - one or more pixels/lines available per data point
//  - multiple data points per available pixel/line
// In the former case, the painter functions will widen the columns
// or spread the strings across the space
// To accommodate for the latter case, we group the data at that
// pixel, and decide how to handle that on a case-by-case basis



function categoriesDirectly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings, label) {
	context.fillStyle = 'white';
	let i = 0, j = i;
	while (i <= data.length) {
		let val = data[i], nextVal = val;
		// advance while value doesn't change
		do {
			j++;
			nextVal = data[j];
		} while (val === nextVal && j <= data.length);
		context.fillStyle = dataToColor(val || 0);
		// force to pixel grid
		const x = ratio * (xOffset + i * barWidth) | 0;
		const roundedWidth = (ratio * (xOffset + j * barWidth) | 0) - x;
		context.fillRect(x, 0, roundedWidth, context.height);
		i = j;
	}
}

function categoriesGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {
	let i = 0;
	// skip left-padding
	while (!data[i]) { i++; }
	while (data[i]) {
		const mostCommonValue = findMostCommon(data[i]) || 0;
		let j = i, nextCommonValue = mostCommonValue;
		while (mostCommonValue === nextCommonValue && data[j]) {
			j++;
			nextCommonValue = data[j] ? findMostCommon(data[j]) : 0;
		}
		context.fillStyle = dataToColor(mostCommonValue);
		const x = i * ratio | 0;
		const roundedWidth = (j * ratio | 0) - (i * ratio | 0);
		context.fillRect(x, 0, roundedWidth, context.height);
		i = j;
	}
}

// Note: stackedCategoriesDirectly is functionally equivalent to categories

function stackedCategoriesGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	//const barWidth = ratio;
	let i = 0;
	// skip left-padding
	while (!data[i]) { i++; }
	while (data[i]) {
		let barSlice = data[i++],
			l = barSlice.length;
		barSlice.sort();

		const x = (i * ratio) | 0;
		const x1 = ((i + 1) * ratio) | 0;
		const roundedWidth = x1 - x;

		let j = 0, k = 0;
		while (j < l) {
			const val = barSlice[j];
			do {
				k++;
			} while (k < l && val === barSlice[k]);
			const y = (height * j / l) | 0;
			const y1 = (height * k / l) | 0;
			const roundedHeight = y1 - y;
			context.fillStyle = dataToColor(val || 0);
			context.fillRect(x, y, roundedWidth, roundedHeight);
			j = k;
		}
	}
}

function barPaintDirectly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings, label) {
	const { logScale } = settings;
	const { min, max } = attr;
	let clipMin = min;
	let clipMax = max;
	if (settings.clip) {
		const delta = max - min;
		if (settings.lowerBound > 0) {
			clipMin = min + settings.lowerBound * delta / 100;
		}
		if (settings.upperBound < 100) {
			clipMax = min + settings.upperBound * delta / 100;
		}
		if (clipMin !== min || clipMax !== max) {
			clip(data, clipMin, clipMax);
		}
	}
	const delta = logScale ?
		logProject(clipMax - clipMin) : clipMax - clipMin;
	const barScale = context.height * 0.9375 / delta || 0;
	context.fillStyle = '#000000';
	let i = 0, x = xOffset | 0;
	while (i < data.length) {

		// Even if outliers[i] is not a number, OR-masking forces it to 0
		let dataDelta = data[i] - clipMin;
		if (logScale) {
			dataDelta = logProject(dataDelta);
		}
		const barHeight = (dataDelta * barScale) | 0;

		// advance while height doesn't change
		let j = i, nextHeight = barHeight;
		while (barHeight === nextHeight && j++ < data.length - 1) {
			dataDelta = data[j] - clipMin;
			if (logScale) {
				dataDelta = logProject(dataDelta);
			}
			nextHeight = (dataDelta * barScale) | 0;
		}
		const xNext = (xOffset + j * barWidth) | 0;
		const w = xNext - x;

		// zero values are an extremely common case,
		// so skip those pointless draw calls
		if (barHeight) {
			// canvas defaults to positive y going *down*, so to
			// draw from bottom to top we start at context height and
			// subtract the bar height.
			let y = context.height - barHeight | 0;

			// force to pixel grid
			context.fillRect(x, y, w, barHeight);
		}
		i = j;
		x = xNext;
	}

	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}

function barGroupedDataPrep(attr, data, min, max, settings) {
	const array = arrayConstr(attr.arrayType);
	let avg = new Float32Array(data.length),
		thirdQ = new array(data.length);

	const { logScale, lowerBound, upperBound } = settings;
	let delta = max - min,
		clipMin = min,
		clipMax = max;
	if (settings.clip && lowerBound > 0) {
		clipMin = min + lowerBound * delta / 100;
	}

	// remember that data might be left-padded with
	// empty values. So we find the first
	// index where data[iStart] returns grouped data
	let iStart = data.length;
	while (data[iStart - 1]) { data[--iStart].sort(); }

	// go through all columns, find
	// average, first quartile and third quartile
	for (let i = iStart; i < data.length; i++) {
		const _data = data[i];
		let sum = 0;
		for (let j = 0; j < _data.length; j++) {
			sum += _data[j];
		}
		avg[i] = sum / _data.length;
		// note that we already sorted _data, so this
		// should give us the first and third quartile.
		thirdQ[i] = _data[_data.length * 0.75 | 0];
	}

	if (settings.clip || !logScale) {
		if (upperBound < 100) {
			clipMax = min + upperBound * delta / 100;
		}
		// If linear plot, automatically clip to biggest
		// third quartile in all the bins, if this
		// value is smaller than clipMax
		if (!logScale) {
			let tQmax = clipMin;
			for (let i = iStart; i < data.length; i++) {
				if (thirdQ[i] > tQmax) {
					tQmax = thirdQ[i];
				}
			}
			// In very sparse data sets, tQmax tends to be zero,
			// so if the max value is non-zero, we set it to 1.
			if (tQmax === 0 && max > 0) {
				tQmax = 1;
			}

			// Of course, it only makes sense to clip to
			// tQmax if it is less than the manual clipMax setting
			if (tQmax < clipMax) {
				clipMax = tQmax;
			}
		}
	}


	if (clipMin !== min || clipMax !== max) {
		clip(avg, clipMin, clipMax);
		clip(thirdQ, clipMin, clipMax);
	}

	return { iStart, min, max, clipMin, clipMax, avg };
}

function barPaintGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {
	const { min, max } = attr;
	let preppedData = barGroupedDataPrep(attr, data, min, max, settings);
	if (settings.logScale){
		barPaintGroupedLogProjected(context, preppedData, range, ratio, dataToColor, settings, label);
	} else {
		barPaintGroupedLinear(context, preppedData, range, ratio, dataToColor, settings, label);
	}
}

function barPaintGroupedLogProjected(context, preppedData, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	const { iStart, min, max, clipMin, clipMax, avg } = preppedData;

	const delta = logProject(clipMax - clipMin);
	const barScale = height * 0.9375 / delta || 0;

	// because of our sorting earlier, i is guaranteed
	// to be the first element in data that is a column
	let i = iStart, x = i * ratio | 0;

	while (i < avg.length) {
		const barHeight = logProject(avg[i]) * barScale | 0;
		// advance while height doesn't change
		let j = i, nextHeight = barHeight;
		while (barHeight - nextHeight === 0 && ++j < avg.length) {
			nextHeight = logProject(avg[j]) * barScale | 0;
		}
		// We advanced j-i steps
		const xNext = j * ratio | 0;
		const w = xNext - x | 0;
		// zero values are an extremely common case,
		// so skip those pointless draw calls
		if (barHeight) {
			context.fillStyle = '#000000';
			context.fillRect(x, height - barHeight | 0, w, barHeight);
		}
		i = j; x = xNext;
	}

	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}

function barPaintGroupedLinear(context, preppedData, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	const { iStart, min, max, clipMin, clipMax, avg } = preppedData;

	const delta = clipMax - clipMin;
	const barScale = height * 0.9375 / delta || 0;

	// because of our sorting earlier, i is guaranteed
	// to be the first element in data that is a column
	let i = iStart, x = i * ratio | 0;

	while (i < avg.length) {
		const barHeight = avg[i] * barScale | 0;
		// advance while height doesn't change
		let j = i, nextHeight = barHeight;
		while (barHeight - nextHeight === 0 && ++j < avg.length) {
			nextHeight = avg[j] * barScale | 0;
		}
		// We advanced j-i steps
		const xNext = j * ratio | 0;
		const w = xNext - x | 0;
		// zero values are an extremely common case,
		// so skip those pointless draw calls
		if (barHeight) {
			context.fillStyle = '#000000';
			context.fillRect(x, height - barHeight | 0, w, barHeight);
		}
		i = j; x = xNext;
	}

	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}

function barGroupedBoxDataPrep(attr, data, min, max, settings) {
	const array = arrayConstr(attr.arrayType);
	let avg = new Float32Array(data.length),
		minValues = new array(data.length),
		maxValues = new array(data.length),
		firstQ = new array(data.length),
		thirdQ = new array(data.length);

	const { logScale, lowerBound, upperBound } = settings;
	let delta = max - min,
		clipMin = min,
		clipMax = max;
	if (settings.clip && lowerBound > 0) {
		clipMin = min + lowerBound * delta / 100;
	}

	// remember that data might be left-padded with
	// empty values. So we find the first
	// index where data[iStart] returns grouped data
	let iStart = data.length;
	while (data[iStart - 1]) { data[--iStart].sort(); }

	// go through all columns, find
	// average, first quartile and third quartile
	for (let i = iStart; i < data.length; i++) {
		const _data = data[i];
		let sum = 0;
		for (let j = 0; j < _data.length; j++) {
			sum += _data[j];
		}
		avg[i] = sum / _data.length;
		// note that we already sorted _data, so this
		// should give us the first and third quartile.
		minValues[i] = _data[0];
		firstQ[i] = _data[_data.length * 0.25 | 0];
		thirdQ[i] = _data[_data.length * 0.75 | 0];
		maxValues[i] = _data[_data.length-1];
	}

	if (settings.clip || !logScale) {
		if (upperBound < 100) {
			clipMax = min + upperBound * delta / 100;
		}
		// If linear plot, automatically clip to biggest
		// third quartile in all the bins, if this
		// value is smaller than clipMax
		if (!logScale) {
			let tQmax = clipMin;
			for (let i = iStart; i < data.length; i++) {
				if (thirdQ[i] > tQmax) {
					tQmax = thirdQ[i];
				}
			}
			// In very sparse data sets, tQmax tends to be zero,
			// so if the max value is non-zero, we set it to 1.
			if (tQmax === 0 && max > 0) {
				tQmax = 1;
			}

			// Of course, it only makes sense to clip to
			// tQmax if it is less than the manual clipMax setting
			if (tQmax < clipMax) {
				clipMax = tQmax;
			}
		}
	}


	if (clipMin !== min || clipMax !== max) {
		clip(avg, clipMin, clipMax);
		clip(minValues, clipMin, clipMax);
		clip(maxValues, clipMin, clipMax);
		clip(firstQ, clipMin, clipMax);
		clip(thirdQ, clipMin, clipMax);
	}

	return { iStart, min, max, clipMin, clipMax, avg, minValues, firstQ, thirdQ, maxValues };
}


// While not drawn as a standard box-plot, we _do_ plot
// all the features of a box plot. They are displayed as layers:
// - min (light grey blue)
// - first quartile (blue)
// - average (black)
// - third quartile (red)
// - max (very light grey red)
function barPaintBoxPlot(context, attr, data, range, ratio, dataToColor, settings, label) {
	const { min, max } = attr;
	let preppedData = barGroupedBoxDataPrep(attr, data, min, max, settings);
	if (settings.logScale) {
		barPaintBoxPlotLogProjected(context, preppedData, range, ratio, dataToColor, settings, label);
	} else {
		barPaintBoxPlotLinear(context, preppedData, range, ratio, dataToColor, settings, label);
	}
}

function barPaintBoxPlotLogProjected(context, preppedData, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	const { iStart, min, max, clipMin, clipMax, avg, minValues, firstQ, thirdQ, maxValues } = preppedData;

	const delta = logProject(clipMax - clipMin);

	const barScale = height * 0.9375 / delta || 0;

	// because of our sorting earlier, i is guaranteed
	// to be the first element in data that is a column
	let i = iStart, x = i * ratio | 0;

	// calculate heights for avg, min, max,
	// first quartile and third quartile

	let barHeight = logProject(avg[i]) * barScale | 0,
		minHeight = logProject(minValues[i]) * barScale | 0,
		maxHeight = logProject(maxValues[i]) * barScale | 0,
		firstQHeight = logProject(firstQ[i]) * barScale | 0,
		thirdQHeight = logProject(thirdQ[i]) * barScale | 0,
		nextHeight = barHeight,
		nextMin = minHeight,
		nextMax = maxHeight,
		nextFQ = firstQHeight,
		nextTQ = thirdQHeight,
		difference = 0;
	while (i < avg.length) {
		// advance while height doesn't change
		let j = i;
		while (difference === 0 && ++j < avg.length) {
			nextHeight = logProject(avg[j]) * barScale | 0;
			nextMin = logProject(minValues[j]) * barScale | 0;
			nextMax = logProject(maxValues[j]) * barScale | 0;
			nextFQ = logProject(firstQ[j]) * barScale | 0;
			nextTQ = logProject(thirdQ[j]) * barScale | 0;

			// if any of these values are different, difference is non-zero
			// subtraction + OR masking is probably faster
			// than a bunch of equality tests.
			difference = (barHeight - nextHeight) |
				(minHeight - nextMin) |
				(maxHeight - nextMax) |
				(firstQHeight - nextFQ) |
				(thirdQHeight - nextTQ);
		}

		// We advanced j-i steps, so next x is at:
		const xNext = j * ratio | 0;
		// .. meaning width equals:
		const width = xNext - x | 0;

		drawBoxPlot(context, x, width, height, maxHeight, thirdQHeight, barHeight, firstQHeight, minHeight);

		i = j;
		x = xNext;
		barHeight = nextHeight;
		minHeight = nextMin;
		maxHeight = nextMax;
		firstQHeight = nextFQ;
		thirdQHeight = nextTQ;
		difference = 0;
	}
	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}

function barPaintBoxPlotLinear(context, preppedData, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	const { iStart, min, max, clipMin, clipMax, avg, minValues, firstQ, thirdQ, maxValues } = preppedData;

	const delta = clipMax - clipMin;

	const barScale = height * 0.9375 / delta || 0;

	// because of our sorting earlier, i is guaranteed
	// to be the first element in data that is a column
	let i = iStart, x = i * ratio | 0;

	// calculate heights for avg, min, max,
	// first quartile and third quartile

	let barHeight = avg[i] * barScale | 0,
		minHeight = minValues[i] * barScale | 0,
		maxHeight = maxValues[i] * barScale | 0,
		firstQHeight = firstQ[i] * barScale | 0,
		thirdQHeight = thirdQ[i] * barScale | 0,
		nextHeight = barHeight,
		nextMin = minHeight,
		nextMax = maxHeight,
		nextFQ = firstQHeight,
		nextTQ = thirdQHeight,
		difference = 0;
	while (i < avg.length) {
		// advance while height doesn't change
		let j = i;
		while (difference === 0 && ++j < avg.length) {
			nextHeight = avg[j] * barScale | 0;
			nextMin = minValues[j] * barScale | 0;
			nextMax = maxValues[j] * barScale | 0;
			nextFQ = firstQ[j] * barScale | 0;
			nextTQ = thirdQ[j] * barScale | 0;

			// if any of these values are different, difference is non-zero
			// subtraction + OR masking is probably faster
			// than a bunch of equality tests.
			difference = (barHeight - nextHeight) |
				(minHeight - nextMin) |
				(maxHeight - nextMax) |
				(firstQHeight - nextFQ) |
				(thirdQHeight - nextTQ);
		}

		// We advanced j-i steps, so next x is at:
		const xNext = j * ratio | 0;
		// .. meaning width equals:
		const width = xNext - x | 0;

		drawBoxPlot(context, x, width, height, maxHeight, thirdQHeight, barHeight, firstQHeight, minHeight);

		i = j;
		x = xNext;
		barHeight = nextHeight;
		minHeight = nextMin;
		maxHeight = nextMax;
		firstQHeight = nextFQ;
		thirdQHeight = nextTQ;
		difference = 0;
	}
	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}


function drawBoxPlot(context, x, width, height, maxHeight, thirdQHeight, barHeight, firstQHeight, minHeight) {
	// Since we draw the layers on top of each other,
	// it only makes sense to draw them if they actually
	// are visible
	if (maxHeight > thirdQHeight) {
		// canvas defaults to positive y going *down*, so to
		// draw from bottom to top we start at context height and
		// subtract the bar height.
		context.fillStyle = '#EECCCC';
		context.fillRect(x, height - maxHeight | 0, width, maxHeight - thirdQHeight);
	}
	if (thirdQHeight > barHeight) {
		context.fillStyle = '#EE6644';
		context.fillRect(x, height - thirdQHeight | 0, width, thirdQHeight - barHeight);
	}
	if (barHeight > firstQHeight) {
		context.fillStyle = '#000000';
		context.fillRect(x, height - barHeight | 0, width, barHeight - firstQHeight);
	}
	if (firstQHeight > minHeight) {
		context.fillStyle = '#4444AA';
		context.fillRect(x, height - firstQHeight | 0, width, firstQHeight - minHeight);
	}
	if (minHeight) {
		context.fillStyle = '#666688';
		context.fillRect(x, height - minHeight | 0, width, minHeight);
	}
}

function barPaintLabel(context, ratio, min, max, clipMin, clipMax) {
	if (ratio > 0.5) {
		const minmaxSize = 10 * ratio;
		let minText = (min || 0).toPrecision(3);
		let maxText = (max || 0).toPrecision(3);
		if (clipMin !== min) {
			minText = (clipMin || 0).toPrecision(3) + ' (min: ' + minText + ')';
		}
		if (clipMax !== max) {
			maxText = (clipMax || 0).toPrecision(3) + ' (max: ' + maxText + ')';
		}
		textStyle(context);
		textSize(context, minmaxSize);
		drawText(context, minText, 8 * ratio, context.height - 2);
		drawText(context, maxText, 8 * ratio, 2 + minmaxSize);
	}
}

function heatMapDirectly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings, label) {
	const { min, max } = attr;
	let clipMin = min;
	let clipMax = max;
	if (settings.clip) {
		const delta = max - min;
		if (settings.lowerBound > 0) {
			clipMin = min + settings.lowerBound * delta / 100;
		}
		if (settings.upperBound < 100) {
			clipMax = min + settings.upperBound * delta / 100;
		}
	}

	let i = 0, x = xOffset;
	while (i < data.length) {
		// Even if outliers[i] is not a number, OR-masking forces it to 0
		let color = dataToColor(data[i] || 0);
		context.fillStyle = color;
		let j = i, nextColor = color;
		// advance while colour value doesn't change
		while (color === nextColor && j++ < data.length - 1) {
			nextColor = dataToColor(data[j] || 0);
		}
		const w = (j - i) * barWidth;
		// force to pixel grid
		context.fillRect(x | 0, 0, ((x + w) | 0) - (x | 0), context.height);
		i = j; x += w;
	}

	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}

function heatMapGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {
	const { min, max } = attr;
	let clipMin = min;
	let clipMax = max;
	if (settings.clip) {
		const delta = max - min;
		if (settings.lowerBound > 0) {
			clipMin = min + settings.lowerBound * delta / 100;
		}
		if (settings.upperBound < 100) {
			clipMax = min + settings.upperBound * delta / 100;
		}
	}

	let i = 0;
	while (!data[i]) { i++; }
	let x = i * ratio;
	while (i < data.length) {
		let dataGroup = data[i],
			sum = 0;
		for (let j = 0; j < dataGroup.length; j++) {
			sum += dataGroup[j];
		}
		let mean = sum / dataGroup.length;
		// Even if outliers[i] is not a number, OR-masking forces it to 0
		let color = dataToColor(mean || 0);
		context.fillStyle = color;
		let j = i, nextColor = color;
		// advance while colour value doesn't change
		while (color === nextColor && j++ < data.length - 1) {
			dataGroup = data[j];
			sum = 0;
			for (let k = 0; k < dataGroup.length; k++) {
				sum += dataGroup[k];
			}
			mean = sum / dataGroup.length;
			nextColor = dataToColor(mean || 0);
		}
		const w = (j - i) * ratio;
		// force to pixel grid
		context.fillRect(x | 0, 0, ((x + w) | 0) - (x | 0), context.height);
		i = j; x += w;
	}

	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}


// Note: flameMapDirectly is just heatMapDirectly

function flameMapGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {
	// Because of rounding, our bins can come in two sizes.
	// For small data sets this is a problem, because plotting
	// a gradient for two or three cells gives a very result.
	// to fix this, we always make the gradient as large as
	// the largest bin size.
	// If necessary, we'll pad it with a zero value.
	let binSize = 0;
	let i = data.length;
	while (data[--i]) {
		if (binSize < data[i].length) {
			binSize = data[i].length;
		}
	}
	// 1 - 0.0625 - 0.03125
	// 0.9375 - 0.03125
	// 0.90625
	const flameHeight = context.height * 0.90625 | 0;
	// the thin heatMap strip
	const heatMapHeight = context.height - flameHeight;

	while (data[++i]) {
		const x = i * ratio | 0;
		const x1 = (i + 1) * ratio | 0;
		const roundedWidth = x1 - x;
		let dataGroup = data[i];
		dataGroup.sort();
		const l = dataGroup.length;
		const yOffset = binSize - l;
		let j = 0, k = 0;
		while (j < l) {
			const val = dataGroup[j];
			do {
				k++;
			} while (k < l && val === dataGroup[k]);
			const y = (flameHeight * (j + yOffset) / binSize) | 0;
			const y1 = (flameHeight * (k + yOffset) / binSize) | 0;
			const roundedHeight = y1 - y;
			const col = dataToColor(val || 0);
			context.fillStyle = col;
			context.fillRect(x, y, roundedWidth, roundedHeight);
			j = k;
		}
		// draw strip to highlight max value, so dataset with
		// sparse gene expression are more visible
		context.fillRect(x, flameHeight, roundedWidth, heatMapHeight);
	}
	// slightly separate the heatMap from the flame-map with a faded strip
	context.fillStyle = 'white';
	context.fillRect(0, flameHeight + 1, context.width, ratio | 0);
}

function textPaintDirectly(context, range) {
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
		context.shadowBlur = 0;
		context.restore();
	}
}

function nameLabelPainter(context, label) {
	textStyle(context);
	const ratio = context.pixelRatio, labelSize = Math.max(8, 12 * ratio);
	textSize(context, labelSize);
	drawText(context, label, 6 * ratio, (context.height + labelSize) * 0.5);
	context.shadowBlur = 0;
}