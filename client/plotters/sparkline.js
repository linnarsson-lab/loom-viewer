import {
	textSize,
	textStyle,
	drawText,
} from './canvas';

import {
	attrToColorFactory,
	findMostCommon,
	groupAttr,
	attrIndexedSubset,
	attrSubset,
	logProject,
} from '../js/util';

// TODO: change the way sparkline plotters prepare and consume data
// current version becomes memory-intensive for large arrays
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
	settings = settings || {};
	const {
		dataRange,
	} = settings;


	// Since the following involves a lot of mathematical trickery,
	// I figured I'd better document this inline in long-form.

	// dataRange consists of two doubles that indicate which part
	// of the data is displayed (using the bounds of the leaflet
	// heatMap actually works out here, because it has has a
	// one-to-one pixel width/height to column/row mapping.
	// If this ever changes we need to change this code too).

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
			const ratio = context.pixelRatio * 0.5 > 1 ? context.pixelRatio * 0.5 : 1;
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

			// Therefore, the columns should have a width of:
			//   barWidth = ratio * range.width / range.total
			//            = ratio * context.width / range.unrounded
			const barWidth = ratio * context.width / unrounded;
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
				plot.grouped(context, attr, data, range, ratio, dataToColor, settings);
			} else {
				// data is an unpadded selection of the visible data
				// We also include an xOffset (negative) and a barWidth
				// xOffset is the total pixels by which the first bar
				// is outside the canvas.
				// If left = [0, data.length), then this is the fraction
				// part of it times barWidth
				// If left < 0, it is -left * barWidth
				const leftFrac = left < 0 ? -left : leftRounded - left;
				const xOffset = (leftFrac * barWidth) | 0;
				// copy relevant subset of data
				const i0 = leftRounded < 0 ? 0 : leftRounded;
				const i1 = rightRounded > attr.data.length ? attr.data.length : rightRounded;
				const indexedText = mode === 'Text' && attr.indexedVal !== undefined;
				const data = indexedText ? attrIndexedSubset(attr, indices, i0, i1) : attrSubset(attr, indices, i0, i1);

				// xOffset is the lef-padding in pixels, after which we can
				// simply draw the passed data from left to right, with barWidth
				// sized columns
				plot.directly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings);
			}
		}
		if (label) { labelPainter(context, label); }
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



