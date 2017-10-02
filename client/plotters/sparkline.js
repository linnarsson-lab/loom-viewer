import {
	textSize,
	textStyle,
	drawText,
} from './canvas';

import {
	findMostCommon,
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

const icicleMapPainter = {
	directly: heatMapDirectly,
	grouped: icicleMapGrouped,
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
			return flameMapPainter;
		case 'Icicle':
			return icicleMapPainter;
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

	// The key insight is that the fractional part of these numbers
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
	settings = settings || {};
	if (attr) { // attr may be undefined if it is an unfetched gene
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
	const _sparkline = (context) => {
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
				const data = groupAttr(attr, indices, range, mode, ratio * unrounded, context.width);
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
		if (label) { nameLabelPainter(context, mode, label); }
	};


	if (settings.orientation !== 'vertical') {
		return _sparkline;
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
			_sparkline(context);

			context.restore();
			t = context.width;
			context.width = context.height;
			context.height = t;
		};
	}
}

// Helper functions

/** mutates `data`, clipping it to new values */
function clip(data, clipMin, clipMax, offset = 0) {
	clipMin -= offset;
	clipMax -= offset;
	for (let i = 0; i < data.length; i++) {
		const v = data[i] - offset;
		if (v < clipMin) {
			data[i] = clipMin;
		} else if (v > clipMax) {
			data[i] = clipMax;
		} else {
			data[i] = v;
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



function categoriesDirectly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor) {
	context.fillStyle = 'white';
	let i = 0,
		j = i,
		color = dataToColor(data[i] || 0),
		nextColor = color;
	while (i < data.length) {
		// advance while value doesn't change
		while (color === nextColor && ++j < data.length) {
			nextColor = dataToColor(data[j] || 0);
		}
		context.fillStyle = color;
		// force to pixel grid
		const x = ratio * (xOffset + i * barWidth) | 0;
		const roundedWidth = (ratio * (xOffset + j * barWidth) | 0) - x;
		context.fillRect(x, 0, roundedWidth, context.height);
		i = j;
		color = nextColor;
	}
}

function categoriesGrouped(context, attr, data, range, ratio, dataToColor) {
	let i = 0;
	// skip left-padding
	while (!data[i]) { i++; }
	let j = i,
		color = dataToColor(findMostCommon(data[i] || 0)),
		nextColor = color;
	while (i < data.length) {
		while (color === nextColor && ++j < data.length) {
			nextColor = dataToColor(findMostCommon(data[j] || 0));
		}
		context.fillStyle = color;
		const x = i * ratio | 0;
		const roundedWidth = (j * ratio | 0) - (i * ratio | 0);
		context.fillRect(x, 0, roundedWidth, context.height);
		i = j;
		color = nextColor;
	}
}

// Note: stackedCategoriesDirectly is functionally equivalent to categories

function stackedCategoriesGrouped(context, attr, data, range, ratio, dataToColor) {
	const { height } = context;
	// const barWidth = ratio;
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

		let j = 0,
			k = 0,
			color = dataToColor(barSlice[j] || 0),
			nextColor = color;
		while (j < l) {
			while (color === nextColor && k < barSlice.length) {
				nextColor = dataToColor(barSlice[++k] || 0);
			}

			const y = (height * j / l) | 0;
			const y1 = (height * k / l) | 0;
			const roundedHeight = y1 - y;
			context.fillStyle = color;
			context.fillRect(x, y, roundedWidth, roundedHeight);

			j = k;
			color = nextColor;
		}
	}
}

function barPaintDirectly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings, label) {
	const { logScale } = settings;
	const {
		min,
		max,
	} = attr;
	let clipMin = min;
	let clipMax = max;
	// no need to waste time drawing empty arrays
	if (max !== min) {

		if (settings.clip) {
			const delta = max - min;
			if (settings.lowerBound > 0) {
				clipMin = min + settings.lowerBound * delta / 100;
			}
			if (settings.upperBound < 100) {
				clipMax = min + settings.upperBound * delta / 100;
			}
			if (clipMin !== min || clipMax !== max) {
				clip(data, clipMin, clipMax, clipMin);
			}
		}

		const delta = logScale ? logProject(clipMax - clipMin) :
			clipMax - clipMin;
		const barScale = context.height * 0.9375 / delta || 0;

		if (barScale) {
			if (logScale) {
				barPaintDirectlyLog(context, data, xOffset, barScale, barWidth);
			} else {
				barPaintDirectlyLinear(context, data, xOffset, barScale, barWidth);
			}
		}
	}
	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}

function barPaintDirectlyLog(context, data, xOffset, barScale, barWidth) {
	context.fillStyle = '#000000';
	let i = 0,
		x = xOffset | 0,
		barHeight = logProject(data[i]) * barScale | 0,
		j = i,
		nextHeight = barHeight;
	while (i < data.length) {
		// advance while height doesn't change
		while (barHeight === nextHeight && ++j < data.length) {
			nextHeight = logProject(data[j]) * barScale | 0;
		}
		const xNext = (xOffset + j * barWidth) | 0;

		// zero values are an extremely common case,
		// and calls to context.fillRect are the
		// biggest bottleneck, so skipping pointless
		// draw calls has a real effect on performance
		if (barHeight) {
			// canvas defaults to positive y going *down*, so to
			// draw from bottom to top we start at context height and
			// subtract the bar height.
			let y = context.height - barHeight | 0;
			context.fillRect(x, y, xNext - x, barHeight);
		}
		i = j;
		barHeight = nextHeight;
		x = xNext;
	}
}

function barPaintDirectlyLinear(context, data, xOffset, barScale, barWidth) {
	context.fillStyle = '#000000';
	let i = 0,
		x = xOffset | 0,
		barHeight = data[i] * barScale | 0,
		j = i,
		nextHeight = barHeight;
	while (i < data.length) {
		while (barHeight === nextHeight && ++j < data.length) {
			nextHeight = data[j] * barScale | 0;
		}
		const xNext = (xOffset + j * barWidth) | 0;

		if (barHeight) {
			let y = context.height - barHeight | 0;
			context.fillRect(x, y, xNext - x, barHeight);
		}
		i = j;
		barHeight = nextHeight;
		x = xNext;
	}
}

function barConvertGroupedData(attr, data, min, max, settings) {
	let avg = new Float32Array(data.length);

	const {
		lowerBound, upperBound,
	} = settings;
	let delta = max - min,
		clipMin = min,
		clipMax = max;

	if (settings.clip && lowerBound > 0) {
		clipMin = min + lowerBound * delta / 100;
	}

	// Remember: data might be padded with empty values
	// So we find the first index where data[iStart]
	// returns grouped data, while simultaneously
	// sorting the data for later.
	let iStart = data.length;
	while (data[iStart - 1]) { data[--iStart].sort(); }

	// go through all columns, find average,
	// and biggest third quartile
	let tQmax = clipMin;
	for (let i = iStart; i < data.length; i++) {
		const group = data[i];
		// side-benefit of sorting: lower error
		// when summing up float values!
		// (not that this will be significant)
		let sum = 0;
		for (let j = 0; j < group.length; j++) {
			sum += group[j];
		}
		avg[i] = sum / group.length;
		// note that since we sorted group before, this
		// should give us the first and third quartile.
		let tQ = group[group.length * 0.75 | 0];
		if (tQ > tQmax) {
			tQmax = tQ;
		}
	}

	// When drawing a linear plot, always clip to the
	// biggest third quartile in all the bins, unless
	// manual clipping is on and clipMax is smaller
	if (!settings.logScale) {
		// In very sparse data sets, tQmax tends to be zero,
		// so if the max value is non-zero, we set it to 1.
		if (tQmax === 0 && max > 0) {
			tQmax = max < 1 ? max : 1;
		}
		clipMax = tQmax;
	}
	if (settings.clip && min + upperBound * delta / 100 < clipMax) {
		clipMax = min + upperBound * delta / 100;
	}


	if (clipMin !== min || clipMax !== max) {
		clip(avg, clipMin, clipMax, clipMin);
	}

	return {
		iStart, min, max, clipMin, clipMax, avg,
	};
}

function barPaintGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {
	const {
		min, max,
	} = attr;
	// no need to waste time drawing empty arrays
	if (max !== min) {
		let convertedData = barConvertGroupedData(attr, data, min, max, settings);
		if (settings.logScale) {
			barPaintGroupedLogProjected(context, convertedData, range, ratio, dataToColor, settings, label);
		} else {
			barPaintGroupedLinear(context, convertedData, range, ratio, dataToColor, settings, label);
		}
	} else if (label) {
		barPaintLabel(context, ratio, min, max, min, max);
	}
}

function barPaintGroupedLogProjected(context, convertedData, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	const {
		iStart, min, max, clipMin, clipMax, avg,
	} = convertedData;

	const barScale = height * 0.9375 / logProject(clipMax - clipMin);
	if (barScale) {

		let i = iStart,
			j = i,
			barHeight = logProject(avg[i]) * barScale | 0,
			nextHeight = barHeight,
			x = i * ratio | 0;

		while (i < avg.length) {

			// advance while height doesn't change
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

			i = j;
			barHeight = nextHeight;
			x = xNext;
		}
	}

	if (label) {
		barPaintLabel(context, ratio, min, max, clipMin, clipMax);
	}
}

function barPaintGroupedLinear(context, convertedData, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	const {
		iStart, min, max, clipMin, clipMax, avg,
	} = convertedData;

	const delta = clipMax - clipMin;
	const barScale = height * 0.9375 / delta || 0;

	// because of our sorting earlier, i is guaranteed
	// to be the first element in data that is a column
	let i = iStart,
		x = i * ratio | 0;

	while (i < avg.length) {
		const barHeight = avg[i] * barScale | 0;
		// advance while height doesn't change
		let j = i,
			nextHeight = barHeight;
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

	const {
		logScale, lowerBound, upperBound,
	} = settings;
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
	let tQmax = clipMin;
	for (let i = iStart; i < data.length; i++) {
		const group = data[i];
		let sum = 0;
		for (let j = 0; j < group.length; j++) {
			sum += group[j];
		}
		avg[i] = sum / group.length;
		// note that we already sorted group, so this
		// should give us the first and third quartile.
		minValues[i] = group[0];
		firstQ[i] = group[group.length * 0.25 | 0];
		thirdQ[i] = group[group.length * 0.75 | 0];
		if (thirdQ[i] > tQmax) {
			tQmax = thirdQ[i];
		}
		maxValues[i] = group[group.length - 1];
	}

	// If linear plot, automatically clip to biggest
	// third quartile in all the bins
	if (!logScale) {
		// In very sparse data sets, tQmax tends to be zero,
		// so if the max value is non-zero, we set it to 1.
		if (tQmax === 0 && max > 0) {
			tQmax = 1;
		}
		clipMax = tQmax;
	}
	// Only clip to upperBound if it is smaller than clipMax
	if (settings.clip && min + upperBound * delta / 100 < clipMax) {
		clipMax = min + upperBound * delta / 100;
	}

	if (clipMin !== min || clipMax !== max) {
		clip(avg, clipMin, clipMax, clipMin);
		clip(minValues, clipMin, clipMax, clipMin);
		clip(maxValues, clipMin, clipMax, clipMin);
		clip(firstQ, clipMin, clipMax, clipMin);
		clip(thirdQ, clipMin, clipMax, clipMin);
	}

	return {
		iStart, min, max, clipMin, clipMax, avg, minValues, firstQ, thirdQ, maxValues,
	};
}


// While not drawn as a standard box-plot, we _do_ plot
// all the features of a box plot. They are displayed as layers:
// - min (light grey blue)
// - first quartile (blue)
// - average (black)
// - third quartile (red)
// - max (very light grey red)
function barPaintBoxPlot(context, attr, data, range, ratio, dataToColor, settings, label) {
	const {
		min, max,
	} = attr;
	let convertedData = barGroupedBoxDataPrep(attr, data, min, max, settings);
	if (settings.logScale) {
		barPaintBoxPlotLogProjected(context, convertedData, range, ratio, dataToColor, settings, label);
	} else {
		barPaintBoxPlotLinear(context, convertedData, range, ratio, dataToColor, settings, label);
	}
}

function barPaintBoxPlotLogProjected(context, convertedData, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	const {
		iStart, min, max, clipMin, clipMax, avg, minValues, firstQ, thirdQ, maxValues,
	} = convertedData;

	const delta = logProject(clipMax - clipMin);

	const barScale = height * 0.9375 / delta || 0;

	// because of our sorting earlier, i is guaranteed
	// to be the first element in data that is a column
	let i = iStart,
		x = i * ratio | 0;

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

function barPaintBoxPlotLinear(context, convertedData, range, ratio, dataToColor, settings, label) {
	const { height } = context;
	const {
		iStart, min, max, clipMin, clipMax, avg, minValues, firstQ, thirdQ, maxValues,
	} = convertedData;

	const delta = clipMax - clipMin;

	const barScale = height * 0.9375 / delta || 0;

	// because of our sorting earlier, i is guaranteed
	// to be the first element in data that is a column
	let i = iStart,
		x = i * ratio | 0;

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
	const {
		min, max,
	} = attr;
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

	let i = 0,
		j = i,
		color = dataToColor(data[i] || 0),
		nextColor = color,
		x = xOffset | 0;
	while (i < data.length) {
		// advance while colour value doesn't change
		while (color === nextColor && ++j < data.length) {
			nextColor = dataToColor(data[j] || 0);
		}
		const xNext = xOffset + j * barWidth | 0;
		context.fillStyle = color;
		context.fillRect(x, 0, xNext - x, context.height);
		i = j;
		color = nextColor;
		x = xNext;
	}

	if (label) {
		heatmapLabel(context, ratio, min, max, clipMin, clipMax);
	}
}

function heatMapGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {
	const {
		min, max,
	} = attr;
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

	let i = data.length;
	while (data[--i]) {/* */ }
	let dataGroup = data[++i],
		sum = 0;
	for (let j = 0; j < dataGroup.length; j++) {
		sum += dataGroup[j];
	}
	let color = dataToColor(sum / dataGroup.length || 0),
		nextColor = color,
		j = i,
		x = i * ratio | 0;
	while (i < data.length) {
		// advance while colour value doesn't change
		while (color === nextColor && ++j < data.length) {
			dataGroup = data[j];
			sum = 0;
			for (let k = 0; k < dataGroup.length; k++) {
				sum += dataGroup[k];
			}
			nextColor = dataToColor(sum / dataGroup.length || 0);
		}
		const xNext = j * ratio | 0;
		context.fillStyle = color;
		context.fillRect(x, 0, xNext - x, context.height);
		i = j;
		color = nextColor;
		x = xNext;
	}

	if (label) {
		// width of the gradient, does not include text before and after
		const width = 20 * ratio | 0;
		// height of the whole, textSize is smaller
		const height = 12 * ratio | 0;
		const x = 6 * ratio | 0;
		let y = context.height * 0.25 + height * 0.5 | 0;
		heatmapLabel(context, x, y, width, height, dataToColor, min, max, clipMin, clipMax, settings);
	}
}

function heatmapLabel(context, x, y, width, height, dataToColor, min, max, clipMin, clipMax, settings) {
	// label for min and max values,
	// avoid trailing zeros on integer values
	const lblMin = min !== (min | 0) ?
		min.toExponential(2) : min | 0;
	const lblMax = max !== (max | 0) ?
		max.toExponential(2) : max | 0;

}

// Note: flameMapDirectly is just heatMapDirectly

function flameMapGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {

	const { emphasizeNonZero } = settings;
	// make sure the background is grey, to show missing values.
	context.fillStyle = '#E8E8E8';
	context.fillRect(0, 0, context.width, context.height);

	const flameHeight = (emphasizeNonZero ? 29 / 32 : 1) * context.height | 0;
	// the thin max value strip
	const maxColumnValueHeight = emphasizeNonZero ? context.height - flameHeight : 0;

	// Because of rounding, our bins can come in two sizes.
	// For small data sets this is a problem, because plotting
	// a gradient for two or three cells gives a very result.
	// to fix this, we always make the gradient as large as
	// the largest bin size.
	// If necessary, we'll pad it with a zero value.
	let binSize = 0;
	let i = data.length;
	while (data[--i]) {
		// while we're at it, sort the data for later
		let l = data[i].length;
		if (l > binSize) {
			binSize = l;
		}
	}

	while (data[++i]) {
		const x = i * ratio | 0;
		const x1 = (i + 1) * ratio | 0;
		const width = x1 - x;
		drawFlameColumn(context, x, width, flameHeight, data[i], binSize, dataToColor);
		if (emphasizeNonZero) {
			// draw strip to highlight max value, so dataset with
			// sparse gene expression are more visible
			context.fillRect(x, flameHeight, width, maxColumnValueHeight);
		}
	}

	if (emphasizeNonZero) {
		// slightly separate the heatMap from the flame-map with a faded strip
		context.fillStyle = 'white';
		context.fillRect(0, flameHeight, context.width, ratio | 0);
	}
}

function drawFlameColumn(context, x, width, height, dataGroup, binSize, dataToColor) {
	dataGroup.sort();
	const l = dataGroup.length;
	const spareTile = binSize - l;
	let j = 0,
		k = j,
		val = dataGroup[j],
		nextVal = val,
		y = (height * (j + spareTile) / binSize) | 0,
		yNext = y;
	while (j < l) {
		while (val === nextVal && ++k < l) {
			nextVal = dataGroup[k];
		}
		yNext = (height * (k + spareTile) / binSize) | 0;
		context.fillStyle = dataToColor(val || 0);
		context.fillRect(x, y, width, yNext - y);
		j = k;
		val = nextVal;
		y = yNext;
	}
}



// Note: icicleMapDirectly is just heatMapDirectly

function icicleMapGrouped(context, attr, data, range, ratio, dataToColor, settings, label) {
	const { emphasizeNonZero } = settings;
	// make sure the background is grey, to show missing values.
	context.fillStyle = '#E8E8E8';
	context.fillRect(0, 0, context.width, context.height);

	const flameHeight = (emphasizeNonZero ? 29 / 32 : 1) * context.height | 0;
	// the thin max value strip
	const maxColumnValueHeight = emphasizeNonZero ? context.height - flameHeight : 0;

	// Because of rounding, our bins can come in two sizes.
	// For small data sets this is a problem, because plotting
	// a gradient for two or three cells gives a very result.
	// to fix this, we always make the gradient as large as
	// the largest bin size.
	// If necessary, we'll pad it with a zero value.
	let binSize = 0;
	let i = data.length;
	while (data[--i]) {
		let l = data[i].length;
		if (l > binSize) {
			binSize = l;
		}
	}

	while (data[++i]) {
		const x = i * ratio | 0;
		const x1 = (i + 1) * ratio | 0;
		const width = x1 - x;
		drawIcicleColumn(context, x, width, flameHeight, maxColumnValueHeight, data[i], binSize, dataToColor);
		if (emphasizeNonZero) {
			// draw strip to highlight max value, so dataset with
			// sparse gene expression are more visible
			context.fillRect(x, 0, width, maxColumnValueHeight);
		}
	}

	if (emphasizeNonZero) {
		// slightly separate the heatMap from the flame-map with a faded strip
		context.fillStyle = 'white';
		context.fillRect(0, maxColumnValueHeight - ratio, context.width, ratio | 0);
	}
}

// same as flame, except we move in the other direction
function drawIcicleColumn(context, x, width, height, yOffset, dataGroup, binSize, dataToColor) {
	dataGroup.sort();
	const l = dataGroup.length;
	const spareTile = binSize - l;
	let j = 0,
		k = j,
		val = dataGroup[j],
		nextVal = val,
		y = height * (1 - (j + spareTile) / binSize) | 0,
		yNext = y;
	while (j < l) {
		while (val === nextVal && ++k < l) {
			nextVal = dataGroup[k];
		}
		yNext = height * (1 - (k + spareTile) / binSize) | 0;
		context.fillStyle = dataToColor(val || 0);
		context.fillRect(x, yNext + yOffset, width, y - yNext);
		j = k;
		val = nextVal;
		y = yNext;
	}
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
		context.restore();
	}
}

function nameLabelPainter(context, mode, label) {
	textStyle(context);
	const ratio = context.pixelRatio,
		labelSize = Math.max(8, 12 * ratio);
	textSize(context, labelSize);
	const x = 6 * ratio;
	let y = (context.height + labelSize) * 0.5;
	if (mode === 'Flame' || mode === 'Heatmap') {
		y += context.height * 0.1875;
	} else if (mode === 'Icicle') {
		y -= context.height * 0.25;
	}
	drawText(context, label, x, y);
}

// To group the data, we need to find the ranges [i0,i1) such that
//   i0*barWidth = first data point in one column, and
//   i1*barWidth = first data point of the next column
// We then group data in an array of arrays, each with group
// containing the data points in their range
function groupAttr(attr, indices, range, mode, groupNum, groupDen) {
	const {
		left,
		right,
	} = range;
	const dataLength = attr.data.length < right ? attr.data.length : right;

	// Our data range might include indices outside of
	// the real data range. These are empty groups.
	// We make sure it's the same typed array type
	// as the real data, since the JIT compiler might
	// optimise for that (emphasis might, this is
	// untested and probably changes over time
	// anyway. But type-stable arrays are a good
	// principle to live by I think.
	let i = 0;
	if (left < 0) {
		i = -left * groupDen / groupNum | 0;
	}
	let data = new Array(i);

	// Copy actual groups

	// If we're using Text mode, the data being grouped cannot be a typed
	// array. We also have to check if the text is indexed or not.
	const subset = (mode === 'Text' && attr.indexedVal !== undefined) ? attrIndexedSubset : attrSubset;

	// For some modes, we want to smooth the groups
	const smoothing = mode === 'Stacked';

	let i1 = left + i * groupNum / groupDen | 0;
	if (smoothing) {
		// smoothing is done by including the surrounding
		// two columns in the group, creating overlapping groups.

		// First two slices of data, ensured to not start at < 0

		i++;
		i1 = i * groupNum / groupDen + left | 0;
		data.push(subset(attr, indices, 0, i1));

		i++;
		i1 = i * groupNum / groupDen + left | 0;
		data.push(subset(attr, indices, 0, i1));

		i++;
		i1 = i * groupNum / groupDen + left | 0;
		let i0 = (i - 3) * groupNum / groupDen + left | 0;

		while (i1 <= dataLength) {
			data.push(subset(attr, indices, i0, i1));
			i++;
			i1 = i * groupNum / groupDen + left | 0;
			i0 = (i - 3) * groupNum / groupDen + left | 0;
		}
		// Last slice of data, covering the last two columns
		data.push(subset(attr, indices, i0, dataLength | 0));
	} else {
		// First slice of data, ensured to not start at < 0
		data.push(subset(attr, indices, 0, i1));
		i++;
		i1 = i * groupNum / groupDen + left | 0;
		let i0 = (i - 1) * groupNum / groupDen + left | 0;

		while (i1 <= dataLength) {
			data.push(subset(attr, indices, i0, i1));
			i++;
			i1 = i * groupNum / groupDen + left | 0;
			i0 = (i - 1) * groupNum / groupDen + left | 0;
		}
		while (i0 < dataLength) {
			// Last slice of data, ensure that it ends at dataLength|0
			data.push(subset(attr, indices, i0, dataLength));
			i0 = i * groupNum / groupDen + left | 0;
			i++;
		}
	}

	// we don't actually have to pad the right side,
	// we'll simply stop plotting once we run out of groups.
	return data;
}
