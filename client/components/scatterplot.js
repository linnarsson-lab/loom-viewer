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
		prepareSprites(colorMode, width, height, radius);

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
		let xy = convertCoordinates(x, y, indices, width, height, radius, jitter, logscale);
		let { cIdx } = convertColordata(color, indices, colorMode);

		// ==============================
		// == Sort for tiling purposes ==
		// ==============================

		// Sort so that we render zero values first, and then from back-to-front.
		// This has to be done after jittering to maintain the tiling behaviour
		// that is desired.
		const sorted = sortByAxes(xy, cIdx, width, height);
		let { cSprites, zeros } = sorted;
		xy = sorted.xy;


		// ==================
		// == blit sprites ==
		// ==================
		let i = cSprites.length, zeroSprite = sprites[0], _xy = 0, _x = 0, _y = 0;
		// draw zero values first
		while (i-- && zeros--) {
			_xy = xy[i];
			_x = _xy & 0xFFFF;
			_y = (height - (_xy >>> 16)) | 0;
			context.drawImage(zeroSprite, _x, _y);
		}
		if (i) {
			while (i--) {
				_xy = xy[i];
				_x = _xy & 0xFFFF;
				_y = (height - (_xy >>> 16)) | 0;
				context.drawImage(cSprites[i], _x, _y);
			}
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
	return scaleToContext(xData, yData, xmin, xmax, ymin, ymax, width, height, radius);
}

function maybeStringArray(attr, indices) {
	// realistically, this only happens if all strings are unique,
	// so it's kind of pointless
	if (attr.arrayType === 'string' && !attr.indexedVal) {
		let i = indices.length;
		let retVal = new Float32Array(i);
		while (i--) {
			retVal[i] = indices[i] + 1;
		}
		return retVal;
	}
	return arraySubset(attr.data, 'float32', indices);
}

// returns an uint32 array `xy` that contains y and x bitpacked into it,
// as `((y & 0xFFFF)<<16) + (x & 0xFFFF)`. Supposedly faster
function scaleToContext(xData, yData, xmin, xmax, ymin, ymax, width, height, radius) {
	const xmargin = (xmax - xmin) * 0.0625;
	const yMargin = (ymax - ymin) * 0.0625;
	const l = xData.length;
	let xy = new Uint32Array(l);
	// we add xmargin/ymargin in the divisor here
	// (and compensate further on with 0.5) to
	// *also* add a margin *before* the normalisation.
	// We also subtract the radius to avoid any points
	// from going over the edge of the canvas.
	let xScale = ((width - 4 * radius)) / (xmax - xmin + xmargin);
	let yScale = ((height - 4 * radius)) / (ymax - ymin + yMargin);
	let i = l;
	while (i--) {
		let x = (xData[i] - xmin + 0.5 * xmargin) * xScale + 2 * radius;
		let y = (yData[i] - ymin + 0.5 * yMargin) * yScale + 2 * radius;
		// packing x and y into one 32-bit integer is currently faster
		// than using two arrays. As long as our screen dimension do
		// not exceed 65k pixels in either dimension we should be fine
		xy[i] = ((y & 0xFFFF) << 16) + (x & 0xFFFF);
	}
	return xy;
}

function getPalette(colorMode) {
	switch (colorMode) {
		case 'Heatmap':
			return colorLUT.solar256;
		case 'Heatmap2':
			return colorLUT.YlGnBu256;
		case 'Categorical':
			return colorLUT.category20;
		default:
			return [];
	}
}

function convertColordata(colorAttr, indices, colorMode) {
	let colData = arraySubset(colorAttr.data, colorAttr.arrayType, indices),
		palette = getPalette(colorMode);
	// Largest palettes are 256 entries in size,
	// so we can safely Uint8Array for cIdx
	let cIdx = new Uint8Array(colData.length);
	let i = cIdx.length;
	if (colorMode === 'Categorical') {
		let { colorIndices } = colorAttr;
		while (i--) {
			cIdx[i] = colorIndices.mostFreq[colData[i]] || 0;
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

	let palette = getPalette(colorMode);

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
}

function sortByAxes(xy, cIdx) {
	// Note that at this point xy contains the x,y coordinates
	// packed as 0x YYYY XXXX, so sorting by that value
	// automatically sorts by Y first, X second
	// However, we want to draw the zero-values underneath the
	// non-zero values, so we make a copy of this array
	// with 0 if cIdx is zero, and sort by that copy.

	const l = cIdx.length;
	let i = l,
		zeros = 0,
		indices = new Uint32Array(l),
		compVal = new Uint32Array(l);
	while (i--) {
		indices[i] = i;
		if (cIdx[i]) {
			compVal[i] = xy[i];
		} else {
			compVal[i] = 0xFFFFFFFF;
			zeros++;
		}
	}

	indices.sort((a, b) => {
		return compVal[a] - compVal[b];
	});


	// loop unrolling. Yes, like in C. Yes, it's disgusting
	i = l; // no need to copy sprites for zero values
	let cSprites = new Array(l);
	while (i - 16 > 0) {
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
		cSprites[--i] = sprites[cIdx[indices[i]]];
	}
	while (i--) {
		cSprites[i] = sprites[cIdx[indices[i]]];
	}

	let _xy = xy;
	xy = compVal; // reuse compVal, reduce GC pressure
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

	return { xy, cSprites, zeros };
}