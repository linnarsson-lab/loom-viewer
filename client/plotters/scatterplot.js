import {
	arraySubset,
	attrSubset,
	attrToColorFactory,
	attrToColorIndexFactory,
	clipRange,
	constrain,
	getPalette,
	isLittleEndian,
	logProject,
	logProjectArray,
	nullFunc,
	rndNormArray,
} from 'js/util';

import {
	drawText,
	textSize,
	textStyle,
} from 'plotters/canvas';

// "global" array of sprite canvases.
// Dots will be drawn in later (depends on colour settings)
// Multiple radii; no need to draw a 256x256 image for a 8x8 dot
const {
	allSprites,
} = (() => {
	let i = 257,
		j = 6;
	const allSprites = new Array(j);
	while (j--) {
		i = 257;
		const _sprites = new Array(i);
		while (i--) {
			_sprites[i] = document.createElement('canvas');
			_sprites[i].id = `dot_sprite_${j}_${i}`;
			_sprites[i].width = 4 << j;
			_sprites[i].height = 4 << j;
		}
		allSprites[j] = _sprites;
	}
	return {
		allSprites,
	};
})();

const { log2 } = Math;

export function scatterPlot(attrs, indices, settings) {
	// only render if all required settings are supplied
	if (!(indices && settings)) {
		return nullFunc;
	}

	const xAttr = attrs[settings.x.attr],
		yAttr = attrs[settings.y.attr],
		colorAttr = attrs[settings.colorAttr];

	// only render if all required data is supplied
	if (!(xAttr && yAttr && colorAttr && indices)) {
		return nullFunc;
	}

	let {
		colorMode,
	} = settings;
	const dataToIdx = attrToColorIndexFactory(colorAttr, colorMode, settings);

	return (context) => {
		context.save();

		// Erase previous paint
		context.clearRect(0, 0, context.width, context.height);

		const {
			spriteLayout,
			labelLayout,
		} = calcLayout(context, settings);

		// ==================================================
		// == Prepare Palette & pre-render dots to sprites ==
		// ==================================================
		const imgData = prepareSprites(colorMode, spriteLayout);

		// =====================================
		// == Convert x, y to pixel positions ==
		// =====================================

		// Avoid accidentally mutating source arrays.
		// Arrays of (indexed) strings are converted to
		// numerical arrays representing the twenty most
		// common strings as categories, plus one "other"
		// for all remaining values
		let xy = convertCoordinates(xAttr, yAttr, indices, spriteLayout, settings);
		// ======================================================
		// == Convert color data to lookup indices for sprites ==
		// ======================================================

		let { cIdx } = convertColorData(colorAttr, indices, dataToIdx);

		// ==============================
		// == Sort for tiling purposes ==
		// ==============================

		// Sort so that we render zero values first, and then from back-to-front.
		// This has to be done after jittering to maintain the tiling behaviour
		// that is desired.
		const sorted = sortByAxes(xy, cIdx, imgData);

		// ============================
		// == blit sprites to canvas ==
		// ============================

		// Now that we converted the coordinates, prepared the sprites
		// and the colour indices to look them up, we can blit them
		// to the canvas.
		blitSprites(context, spriteLayout, sorted, imgData);

		// =================
		// == draw labels ==
		// =================

		drawLabels(context, xAttr, yAttr, colorAttr, labelLayout);

		// Heatmap scale, if necessary
		if (colorMode === 'Heatmap') {
			drawHeatmapScale(context, colorAttr, labelLayout, colorMode, settings);
		}

		context.restore();
	};
}

