import * as colorLUT from '../js/colors';
import { rndNorm, arraySubset } from '../js/util';

// "global" array of sprite canvases. Contexts will be filled in later
const { sprites, contexts } = (() => {
	let i = 257;
	const sprites = new Array(i), contexts = new Array(i);
	while (i--) {
		sprites[i] = document.createElement('canvas');
		sprites[i].id = `dot_sprite_${i}`;
		sprites[i].width = 16;
		sprites[i].height = 16;
	}
	return { sprites, contexts };
})();

export function scatterplot(x, y, color, indices, colorMode, logscale, jitter) {
	return (context) => {
		// only render if all required data is supplied
		if (!(x && y && color)) {
			return;
		}
		context.save();

		let { width, height } = context;

		// Erase previous paint
		context.clearRect(0, 0, width, height);

		// Suitable radius of the markers
		// - smaller canvas size -> smaller points
		const radius = Math.min(7, (Math.max(1, Math.min(width, height) / 100)) * context.pixelRatio);

		// ===============================
		// == Prepare Palette & Sprites ==
		// ===============================
		const { palette, sprites } = prepareSprites(colorMode, width, height, radius);

		// =================================
		// == Prepare x, y and color data ==
		// =================================

		// Avoid accidentally mutating source arrays,
		// and make sure we're convert data to floats
		// for the sake of plotting (we optimise storage
		// to the smallest sensible format).
		// Arrays of (indexed) strings are converted to
		// numerical arrays representing the twenty most
		// common strings as categories, plus "other"
		let { xData, yData } = convertCoordinates(x, y, indices, width, height, radius, jitter, logscale);
		let { cIdx } = convertColordata(color, indices, colorMode, palette);

		// ==============================
		// == Sort for tiling purposes ==
		// ==============================

		// Sort so that we render zero values first, and then from back-to-front.
		// This has to be done after jittering to maintain the tiling behaviour
		// that is desired.
		const sorted = sortByAxes(xData, yData, cIdx, width, height);
		xData = sorted.xData;
		yData = sorted.yData;
		cIdx = sorted.cIdx;


		// ==================
		// == blit sprites ==
		// ==================

		// Because we sorted such that all cIdx zero values are in
		// front of the array, we can simplify the cIdx lookups.
		// This also avoids repeated identical sprite lookups.
		let zeroSprite = sprites[0];
		let i = -1;
		while (cIdx[++i] === 0) {
			context.drawImage(zeroSprite, xData[i], yData[i]);
		}
		// this decrement is necessary because we otherwise
		// overshoot due to the above while loop
		i--;
		while (++i < xData.length) {
			context.drawImage(sprites[cIdx[i]], xData[i], yData[i]);
		}
		context.restore();
	};
}

function convertCoordinates(x, y, indices, width, height, radius, jitter, logscale) {
	const { PI, random, sin, cos, log2 } = Math;
	// Scale of data
	let xmin = (x.hasZeros && x.min > 0) ? 0 : x.min;
	let xmax = x.max;
	let ymin = (y.hasZeros && y.min > 0) ? 0 : y.min;
	let ymax = y.max;

	// If we have an unindexed string array, convert it
	// to numbers as a form of categorisation
	let xData = maybeStringArray(x, indices);
	let yData = maybeStringArray(y, indices);

	// Jitter if requested
	const l = xData.length;
	let i = l;
	if (jitter.x && jitter.y) {
		// if jittering both axes, do so in a
		// circle around the data
		while (i--) {
			const r = rndNorm();
			const t = PI * 2 * random();
			xData[i] += r * sin(t);
			yData[i] += r * cos(t);
		}
		// rndNorm() returns a range [-0.5, 0.5),
		// so we adjust min/max accordingly
		xmin -= 0.25; xmax += 0.25;
		ymin -= 0.25; ymax += 0.25;
	} else if (jitter.x) {
		while (i--) {
			xData[i] += rndNorm();
		}
		xmin -= 0.25; xmax += 0.25;
	} else if (jitter.y) {
		while (i--) {
			yData[i] += rndNorm();
		}
		ymin -= 0.25; ymax += 0.25;
	}

	// Log transform if requested
	if (logscale.x) {
		i = l;
		while (i--) {
			xData[i] = log2(1 + xData[i]);
		}
		xmin = log2(1 + xmin);
		xmax = log2(1 + xmax);
	}
	if (logscale.y) {
		i = l;
		while (i--) {
			yData[i] = log2(1 + yData[i]);
		}
		ymin = log2(1 + ymin);
		ymax = log2(1 + ymax);
	}

	// Scale to screen dimensions with margins
	scaleToContext(xData, yData, xmin, xmax, ymin, ymax, width, height, radius);

	return { xData, yData };
}

function maybeStringArray(attr, indices) {
	// realistically, this only happens if all strings are unique
	if (attr.arrayType === 'string' && !attr.indexedVal) {
		let i = indices.length;
		let retVal = new Float32Array(i);
		while (i--) {
			retVal[i] = indices[i] + 1;
		}
		return retVal;
	}
	return arraySubset(attr.data, indices, 'float32');
}

