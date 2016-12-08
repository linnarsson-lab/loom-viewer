import * as colorLUT from '../js/colors';
import { arrayConstr, rndNorm } from '../js/util';

// "global" array of sprite canvases
const { sprites, contexts } = (() => {
	const sprites = new Array(257), contexts = new Array(257); // ibg
	for (let i = 0; i < sprites.length; i++) {
		sprites[i] = document.createElement('canvas');
		sprites[i].id = `dot_sprite_${i}`;
		sprites[i].width = 16;
		sprites[i].height = 16;
	}
	return { sprites, contexts };
})();

export function scatterplot(x, y, color, colorMode, logscale, jitter, filterZeros) {
	return (context) => {
		// only render if all required data is supplied
		if (!(x && y && color)) {
			return;
		}

		let { width, height, pixelRatio } = context;
		context.save();

		// Erase previous paint
		context.clearRect(0, 0, width, height);

		// Avoid accidentally mutating source arrays,
		// and make sure we're convert data to floats
		// for the sake of plotting (we optimise storage
		// to the smallest sensible format).
		// Arrays of (indexed) strings are converted to 
		// numerical arrays representing the twenty most
		// common strings as categories, plus "other"
		let { xData, yData, colData,
			xmin, xmax, ymin, ymax } = convertData(x, y, color, filterZeros);

		// Jitter if requested
		if (jitter.x && jitter.y) {
			// if jittering both axes, do so in a
			// circle around the data
			for (let i = 0; i < xData.length; i++) {
				const r = rndNorm();
				const t = Math.PI * 2 * Math.random();
				xData[i] += r * Math.sin(t);
				yData[i] += r * Math.cos(t);
			}
			// rndNorm() returns a range [-0.5, 0.5),
			// so we adjust min/max accordingly
			xmin -= 0.25; xmax += 0.25;
			ymin -= 0.25; ymax += 0.25;
		} else if (jitter.x) {
			for (let i = 0; i < xData.length; i++) {
				xData[i] += rndNorm();
			}
			xmin -= 0.25; xmax += 0.25;
		} else if (jitter.y) {
			for (let i = 0; i < yData.length; i++) {
				yData[i] += rndNorm();
			}
			ymin -= 0.25; ymax += 0.25;
		}



		// Log transform if requested
		if (logscale.x) {
			for (let i = 0; i < xData.length; i++) {
				xData[i] = Math.log2(1 + xData[i]);
			}
			xmin = Math.log2(1 + xmin);
			xmax = Math.log2(1 + xmax);
		}
		if (logscale.y) {
			for (let i = 0; i < yData.length; i++) {
				yData[i] = Math.log2(1 + yData[i]);
			}
			ymin = Math.log2(1 + ymin);
			ymax = Math.log2(1 + ymax);
		}

		let cIdx = new Uint32Array(colData.length);
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

		if (colorMode === 'Categorical') {
			let { colorIndices } = color;
			for (let i = 0; i < cIdx.length; i++) {
				cIdx[i] = colorIndices[colData[i]] | 0;
			}
		} else {
			let { min, max, hasZeros } = color;
			if (hasZeros) {
				min = min < 0 ? min : 0;
			}
			const colorIdxScale = ((palette.length - 1) / (max - min) || 1);
			for (let i = 0; i < cIdx.length; i++) {
				cIdx[i] = ((colData[i] - min) * colorIdxScale) | 0;
			}

		}

		let sorted = sortByAxes(xData, yData, cIdx);
		xData = sorted.x;
		yData = sorted.y;
		cIdx = sorted.c;

		// Suitable radius of the markers
		// - smaller canvas size -> smaller points
		const radius = Math.min(6, (Math.max(1, Math.min(width, height) / 100)) * pixelRatio);

		// Scale to screen dimensions (with margins) and round to pixel position
		let radMargin = 2 * radius;
		let xmargin = (xmax - xmin) * 0.0625;
		let yMargin = (ymax - ymin) * 0.0625;
		// we add xmargin/ymargin in the divisor here (and compensate further on with 0.5)
		// to *also* add a margin *before* the normalisation
		let xScale = ((width - 2 * radMargin)) / (xmax - xmin + xmargin);
		for (let i = 0; i < xData.length; i++) {
			xData[i] = ((xData[i] - xmin + 0.5 * xmargin) * xScale + radMargin);
		}
		let yNorm = 1 / (ymax - ymin + yMargin);
		let yProject = (height - 2 * radMargin);
		for (let i = 0; i < yData.length; i++) {
			yData[i] = ((1 - (yData[i] - ymin + 0.5 * yMargin) * yNorm) * yProject + radMargin);
		}

		const w = sprites[0].width, h = sprites[0].height;
		const lineW = Math.min(0.5, Math.max(0.125, radius / 10));
		// reset all sprites to empty circles
		for (let i = 0; i < sprites.length; i++) {
			contexts[i] = sprites[i].getContext('2d');
			contexts[i].clearRect(0, 0, w, h);
			contexts[i].beginPath();
			contexts[i].arc(w * 0.5, h * 0.5, radius, 0, 2 * Math.PI, false);
			contexts[i].closePath();
			if (radius > 2 || colorMode === 'Categorical') {
				contexts[i].globalAlpha = 0.3;
				contexts[i].strokeStyle = 'black';
				contexts[i].lineWidth = lineW;
				contexts[i].stroke();
			}
		}
		// fill the sprites that have a palette
		for (let i = 1; i < palette.length; i++) {
			contexts[i].globalAlpha = 0.5;
			contexts[i].fillStyle = palette[i];
			contexts[i].fill();
		}

		// blit sprites
		const spriteOffset = (w * 0.5);
		// first the uncoloured values
		for (let i = 0; i < xData.length; i++) {
			if (cIdx[i] === 0) {
				context.drawImage(sprites[cIdx[i]], (xData[i] - spriteOffset) | 0, (yData[i] - spriteOffset) | 0);
			}
		}
		for (let i = 0; i < xData.length; i++) {
			if (cIdx[i]) {
				context.drawImage(sprites[cIdx[i]], (xData[i] - spriteOffset) | 0, (yData[i] - spriteOffset) | 0);
			}
		}

		context.restore();
	};
}

