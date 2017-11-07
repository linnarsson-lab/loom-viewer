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
		// ==   Create both to Uint32 Arrays and sprites   ==
		// ==================================================
		const renderedSprites = prepareSprites(colorMode, spriteLayout);

		// ======================================================
		// == Convert color data to lookup indices for sprites ==
		// ======================================================

		let { cIdx } = convertColorData(colorAttr, indices, dataToIdx);

		// =====================================
		// == Convert x, y to pixel positions ==
		// =====================================

		// Avoid accidentally mutating source arrays.
		// Arrays of (indexed) strings are converted to
		// numerical arrays representing the twenty most
		// common strings as categories, plus one "other"
		// for all remaining values
		let xy = convertCoordinates(xAttr, yAttr, indices, spriteLayout, settings);

		// ==============================
		// == Sort for tiling purposes ==
		// ==============================

		// Sort so that we render zero values first, and then from back-to-front.
		// This has to be done after jittering to maintain the tiling behaviour
		// that is desired.
		const sorted = sortByAxes(xy, cIdx);

		// ============================
		// == blit sprites to canvas ==
		// ============================

		// Now that we converted the coordinates, prepared the sprites
		// and the colour indices to look them up, we can blit them
		// to the canvas.
		blitSprites(context, xy, cIdx, spriteLayout, sorted, renderedSprites);

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
		const randomness = rndNormArray(i << 1);
		while (i--) {
			const r = randomness[(i << 1) + 1];
			const t = TAU * randomness[i << 1];
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
	let spriteData = new Array(sprites.length),
		spriteData32 = new Array(sprites.length);

	// sprite dimensions and line thickness
	const spriteW = sprites[0].width,
		spriteH = sprites[0].height,
		lineW = constrain(radius / 10, 0.125, 0.5);

	// first circle is always the empty circle
	let zeroSprite = sprites[0],
		ctx0 = zeroSprite.getContext('2d');
	emptyCircle(ctx0, radius, spriteW, spriteH, lineW);
	const zeroSprite32 = new Uint32Array(ctx0.getImageData(0, 0, spriteW, spriteH).data.buffer);

	spriteData[0] = zeroSprite;
	spriteData32[0] = zeroSprite32;

	// reset all sprites with a palette
	// note the prefix decrement to skip index zero
	for (let i = 1; i < palette.length; i++) {
		let sprite = sprites[i];
		let ctx = sprite.getContext('2d');
		fillCircle(ctx, palette[i]);
		emptyCircle(ctx, radius, spriteW, spriteH, lineW);
		spriteData[i] = sprite;
		spriteData32[i] = new Uint32Array(ctx.getImageData(0, 0, spriteW, spriteH).data.buffer);
	}

	// all circles outside of our palette are empty too
	for (let i = palette.length; i < sprites.length; i++) {
		// let ctx = sprites[i].getContext('2d');
		// just copy the zero sprite, which is faster
		// ctx.drawImage(sprite0, 0, 0);
		spriteData[i] = zeroSprite;// ctx.getImageData(0, 0, spriteW, spriteH);
		spriteData32[i] = zeroSprite32;
	}

	return {
		spriteData,
		spriteData32,
		zeroSprite,
		zeroSprite32,
	};
}

function emptyCircle(ctx, radius, spriteW, spriteH, lineW) {
	ctx.clearRect(0, 0, spriteW, spriteH);
	ctx.beginPath();
	ctx.arc(spriteW * 0.5, spriteH * 0.5, radius, 0, 2 * Math.PI, false);
	ctx.closePath();
	ctx.strokeStyle = 'black';
	ctx.lineWidth = lineW;
	ctx.stroke();
	return ctx;
}