function scaleToContext(xData, yData, xmin, xmax, ymin, ymax, width, height, radius) {
	const xmargin = (xmax - xmin) * 0.0625;
	const yMargin = (ymax - ymin) * 0.0625;
	const l = xData.length;
	// we add xmargin/ymargin in the divisor here (and compensate further on with 0.5)
	// to *also* add a margin *before* the normalisation. We also subtract the radius
	// to avoid any points from going over the edge of the canvas
	let xScale = ((width - 4 * radius)) / (xmax - xmin + xmargin);
	let i = l;
	while (i--) {
		xData[i] = (xData[i] - xmin + 0.5 * xmargin) * xScale + 2 * radius;
	}
	let yNorm = 1 / (ymax - ymin + yMargin);
	let yProject = (height - 4 * radius);
	i = l;
	while (i--) {
		yData[i] = (1 - (yData[i] - ymin + 0.5 * yMargin) * yNorm) * yProject + 2 * radius;
	}
}

function convertColordata(colorAttr, indices, colorMode, palette) {
	let colData = arraySubset(colorAttr.data, indices, colorAttr.arrayType);
	// Largest palettes are 256 entries in size,
	// so we can safely Uint8Array for cIdx
	let cIdx = new Uint8Array(colData.length);
	let i = cIdx.length;
	if (colorMode === 'Categorical') {
		let { colorIndices } = colorAttr;
		while (i--) {
			cIdx[i] = colorIndices.mostFreq[colData[i]] | 0;
		}
	} else { // Heatmap or Heatmap2
		let { min, max, hasZeros } = colorAttr;
		min = hasZeros && min > 0 ? 0 : min;
		const colorIdxScale = ((palette.length - 1) / (max - min) || 1);
		while (i--) {
			cIdx[i] = ((colData[i] - min) * colorIdxScale) | 0;
		}

	}
	return { cIdx };
}

function prepareSprites(colorMode, width, height, radius) {

	let palette = [];
	switch (colorMode) {
		case 'Heatmap':
			palette = colorLUT.solar256;
			break;
		case 'Heatmap2':
			palette = colorLUT.YlGnBu256;
			break;
		case 'Categorical':
			palette = colorLUT.category20;
			break;
	}

	const spriteW = sprites[0].width, spriteH = sprites[0].height;
	const lineW = Math.min(0.5, Math.max(0.125, radius / 10));
	// reset all sprites to empty circles
	let i = sprites.length;
	while (i--) {
		let ctx = sprites[i].getContext('2d');
		ctx.save();
		ctx.clearRect(0, 0, spriteW, spriteH);
		ctx.beginPath();
		ctx.arc(spriteW * 0.5, spriteH * 0.5, radius, 0, 2 * Math.PI, false);
		ctx.closePath();
		if (radius > 2 || colorMode === 'Categorical') {
			ctx.globalAlpha = 0.3;
			ctx.strokeStyle = 'black';
			ctx.lineWidth = lineW;
			ctx.stroke();
		}
		ctx.restore();
		contexts[i] = ctx;
	}
	// fill the sprites that have a palette
	// note the prefix decrement to skip index zero
	i = palette.length;
	while (--i) {
		let ctx = contexts[i];
		ctx.save();
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = palette[i];
		ctx.fill();
		ctx.restore();
	}

	return { palette, sprites };
}

function sortByAxes(xData, yData, cIdx, width, height) {
	// Note that at this point:
	// - x contains integer values between (0, width)
	// - y contains integer values between (0, height)
	// - cIdx contains integer values between zero and (0, 256)
	//   (in fact, the x/y ranges are even narrower due to x- and y-margins)
	//
	// We can compress this into one integer sort value,
	// which in turn simplifies the comparator from:
	//
	// indices.sort((a, b) => {
	// 	return (
	// 		!(cIdx[a] && cIdx[b]) ? cIdx[a] - cIdx[b] : // sort zero-values for colour
	// 			y[a] < y[b] ? -1 : y[a] > y[b] ? 1 : //by y-axis
	// 				x[a] < x[b] ? -1 : x[a] > x[b] ? 1 : // x-axis
	// 					a - b // and as a last resort: actual value
	// 	);
	// });
	//
	// Yes, I benchmarked it, and t's faster (on my laptop). Beter cache coherence I guess.

	// I'm betting on truncating being faster inside internal conversion
	let x = Uint16Array.from(xData);
	let y = Uint16Array.from(yData);
	const l = cIdx.length, zeroVal = width * height;
	let i = l,
		indices = new Uint32Array(l),
		compVal = new Uint32Array(l);

	while (i--) {
		indices[i] = i;
		// - by making y the bigger value, we effectively
		// sort by y first and by x second.
		// - zeroVal: no need to sort zero values by x and y,
		// so making them all identical should make this faster
		// in situations where most color values are zero.
		if (cIdx[i]){
			compVal[i] = y[i] * width + x[i];
		}
	}


	indices.sort((a, b) => {
		return compVal[a] - compVal[b];
		//return cval ? cval : a - b;
	});

	// we can re-use x and y this way, reduce GC pressure a bit
	let _cIdx = Uint16Array.from(cIdx);

	// loop unrolling. Yes, like in C. Yes, it's disgusting
	i = l;
	while(i-16 > 0){
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
		cIdx[--i] = _cIdx[indices[i]];
	}
	while (i--) {
		cIdx[i] = _cIdx[indices[i]];
	}
	xData = _cIdx;

	i = l;
	while(i-16 > 0){
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
		xData[--i] = x[indices[i]];
	}
	while (i--) {
		xData[i] = x[indices[i]];
	}
	yData = x;

	i = l;
	while (i-16 > 0){
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
		yData[--i] = y[indices[i]];
	}
	while (i--) {
		yData[i] = y[indices[i]];
	}

	return { xData, yData, cIdx };
}