function calcLayout(context, settings) {
	const {
		min, sqrt,
	} = Math;
	const scaleFactor = settings.scaleFactor || 50;

	let {
		width, height, pixelRatio,
	} = context;
	const shortEdge = min(width, height);

	// Suitable radius of the markers
	// - smaller canvas size -> smaller points
	let radius = log2(shortEdge) * scaleFactor / 50 * pixelRatio | 0;
	radius = constrain(radius, 1, 62);

	let spriteIdx = 0,
		spriteRadius = 2;
	while (spriteRadius < radius + 1) {
		spriteIdx++;
		spriteRadius = 2 << spriteIdx;
	}
	const sprites = allSprites[spriteIdx];

	let labelTextSize = constrain(sqrt(shortEdge), 12, 64) * pixelRatio * 0.75 | 0;
	let labelMargin = (labelTextSize * 1.8) | 0;

	const spriteLayout = {
		x: labelMargin,
		y: 0,
		width: width - labelMargin - radius * 2,
		height: height - labelMargin - radius * 2,
		radius,
		spriteRadius,
		sprites,
	};

	const xLabel = {
		x: labelMargin * 1.5 | 0,
		y: height - labelTextSize | 0,
	};
	// yLabel will be translated and rotated so (x,y) origin
	// will point to lower left
	const yLabel = {
		x: labelMargin * 1.5 | 0,
		y: labelTextSize | 0,
	};

	const gradientSize = constrain(shortEdge / 10, 16, 256 * context.pixelRatio) | 0;
	const labelOffset = labelTextSize * 3 | 0;

	const colorLabel = {
		x: (width - gradientSize - labelOffset) | 0,
		y: height - labelTextSize | 0,
		gradientSize,
		width: 0, // width of heatmap scale, if plotted
	};

	return {
		spriteLayout,
		labelLayout: {
			labelTextSize,
			xLabel,
			yLabel,
			colorLabel,
		},
	};
}

function convertCoordinates(xAttr, yAttr, indices, spriteLayout, settings) {
	// For small value ranges (happens with PCA a lot),
	// jittering needs to be scaled down
	let xDelta = xAttr.max - xAttr.min,
		xJitter = 1,
		yDelta = yAttr.max - yAttr.min,
		yJitter = 1;

	if (xDelta / xJitter < 8) {
		xJitter = ((log2(xDelta) * 8) | 0) / 32;
	}
	if (yDelta / yJitter < 8) {
		yJitter = ((log2(yDelta) * 8) | 0) / 32;
	}

	// If we have an string array, convert it
	// to numbers as a form of categorization.
	// Similarly, if we need to jitter the data
	// we must ensure the data array is a floating
	// point typed array, not an integer array.
	let xData = convertAttr(xAttr, indices, settings.x.jitter);
	let yData = convertAttr(yAttr, indices, settings.y.jitter);
	// Jitter if requested
	maybeJitterData(xData, yData, settings, xJitter, yJitter);
	// Scale to screen dimensions with margins
	return scaleToContext(xData, yData, xAttr, yAttr, spriteLayout, settings);
}

function convertAttr(attr, indices, jitter) {
	// In practice, having text data that is not indexed
	// only happens if all strings are unique,
	// so it's kind of pointless
	if (attr.arrayType === 'string' && !attr.indexedVal) {
		let i = indices.length;
		let retVal = new Float32Array(i);
		while (i--) {
			retVal[i] = indices[i] + 1;
		}
		return retVal;
	}
	// If we jitter later, we need to return a float32,
	// Otherwise we can keep the more compact typed arrays
	// if our data is integers
	const convertedType = jitter ? 'float32' : attr.arrayType;
	return arraySubset(attr.data, convertedType, indices);
}

function maybeJitterData(xData, yData, settings, xJitter, yJitter) {
	const {
		PI, sin, cos,
	} = Math;
	const TAU = 2 * PI;
	let i = xData.length;
	if (settings.x.jitter && settings.y.jitter) {
		// if jittering both axes, do so in a
		// circle around the data
		const randomness = rndNormArray(i<<1);
		while (i--) {
			const r = randomness[(i<<1) + 1];
			const t = TAU *randomness[i<<1];
			xData[i] += xJitter * r * sin(t);
			yData[i] += yJitter * r * cos(t);
		}
	} else if (settings.x.jitter) {
		const randomness = rndNormArray(i);
		while (i--) {
			xData[i] += xJitter * randomness[i];
		}
	} else if (settings.y.jitter) {
		const randomness = rndNormArray(i);
		while (i--) {
			yData[i] += yJitter * randomness[i];
		}
	}
}