function categoriesDirectly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings) {
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

function categoriesGrouped(context, attr, data, range, ratio, dataToColor, settings) {
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

function stackedCategoriesGrouped(context, attr, data, range, ratio, dataToColor, settings) {
	const { height } = context;
	const barWidth = ratio;
	let i = 0;
	// skip left-padding
	while (!data[i]) { i++; }
	while (data[i]) {
		let barSlice = data[i++],
			l = barSlice.length;
		barSlice.sort();

		const x = (i * barWidth) | 0;
		const x1 = ((i + 1) * barWidth) | 0;
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

function barPaintDirectly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings) {
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

	if (settings.logScale) {
		barPaintDirectlyLog(context, data, xOffset, barWidth, clipMin, clipMax);
	} else {
		barPaintDirectlyLinear(context, data, xOffset, barWidth, clipMin, clipMax);
	}

	barPaintLabel(context, ratio, min, max, clipMin, clipMax);
}

function barPaintDirectlyLinear(context, data, xOffset, barWidth, clipMin, clipMax) {
	const barScale = context.height * 0.9375 / (clipMax - clipMin) || 0;
	context.fillStyle = '#000000';
	let i = 0, x = xOffset;
	while (i < data.length) {

		// Even if outliers[i] is not a number, OR-masking forces it to 0
		const barHeight = ((data[i] - clipMin) * barScale) | 0;

		// advance while height doesn't change
		let j = i, nextHeight = barHeight;
		while (barHeight === nextHeight && j++ < data.length - 1) {
			nextHeight = ((data[j] - clipMin) * barScale) | 0;
		}

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
}

function barPaintDirectlyLog(context, data, xOffset, barWidth, clipMin, clipMax) {
	const barScale = context.height * 0.9375 / logProject(clipMax - clipMin) || 0;
	context.fillStyle = '#000000';
	let i = 0, x = xOffset;
	while (i < data.length) {

		// Even if outliers[i] is not a number, OR-masking forces it to 0
		const barHeight = (logProject(data[i] - clipMin) * barScale) | 0;

		// advance while height doesn't change
		let j = i, nextHeight = barHeight;
		while (barHeight === nextHeight && j++ < data.length - 1) {
			nextHeight = (logProject(data[j] - clipMin) * barScale) | 0;
		}

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
}

function barPaintGrouped(context, attr, data, range, ratio, dataToColor, settings) {
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
			for (let i = 0; i < data.length; i++) {
				clip(data[i], clipMin, clipMax);
			}
		}
	}

	if (settings.logScale) {
		barPaintGroupedLog(context, data, clipMin, clipMax);
	} else {
		barPaintGroupedLinear(context, data, clipMin, clipMax);
	}

	barPaintLabel(context, ratio, min, max, clipMin, clipMax);
}

function barPaintGroupedLinear(context, data, clipMin, clipMax) {
	context.fillStyle = '#000000';
	const barScale = context.height * 0.9375 / (clipMax - clipMin) || 0;

	let i = 0;
	while (!data[i]) { i++; }

	let x = i;

	while (data[i]) {
		let dataGroup = data[i];
		let sum = 0;
		for (let j = 0; j < dataGroup.length; j++) {
			sum += dataGroup[j];
		}
		let mean = sum / dataGroup.length;
		// Even if outliers[i] is not a number, OR-masking forces it to 0
		const barHeight = ((mean - clipMin) * barScale) | 0;

		// advance while height doesn't change
		let j = i, nextHeight = barHeight;
		while (barHeight === nextHeight && j++ < data.length - 1) {
			dataGroup = data[j];
			sum = 0;
			for (let k = 0; k < dataGroup.length; k++) {
				sum += dataGroup[k];
			}
			mean = sum / dataGroup.length;
			nextHeight = (mean - clipMin) * barScale | 0;
		}

		const w = (j - i);

		// zero values are an extremely common case,
		// so skip those pointless draw calls
		if (barHeight) {
			// canvas defaults to positive y going *down*, so to
			// draw from bottom to top we start at context height and
			// subtract the bar height.
			let y = context.height - barHeight | 0;

			// force to pixel grid
			context.fillRect(x | 0, y, w, barHeight);
		}
		i = j; x += w;
	}
}

function barPaintGroupedLog(context, data, clipMin, clipMax) {

	context.fillStyle = '#000000';
	const barScale = context.height * 0.9375 / logProject(clipMax - clipMin) || 0;

	let i = 0;
	while (!data[i]) { i++; }

	let x = i;

	while (data[i]) {
		let dataGroup = data[i];
		let sum = 0;
		for (let j = 0; j < dataGroup.length; j++) {
			sum += dataGroup[j];
		}
		let mean = sum / dataGroup.length;
		// Even if outliers[i] is not a number, OR-masking forces it to 0
		const barHeight = logProject(mean - clipMin) * barScale | 0;

		// advance while height doesn't change
		let j = i, nextHeight = barHeight;
		while (barHeight === nextHeight && j++ < data.length - 1) {
			dataGroup = data[j];
			sum = 0;
			for (let k = 0; k < dataGroup.length; k++) {
				sum += dataGroup[k];
			}
			mean = sum / dataGroup.length;
			nextHeight = logProject(mean - clipMin) * barScale | 0;
		}

		const w = (j - i);

		// zero values are an extremely common case,
		// so skip those pointless draw calls
		if (barHeight) {
			// canvas defaults to positive y going *down*, so to
			// draw from bottom to top we start at context height and
			// subtract the bar height.
			let y = context.height - barHeight | 0;

			// force to pixel grid
			context.fillRect(x | 0, y, w, barHeight);
		}
		i = j; x += w;
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

function heatMapDirectly(context, attr, data, range, ratio, xOffset, barWidth, dataToColor, settings) {
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

	barPaintLabel(context, ratio, min, max, clipMin, clipMax);
}

function heatMapGrouped(context, attr, data, range, ratio, dataToColor, settings) {
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

	barPaintLabel(context, ratio, min, max, clipMin, clipMax);
}


// Note: flameMapDirectly is just heatMapDirectly

function flameMapGrouped(context, attr, data, range, ratio, dataToColor, settings) {
	// Because of rounding, our bins can come in two sizes.
	// For small data sets this is a problem, because plotting
	// a gradient for two or three cells gives a very result.
	// to fix this, we always make the gradient as large as
	// the largest bin size.
	// If necessary, we'll pad it with a zero value.
	let binSize = 0;
	let i = data.length;
	while (data[--i]){
		if (binSize < data[i].length){
			binSize = data[i].length;
		}
	}

	const barWidth = ratio;
	const flameHeight = context.height * 0.875;
	// the thin heatMap strip
	const heatMapHeight = context.height - (flameHeight | 0) - ratio;

	while(data[++i]){
		const x = i * barWidth | 0;
		const x1 = (i + 1) * barWidth | 0;
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
	context.fillStyle = 'grey';
	context.globalAlpha = 0.25;
	context.fillRect(0, flameHeight, context.width, ratio);
	context.globalAlpha = 1.0;

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

function labelPainter(context, label) {
	textStyle(context);
	const ratio = context.pixelRatio, labelSize = Math.max(8, 12 * ratio);
	textSize(context, labelSize);
	drawText(context, label, 6 * ratio, (context.height + labelSize) * 0.5);
	context.shadowBlur = 0;
}