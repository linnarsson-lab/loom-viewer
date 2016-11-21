import * as colorLUT from '../js/colors';
import { rndNorm } from '../js/util';

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

export function scatterplot(x, y, color, colorMode, logScaleX, logScaleY, jitterX, jitterY) {
	return (context) => {
		// only render if all required data is supplied
		if (!(x && y && color)) {
			return;
		}

		let { width, height, pixelRatio } = context;
		// Erase previous paint
		context.save();
		context.fillStyle = 'white';
		context.fillRect(0, 0, width, height);

		// avoid accidentally mutating source arrays,
		// and make sure we're convert data to floats
		// for the sake of plotting (we optimise storage
		// to smallest sensible format)
		let xData = Float32Array.from(x.filteredData),
			yData = Float32Array.from(y.filteredData),
			colData = color.filteredData.slice(0);

		// Scale of data
		let xmin = (x.hasZeros && x.min > 0) ? 0 : x.min;
		let xmax = x.max;
		let ymin = (y.hasZeros && y.min > 0) ? 0 : y.min;
		let ymax = y.max;

		// Log transform if requested
		if (logScaleX){
			for (let i = 0; i < xData.length; i++) {
				xData[i] = Math.log2(2 + xData[i]);
			}
			xmin = Math.log2(2 + xmin) - 1;
			xmax = Math.log2(2 + xmax) + 1;
		}
		if (logScaleY){
			for (let i = 0; i < yData.length; i++) {
				yData[i] = Math.log2(2 + yData[i]);
			}
			ymin = Math.log2(2 + ymin) - 1;
			ymax = Math.log2(2 + ymax) + 1;
		}

		if (jitterX && jitterY) {
			// if jittering both axes, do so in a
			// circle around the data
			for (let i = 0; i < xData.length; i++) {
				const r = rndNorm();
				const t = Math.PI * 2 * Math.random();
				xData[i] += r * Math.sin(t);
				yData[i] += r * Math.cos(t);
			}
		} else if (jitterX) {
			for (let i = 0; i < xData.length; i++) {
				xData[i] += rndNorm();
			}
		} else if (jitterY) {
			for (let i = 0; i < yData.length; i++) {
				yData[i] += rndNorm();
			}
		}

		// Suitable radius of the markers
		// - smaller canvas size -> smaller points
		const radius = Math.min(6, (Math.max(1, Math.min(width, height) / 100)) * pixelRatio) | 0;
		// Scale to screen dimensions and round to pixel position
		for (let i = 0; i < xData.length; i++) {
			const xi = (xData[i] - xmin) / (xmax - xmin) * (width - 2 * radius) + radius;
			xData[i] = xi | 0;
		}
		for (let i = 0; i < yData.length; i++) {
			const yi = (1 - (yData[i] - ymin) / (ymax - ymin)) * (height - 2 * radius) + radius;
			yData[i] = yi | 0;
		}

		// Draw the scatter plot itself
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

		// prep the sprites
		const w = sprites[0].width, h = sprites[0].height;
		const lineW = Math.min(0.5, Math.max(0.125, radius / 10));
		for (let i = 0; i < palette.length; i++) {
			contexts[i] = sprites[i].getContext('2d');
			contexts[i].clearRect(0, 0, w, h);
			contexts[i].beginPath();
			contexts[i].arc(w*0.5, h*0.5, radius, 0, 2 * Math.PI, false);
			contexts[i].closePath();
			if (radius > 2 || colorMode === 'Categorical') {
				contexts[i].globalAlpha = 0.3;
				contexts[i].strokeStyle = 'black';
				contexts[i].lineWidth = lineW;
				contexts[i].stroke();
			}
			if (i) {
				contexts[i].globalAlpha = 0.5;
				contexts[i].fillStyle = palette[i];
				contexts[i].fill();
			}
		}
		const spriteOffset = (w * 0.5);

		// blit sprites in order of array
		let { colorIndices, min, max, hasZeros } = color;
		if (colorMode === 'Categorical') {
			for (let i = 0; i < xData.length; i++) {
				const cIdx = colorIndices[colData[i]] | 0; // force "undefined" to zero
				context.drawImage(sprites[cIdx], (xData[i] - spriteOffset) | 0, (yData[i] - spriteOffset) | 0);
			}
		} else { // one of the Heatmap options
			if (hasZeros) {
				min = min < 0 ? min : 0;
			}
			const colorIdxScale = ((palette.length - 1) / (max - min) || 1);
			for (let i = 0; i < xData.length; i++) {
				const cIdx = ((colData[i] - min) * colorIdxScale) | 0;
				context.drawImage(sprites[cIdx], (xData[i] - spriteOffset) | 0, (yData[i] - spriteOffset) | 0);
			}
		}
		context.restore();
	};
}