// returns a uint32 array `xy` that contains y and x bitpacked into it,
// as `((y & 0xFFFF)<<16) + (x & 0xFFFF)`. Supposedly faster than using
// separate uint16 arrays. Also sorts a bit quicker.
function scaleToContext(xData, yData, xAttr, yAttr, spriteLayout, settings) {
	let xMin = xAttr.min,
		xMax = xAttr.max,
		yMin = yAttr.min,
		yMax = yAttr.max;

	if (settings.x.logScale) {
		logProjectArray(xData);
		xMin = logProject(xMin);
		xMax = logProject(xMax);
	}
	if (settings.y.logScale) {
		logProjectArray(yData);
		yMin = logProject(yMin);
		yMax = logProject(yMax);
	}

	const xMargin = (xMax - xMin) * 0.0625;
	const yMargin = (yMax - yMin) * 0.0625;

	let xy = new Uint32Array(xData.length);
	// we add xMargin/yMargin in the divisor here
	// (and compensate further on with 0.5) to
	// *also* add a margin *before* the normalization.
	// We also subtract the radius to avoid any points
	// from going over the edge of the canvas.
	const {
		width, height, radius,
	} = spriteLayout;
	let xScale = ((width - 4 * radius)) / (xMax - xMin + xMargin);
	let yScale = ((height - 4 * radius)) / (yMax - yMin + yMargin);
	let i = xData.length;
	while (i--) {
		let x = (xData[i] - xMin + 0.5 * xMargin) * xScale + 2 * radius;
		let y = (yData[i] - yMin + 0.5 * yMargin) * yScale + 2 * radius;
		// packing x and y into one 32-bit integer is currently faster
		// than using two arrays. As long as our screen dimension do
		// not exceed 65k pixels in either dimension we should be fine
		xy[i] = ((y & 0xFFFF) << 16) + (x & 0xFFFF);
	}
	return xy;
}

function convertColorData(colorAttr, indices, dataToIdx) {
	const colData = attrSubset(colorAttr, indices);
	// Largest palettes are 256 entries in size,
	// so we can safely Uint8Array for cIdx
	let cIdx = new Uint8Array(colData.length);
	let i = cIdx.length;
	while (i--) {
		cIdx[i] = dataToIdx(colData[i]);
	}
	return { cIdx };
}

function prepareSprites(colorMode, spriteLayout) {
	const {
		radius,
		sprites,
	} = spriteLayout;

	const palette = getPalette(colorMode);
	let imgData = new Array(sprites.length);

	// sprite dimensions and line thickness
	const spriteW = sprites[0].width,
		spriteH = sprites[0].height,
		lineW = constrain(radius / 10, 0.125, 0.5);

	// first circle is always the empty circle
	let sprite0 = sprites[0],
		ctx0 = sprite0.getContext('2d');
	emptyCircle(ctx0, radius, spriteW, spriteH, lineW);
	imgData[0] = ctx0.getImageData(0, 0, spriteW, spriteH).data;

	// reset all sprites with a palette
	// note the prefix decrement to skip index zero
	for (let i = 1; i < palette.length; i++) {
		let ctx = sprites[i].getContext('2d');
		emptyCircle(ctx, radius, spriteW, spriteH, lineW);
		fillCircle(ctx, palette[i]);
		imgData[i] = ctx.getImageData(0, 0, spriteW, spriteH).data;
	}

	// all circles outside of our palette are empty too
	for (let i = palette.length; i < sprites.length; i++) {
		// let ctx = sprites[i].getContext('2d');
		// just copy the zero sprite, which is faster
		// ctx.drawImage(sprite0, 0, 0);
		imgData[i] = imgData[0];// ctx.getImageData(0, 0, spriteW, spriteH);
	}

	return imgData;
}

function emptyCircle(ctx, radius, spriteW, spriteH, lineW) {
	ctx.clearRect(0, 0, spriteW, spriteH);
	ctx.beginPath();
	ctx.arc(spriteW * 0.5, spriteH * 0.5, radius, 0, 2 * Math.PI, false);
	ctx.closePath();
	ctx.globalAlpha = 0.25;
	ctx.strokeStyle = 'black';
	ctx.lineWidth = lineW;
	ctx.stroke();
	return ctx;
}

function fillCircle(ctx, fillColor) {
	ctx.fillStyle = fillColor;
	ctx.globalAlpha = 0.5;
	ctx.fill();
}