function fillCircle(ctx, fillColor) {
	ctx.fillStyle = fillColor;
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

function sortByAxes(xy, cIdx) {

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
		let val = xy[i];
		if (cIdx[i]) {
			// We need to invert y values, because they are stored
			// with zero at the bottom, max at the top, while
			// canvas is oriented in the opposite way.
			// Set the most significant bit to ensure non-zero values
			// go to the end of the array. (we assume that all
			// y-values are smaller than 0x7FFF, or 32767 pixels)
			compVal[i] = 0xFFFF0000 - val;
		} else {
			// We still sort zero values by x and y; radix sort is constant
			// time anyway, and it might be _slightly_ more cache
			// friendly when copying sprite data to the imageData array
			compVal[i] = 0x7FFF0000 - val;
			zeros++;
		}
	}

	let sortedIndices = sortedUint32Indices(compVal);
	return {
		sortedIndices,
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

/**
 * Sorts input by coerced unsigned 32 bit values, that is: `value & 0xFFFFFFFF`.
 * Returns original values.
 * @param {number[]} input
 */
function sortLower32Bits(input) {
	const length = input.length;
	// Regarding Float64Array: abandon all hope, ye who enter here
	// It would only be selected if we have more than 10e9 cells.
	// At that point, the browser tab probably freezes.
	let arrayConstr = length < (1 << 16) ?
			Uint16Array :
			length < 0x100000000 ?
				Uint32Array :
				Float64Array,
		count1 = new arrayConstr(256),
		count2 = new arrayConstr(256),
		count3 = new arrayConstr(256),
		count4 = new arrayConstr(256),
		count = [count1, count2, count3, count4];

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

	// Make sure we use the same array type as input
	let buffer = new (Object.getPrototypeOf(input).constructor)(input.length);

	for (let i = 0; i < length; i++) {
		let val = input[i];
		buffer[count1[val & 0xFF]++] = val;
	}
	for (let i = 0; i < length; i++) {
		let val = buffer[i];
		input[count2[(val >>> 8) & 0xFF]++] = val;
	}
	for (let i = 0; i < length; i++) {
		let val = input[i];
		buffer[count3[(val >>> 16) & 0xFF]++] = val;
	}
	for (let i = 0; i < length; i++) {
		let val = buffer[i];
		input[count4[(val >>> 24) & 0xFF]++] = val;
	}

	return input;
}


function blitSprites(context, xy, cIdx, spriteLayout, sorted, renderedSprites) {
	let {
		sortedIndices,
		zeros,
	} = sorted;

	const {
		x,
		y,
		height,
		spriteRadius,
	} = spriteLayout;

	const {
		width,
	} = context;

	const {
		zeroSprite,
		zeroSprite32,
		spriteData32,
	} = renderedSprites;

	const spriteW = zeroSprite.width,
		spriteH = zeroSprite.height;

	const canvasData = context.createImageData(width, context.height),
		cDataUint32 = new Uint32Array(canvasData.data.buffer);
	// set pixel values in canvas image data to white
	cDataUint32.fill(0xFFFFFFFF);

	let _xy = 0,
		_x = 0,
		_y = 0;


	// draw zero values first
	for (let i = 0; i < zeros; i++) {
		_xy = xy[sortedIndices[i]];
		_x = x + (_xy & 0xFFFF) - spriteRadius | 0;
		_y = y + (height - (_xy >>> 16)) - spriteRadius | 0;
		drawImgData(zeroSprite32, cDataUint32, _x, _y, spriteW, spriteH, width);
	}
	for (let i = zeros; i < xy.length; i++) {
		const idx = sortedIndices[i];
		_xy = xy[idx];
		_x = x + (_xy & 0xFFFF) - spriteRadius | 0;
		_y = y + (height - (_xy >>> 16)) - spriteRadius | 0;
		drawImgData(spriteData32[cIdx[idx]], cDataUint32, _x, _y, spriteW, spriteH, width);
		// context.drawImage(sortedSpriteData[i], _x, _y);
	}

	// put imagedata back on the canvas
	drawData(context, canvasData);
}

function drawData(context, canvasData) {
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
function drawImgDataLE(spriteData32, cData32, x, y, imgW, imgH, tW) {
	// all of our sprites are in-bounds
	// if (x+imgW > 0 && x+imgW < tW && y+imgH > 0 && y+imgH < tH)

	imgH = imgH | 0;
	imgW = imgW | 0;
	let sy = 0, // sprite y
		cy = 0, // canvas y
		sp = 0, // sprite pixel
		cp = 0; // canvas pixel

	for (let yi = 0; yi < imgH; yi++) {
		sy = yi * imgW;
		cy = (yi + y) * tW;
		for (let xi = 0; xi < imgW; xi++) {

			sp = spriteData32[xi + sy];
			// skip transparent pixels.
			if ((sp >>> 24) > 0) {
				// alpha is a byte, so in the range [0,256).
				// We introduce a tiny bias towards the newer pixel,
				// to replace /255 with /256, which can be written as
				// >>8, which is faster
				ca = 0x100 - ++sa;
				// canvas pixel
				cp = cData32[x + xi + cy];
				cData32[x + xi + cy] = ((
					(
						(cp & 0xFF0000) * ca +
						(sp & 0xFF0000) * sa & 0xFF000000
					) + (
						(cp & 0xFF00) * ca +
						(sp & 0xFF00) * sa & 0xFF0000
					) + (
						(cp & 0xFF) * ca +
						(sp & 0xFF) * sa & 0xFF00
					)) >>> 8) + 0xFF000000;
			}
		}
	}
}

// optimised for Big Endian layout
function drawImgDataBE(spriteData32, cData32, x, y, imgW, imgH, tW) {
	// all of our sprites are in-bounds
	// if (x+imgW > 0 && x+imgW < tW && y+imgH > 0 && y+imgH < tH)

	imgH = imgH | 0;
	imgW = imgW | 0;
	for (let yi = 0; yi < imgH; yi++) {
		for (let xi = 0; xi < imgW; xi++) {

			// sprite pixel
			let sp = spriteData32[xi + yi * imgW],
				// sprite alpha
				sa = sp & 0xFF;
			// skip transparent pixels.
			if (sa === 0) {
				continue;
			}
			// alpha is a byte, so in the range [0,256).
			// We introduce a tiny bias towards the newer pixel,
			// to replace /255 with /256, which can be written as
			// >>8, which is faster
			const ca = 0x100 - ++sa;

			// canvas Idx, canvas pixel
			let cIdx = x + xi + (yi + y) * tW,
				cp = cData32[cIdx];

			cData32[cIdx] =
				(
					(
						// we do the 0xFF000000 separately to avoid integer overflow
						(cp & 0xFF000000 >>> 8) * ca +
						(sp & 0xFF000000 >>> 8) * sa & 0xFF000000
					) +
					((
						(
							(cp & 0xFF0000) * ca +
							(sp & 0xFF0000) * sa & 0xFF000000
						) +
						(
							(cp & 0xFF00) * ca +
							(sp & 0xFF00) * sa & 0xFF0000
						)
					) >>> 8)
				) + 0xFF; // alpha

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