function convertData(x, y, color, filterZeros) {
	let xData = [], yData = [], colData = [];

	// Scale of data
	let xmin = (x.hasZeros && x.min > 0) ? 0 : x.min;
	let xmax = x.max;
	let ymin = (y.hasZeros && y.min > 0) ? 0 : y.min;
	let ymax = y.max;

	x = convertStringArray(x);
	y = convertStringArray(y);


	// Filter out zeroes if requested in the process
	// (this has to happen before log/jitter for
	//  obvious reasons)
	if (!filterZeros.x && !filterZeros.y) {
		xData = Float32Array.from(x);
		yData = Float32Array.from(y);
		colData = color.filteredData.slice(0);
	} else {
		// First extract non-zero values as plain array
		if (filterZeros.x && filterZeros.y) {
			for (let i = 0; i < x.length; i++) {
				if (x[i] && y[i]) {
					xData.push(x[i]);
					yData.push(y[i]);
					colData.push(color.filteredData[i]);
				}
			}
		} else if (filterZeros.x) {
			for (let i = 0; i < x.length; i++) {
				if (x[i]) {
					xData.push(x[i]);
					yData.push(y[i]);
					colData.push(color.filteredData[i]);
				}
			}
		} else { //else filterZeros.y
			for (let i = 0; i < x.length; i++) {
				if (y[i]) {
					xData.push(x[i]);
					yData.push(y[i]);
					colData.push(color.filteredData[i]);
				}
			}
		}
		// Convert to typed array.
		xData = Float32Array.from(xData);
		yData = Float32Array.from(yData);
		let constr = arrayConstr(color.arrayType);
		colData = constr.from(colData);
	}
	return { xData, yData, colData, xmin, xmax, ymin, ymax };
}

function convertStringArray(data) {
	const l = data.filteredData.length;
	let retVal;
	switch (data.arrayType) {
		case 'string':
			if (l < 256) {
				retVal = new Uint8Array(l);
			} else if (l < 65535) {
				retVal = new Uint16Array(l);
			} else {
				retVal = new Uint32Array(l);
			}
			for (let i = 0; i < l; i++) {
				retVal[i] = i + 1;
			}
			return retVal;
		case 'indexedString':
			retVal = new Uint8Array(l);
			for (let i = 0; i < l; i++) {
				retVal[i] = data.colorIndices[data.filteredData[i]] | 0;
				if (retVal[i] > 20) { retVal[i] = 0; }
			}
			return retVal;
		default:
			return data.filteredData;
	}
}


function sortByAxes(xData, yData, cIdx) {
	let indices = new Uint32Array(cIdx.length), i;
	for (i = 0; i < cIdx.length; i++) {
		indices[i] = i;
	}

	// sort by x, then by y, so that we render zero values first, 
	// and then from back-to-front. This has to be done after
	// jittering to maintain the tiling behaviour that is desired.
	indices.sort((a, b) => {
		return (
			yData[a] < yData[b] ? 1 : yData[a] > yData[b] ? -1 :
				xData[a] < xData[b] ? -1 : xData[a] > xData[b] ? 1 :
					a < b ? -1 : 1
		);
	});
	let x = new Float32Array(cIdx.length),
		y = new Float32Array(cIdx.length),
		c = new Uint32Array(cIdx.length);
	for (i = 0; i < x.length; i++) {
		x[i] = xData[indices[i]];
		y[i] = yData[indices[i]];
		c[i] = cIdx[indices[i]];
	}
	return { x, y, c };
}