// Turns out tSNE almost never overlaps, even with rounding to pixels.
//
// Given a transparency level (0 = transparent, 255 = opaque), it makes no
// sense to draw sprites on the same spot if the bottom ones are not even
// visible. This is a look-up table to determine how many layers of stacked
// sprites will be visible at most.
// const cullSprites = [0, 255, 191, 155, 132, 116, 103, 93, 85, 79, 73, 69, 64, 61, 58, 55, 52, 51, 48, 46, 44, 43, 41, 40, 38, 37, 36, 35, 34, 33, 32, 31, 30, 30, 29, 28, 28, 26, 26, 26, 25, 25, 25, 24, 23, 23, 22, 22, 22, 21, 21, 21, 20, 20, 19, 19, 18, 18, 18, 18, 18, 17, 17, 17, 16, 16, 16, 16, 15, 15, 15, 15, 15, 14, 14, 14, 14, 14, 14, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1];
// // For our current lowest alpha of 0.3125 (79),
// // we need to draw at most 13 sprites).
// const maxVisibleStack = cullSprites[0.5 * 256 | 0];

function sortByAxes(xy, cIdx, imgData) {

	// Note that at this point xy contains the x,y coordinates
	// packed as 0x YYYY XXXX, so sorting by that value
	// automatically sorts by Y first, X second
	// However, we want to draw the zero-values underneath the
	// non-zero values, so we make a copy of this array
	// with 0x7FFFFFFF if cIdx is zero, and sort by that copy.
	// (we want zero values at the end because we use while(i--)
	// instead of for loops as a micro-optimization)
	const l = cIdx.length;
	let i = l,
		zeros = 0,
		compVal = new Uint32Array(l);
	while (i--) {
		compVal[i] = xy[i];
		// if zero-value, we set the most significant bit  to ensure
		// zero values go to the end of the array. (we assume that all
		// y-values are smaller than 0x7FFF, or 32767 pixels)
		// We still sort them by x and y; radix sort is constant
		// time anyway, and it might be _slightly_ more cache
		// friendly when copying sprite data to the imageData array
		if (!cIdx[i]) {
			compVal[i] |= 0x80000000;
			zeros++;
		}
	}

	let indices = sortedUint32Indices(compVal);

	// skip zero-values; no need to copy their sprite
	// since we draw all of them at once later
	i = l - zeros;

	// loop unrolling.
	// Yes, like in C.
	// Yes, it's disgusting.
	// Yes, it actually is benchmarked as being faster (at the time of writing)
	let spriteImgData = new Array(i);
	while (i - 16 > 0) {
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
		spriteImgData[--i] = imgData[cIdx[indices[i]]];
	}
	while (i--) {
		spriteImgData[i] = imgData[cIdx[indices[i]]];
	}

	let _xy = xy;
	xy = compVal; // re-use compVal to reduce GC pressure a bit
	i = l;
	while (i - 16 > 0) {
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
		xy[--i] = _xy[indices[i]];
	}
	while (i--) {
		xy[i] = _xy[indices[i]];
	}

	return {
		xy,
		spriteImgData,
		zeros,
	};
}

/**
 * Returns the sorted indices for an array of Uint32 values. 
 * "Works" on all arrays, but incorrect values will be sorted by their coerced
 * unsigned 32-bit integer equivalent, that is: `value & 0xFFFFFFFF`.
 * @param {number[]} input
 */
function sortedUint32Indices(input) {
	const length = input.length;
	let arrayConstr = length < (1 << 16) ? Uint16Array : Uint32Array,
		count1 = new arrayConstr(256),
		count2 = new arrayConstr(256),
		count3 = new arrayConstr(256),
		count4 = new arrayConstr(256),
		count = [count1, count2, count3, count4],
		indices = new arrayConstr(length),
		indices2 = new arrayConstr(length);

	for (let i = 0; i < length; i++) {
		indices[i] = i;
	}

	// count all bytes in one pass
	for (let i = 0; i < length; i++) {
		let val = input[i];
		count1[val & 0xFF]++;
		count2[(val >>> 8) & 0xFF]++;
		count3[(val >>> 16) & 0xFF]++;
		count4[(val >>> 24) & 0xFF]++;
	}

	// convert count to sum of previous counts
	// this lets us directly copy values to their
	// correct position later
	for (let j = 0; j < 4; j++) {
		let t = 0,
			sum = 0,
			_count = count[j];
		for (let i = 0; i < 256; i++) {
			t = _count[i];
			_count[i] = sum;
			sum += t;
		}
	}

	for (let i = 0; i < length; i++) {
		let j = indices[i];
		let val = input[j];
		indices2[count1[val & 0xFF]++] = j;
	}
	for (let i = 0; i < length; i++) {
		let j = indices2[i];
		let val = input[j];
		indices[count2[(val >>> 8) & 0xFF]++] = j;
	}
	for (let i = 0; i < length; i++) {
		let j = indices[i];
		let val = input[j];
		indices2[count3[(val >>> 16) & 0xFF]++] = j;
	}
	for (let i = 0; i < length; i++) {
		let j = indices2[i];
		let val = input[j];
		indices[count4[(val >>> 24) & 0xFF]++] = j;
	}

	return indices;
}

