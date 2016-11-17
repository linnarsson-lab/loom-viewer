import * as colorLUT from '../js/colors';
import { rndNorm } from '../js/util';

export function scatterplot(x, y, color, colorMode, logScaleX, logScaleY) {
	return (context) => {
		// only render if all required data is supplied
		if (!(x && y && color)) {
			return;
		}

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
		let { width, height, pixelRatio } = context;

		// Scale of data
		let xmin = (x.hasZeros && x.min > 0) ? 0 : x.min;
		let xmax = x.max;
		let ymin = (y.hasZeros && y.min > 0) ? 0 : y.min;
		let ymax = y.max;

		// Log transform if requested
		if (logScaleX && logScaleY) {
			// if both axes are log scales, jitter in a
			// circle around the data instead of a box
			for (let i = 0; i < xData.length; i++) {
				const r = rndNorm();
				const t = Math.PI * 2 * Math.random();
				xData[i] = Math.log2(2 + xData[i]) + r * Math.sin(t);
				yData[i] = Math.log2(2 + yData[i]) + r * Math.cos(t);
			}
			xmin = Math.log2(2 + xmin) - 1;
			xmax = Math.log2(2 + xmax) + 1;
			ymin = Math.log2(2 + ymin) - 1;
			ymax = Math.log2(2 + ymax) + 1;
		} else if (logScaleX) {
			for (let i = 0; i < xData.length; i++) {
				xData[i] = Math.log2(2 + xData[i]) + rndNorm();
			}
			xmin = Math.log2(2 + xmin) - 1;
			xmax = Math.log2(2 + xmax) + 1;
		} else if (logScaleY) {
			for (let i = 0; i < yData.length; i++) {
				yData[i] = Math.log2(2 + yData[i]) + rndNorm();
			}
			ymin = Math.log2(2 + ymin) - 1;
			ymax = Math.log2(2 + ymax) + 1;
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
		context.globalAlpha = 0.6;
		context.strokeStyle = 'black';
		context.lineWidth = Math.min(0.25, Math.max(0.1, radius/20));
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

		let { colorIndices, min, max, hasZeros } = color;

		// Trick to draw by colData, which is a lot faster on the HTML canvas element

		if (colorMode === 'Categorical') {
			for (let i = 0; i < palette.length; i++) {
				context.beginPath();
				context.fillStyle = palette[i];
				for (let j = 0; j < xData.length; j++) {
					const cIdx = colorIndices[colData[j]];
					if (cIdx !== i) {
						continue;
					}
					context.circle(xData[j], yData[j], radius);
				}
				context.closePath();
				context.stroke();
				context.fill();
			}
		} else { // one of the Heatmap options
			if (hasZeros) {
				min = min < 0 ? min : 0;
			}
			const colorIdxScale = (palette.length / (max - min) || 1);
			for (let i = 0; i < palette.length; i++) {
				context.beginPath();
				context.fillStyle = palette[i];
				for (let j = 0; j < xData.length; j++) {
					const cIdx = ((colData[j] - min) * colorIdxScale) | 0;
					if (cIdx !== i) {
						continue;
					}
					context.circle(xData[j], yData[j], radius);
				}
				context.closePath();
				if (radius > 2) {
					context.stroke();
				}
				context.fill();
			}
		}
		context.restore();
	};
}