function blitSprites(context, spriteLayout, sorted, imgData) {
	let {
		spriteImgData,
		zeros,
		xy,
	} = sorted;

	const {
		x,
		y,
		height,
		sprites,
		spriteRadius,
	} = spriteLayout;

	const {
		width,
	} = context;

	const spriteW = sprites[0].width,
		spriteH = sprites[0].height;
	const canvasData = context.getImageData(0, 0, width, context.height),
		cData = canvasData.data;

	// set pixel values in canvas image data to white
	cData.fill(255);

	let zeroSprite = imgData[0],
		_xy = 0,
		_x = 0,
		_y = 0,
		i = xy.length;

	// draw zero values first
	while (i-- > xy.length-zeros) {
		_xy = xy[i];
		_x = x + (_xy & 0xFFFF) - spriteRadius | 0;
		_y = y + (height - (_xy >>> 16)) - spriteRadius | 0;
		drawImgData(zeroSprite, cData, _x, _y, spriteW, spriteH, width);
	}
	while (i--) {
		_xy = xy[i];
		_x = x + (_xy & 0xFFFF) - spriteRadius | 0;
		_y = y + (height - (_xy >>> 16)) - spriteRadius | 0;
		drawImgData(spriteImgData[i], cData, _x, _y, spriteW, spriteH, width);
		// context.drawImage(spriteImgData[i], _x, _y);
	}

	// put imagedata back on the canvas
	context.putImageData(canvasData, 0, 0);
}

function drawLabels(context, xAttr, yAttr, colorAttr, labelLayout) {
	const {
		labelTextSize, xLabel, yLabel, colorLabel,
	} = labelLayout;
	textStyle(context);
	textSize(context, labelTextSize);

	// X attribute name
	drawText(context, xAttr.name, xLabel.x, xLabel.y);

	// Y attribute name
	context.translate(0, context.height);
	context.rotate(-Math.PI / 2);
	drawText(context, yAttr.name, yLabel.x, yLabel.y);
	context.rotate(Math.PI / 2);
	context.translate(0, -context.height);

	// Color attribute name
	context.textAlign = 'end';
	drawText(context, colorAttr.name, colorLabel.x - labelTextSize * 6 - 5 | 0, colorLabel.y);
	context.textAlign = 'start';
}

const drawImgData = isLittleEndian ?
	drawImgDataLE :
	drawImgDataBE;

// Optimised for Little Endian layout
function drawImgDataLE(imgData, tData, x, y, imgW, imgH, tW) {
	// all of our sprites are in-bounds
	// if (x+imgW > 0 && x+imgW < tW && y+imgH > 0 && y+imgH < tH)

	// Use 32-bit views (faster than 4x 8-bit array access)
	const imgData32 = new Uint32Array(imgData.buffer);
	const tData32 = new Uint32Array(tData.buffer);
	for (let yi = 0; yi < imgH; yi++) {
		for (let xi = 0; xi < imgW; xi++) {

			let imgIdx = xi + yi * imgW;

			let ci = imgData32[imgIdx],
				ai = ci & 0xFF000000;
			// skip transparent pixels.
			if (ai === 0) {
				continue;
			}
			let tIdx = x + xi + (yi + y) * tW,
				ct = tData32[tIdx];
			// alpha is a byte, so in the range [0,256).
			// We introduce a tiny bias towards the newer pixel,
			// to replace /255 with /256, which can be written as
			// >>8, which is faster
			ai = (ai >>> 24) + 1;
			const at = 256 - ai;
			tData32[tIdx] =
				0xFF000000 +
				// RGB
				((ct & 0xFF0000) * at + (ci & 0xFF0000) * ai >>> 8 & 0xFF0000) +
				((ct & 0xFF00) * at + (ci & 0xFF00) * ai >>> 8 & 0xFF00) +
				((ct & 0xFF) * at + (ci & 0xFF) * ai >>> 8 & 0xFF);
		}
	}
}

// optimised for Big Endian layout
function drawImgDataBE(imgData, tData, x, y, imgW, imgH, tW) {
	// all of our sprites are in-bounds
	// if (x+imgW > 0 && x+imgW < tW && y+imgH > 0 && y+imgH < tH)

	// Use 32-bit views (faster than 4x 8-bit array access)
	const imgData32 = new Uint32Array(imgData.buffer);
	const tData32 = new Uint32Array(tData.buffer);
	for (let yi = 0; yi < imgH; yi++) {
		for (let xi = 0; xi < imgW; xi++) {

			let imgIdx = xi + yi * imgW;

			let ci = imgData32[imgIdx],
				ai = ci & 0xFF;
			// skip transparent pixels.
			if (ai === 0) {
				continue;
			}

			let tIdx = x + xi + (yi + y) * tW,
				ct = tData32[tIdx];
			// alpha is a byte, so in the range [0,256).
			// We introduce a tiny bias towards the newer pixel,
			// to replace /255 with /256, which can be written as
			// >>8, which is faster
			const at = 256 - ++ai;

			tData32[tIdx] =
				// alpha
				0xFF +
				// RGB
				((ct & 0xFF000000) * at + (ci & 0xFF000000) * ai >>> 8 & 0xFF000000) +
				((ct & 0xFF0000) * at + (ci & 0xFF0000) * ai >>> 8 & 0xFF0000) +
				((ct & 0xFF00) * at + (ci & 0xFF00) * ai >>> 8 & 0xFF00);
		}
	}
}


function drawHeatmapScale(context, colorAttr, labelLayout, colorMode, settings) {
	const {
		min, max,
	} = colorAttr;
	const { labelTextSize } = labelLayout;
	const {
		x, y, gradientSize,
	} = labelLayout.colorLabel;
	const { pixelRatio } = context;

	// label for min value
	const lblMin = min !== (min | 0) ? min.toExponential(2) : min | 0;
	context.textAlign = 'end';
	drawText(context, lblMin, (x - 5) | 0, y);

	// label for max value
	const lblMax = max !== (max | 0) ? max.toExponential(2) : max | 0;
	context.textAlign = 'start';
	drawText(context, lblMax, (x + gradientSize + 5) | 0, y);

	// border for colour gradient
	const cY = (y - labelTextSize) | 0;
	context.fillRect(
		x - pixelRatio,
		cY - pixelRatio,
		gradientSize + 2 * pixelRatio,
		labelTextSize * 1.25 + 2 * pixelRatio
	);

	const range = clipRange(colorAttr, settings);
	const cDelta = colorAttr.max - colorAttr.min;
	// draw clipping points, if required
	if (range.min !== range.clipMin) {
		const clipMin = settings.logScale ? Math.pow(2, range.clipMin) : range.clipMin;
		const clipMinX = ((clipMin - range.min) * gradientSize / cDelta) | 0;
		context.fillRect(
			x + clipMinX,
			cY - pixelRatio * 3,
			pixelRatio | 0,
			labelTextSize * 1.25 + 6 * pixelRatio | 0
		);
	}
	if (range.max !== range.clipMax) {
		const clipMax = settings.logScale ? Math.pow(2, range.clipMax) : range.clipMax;
		const clipMaxX = ((clipMax - range.min) * gradientSize / cDelta) | 0;
		context.fillRect(
			x + clipMaxX,
			cY - pixelRatio * 3,
			pixelRatio,
			labelTextSize * 1.25 + 6 * pixelRatio | 0
		);
	}
	// colour gradient
	const cScaleFactor = cDelta / gradientSize;
	const valToColor = attrToColorFactory(colorAttr, colorMode, settings);
	let i = gradientSize;
	while (i--) {
		context.fillStyle = valToColor(colorAttr.min + i * cScaleFactor);
		context.fillRect(x + i, cY, 1, labelTextSize * 1.25 | 0);
	}
}