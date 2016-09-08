import React, {PropTypes} from 'react';
import * as colors from '../js/colors';
import * as _ from 'lodash';
import { nMostFrequent } from '../js/util';

import { Canvas } from './canvas';


export class Scatterplot extends React.Component {

	constructor(props) {
		super(props);
		this.paint = this.paint.bind(this);
	}


	paint(context) {
		if (this.props.x === undefined ||
			this.props.y === undefined ||
			this.props.color === undefined) {
			return;
		}
		let { width, height, pixelRatio } = context;

		// Erase previous paint
		context.save();
		context.fillStyle = 'white';
		context.fillRect(0, 0, width, height);

		// Calculate some general properties
		// Make room for color legend on right
		width = (width - 200);

		// avoid accidentally mutating source arrays
		let x = this.props.x.slice(0);
		let y = this.props.y.slice(0);

		// Log transform if requested
		if (this.props.logScaleX) {
			for (let i = 0; i < x.length; i++) {
				x[i] = Math.log2(2 + x[i]) - 1;
			}
		}
		if (this.props.logScaleY) {
			for (let i = 0; i < y.length; i++) {
				y[i] = Math.log2(2 + y[i]) - 1;
			}
		}

		// Suitable radius of the markers
		const radius = Math.max(3, Math.sqrt(x.length) / 60) * pixelRatio;

		// Scale of data
		const xmin = Math.min(...x);
		const xmax = Math.max(...x);
		const ymin = Math.min(...y);
		const ymax = Math.max(...y);

		// Scale to screen dimensions
		if (this.props.logScaleX) {
			for (let i = 0; i < x.length; i++) {
				const xi = (x[i] - xmin) / (xmax - xmin) * (width - 2 * radius) + radius;
				// When using log-scale, jitter up to 3*radius for better visibility
				x[i] = (xi + (Math.random() - 0.5) * 3*radius) | 0;
			}
		} else {
			for (let i = 0; i < x.length; i++) {
				const xi = (x[i] - xmin) / (xmax - xmin) * (width - 2 * radius) + radius;
				x[i] = xi | 0;
			}
		}

		if (this.props.logScaleY) {
			for (let i = 0; i < y.length; i++) {
				// "1-" because Y needs to be flipped
				const yi = (1 - (y[i] - ymin) / (ymax - ymin)) * (height - 2 * radius) + radius;
				y[i] = (yi + (Math.random() - 0.5) * 3*radius) | 0;
			}
		} else {
			for (let i = 0; i < y.length; i++) {
				const yi = (1 - (y[i] - ymin) / (ymax - ymin)) * (height - 2 * radius) + radius;
				y[i] = yi | 0;
			}
		}


		let color = this.props.color;
		const palette = (this.props.colorMode === 'Heatmap' ? colors.solar9 : colors.category20);

		// Calculate the color scale
		if (!color.length) {
			color = Array.from({ length: x.length }, () => { return 'grey'; });
		} else {
			// Do we need to categorize the color scale?
			if (this.props.colorMode === 'Categorical' || !_.every(color, (c) => { return isFinite(c); })) {

				// Reserve palette[0] for all uncategorized items
				let cats = nMostFrequent(color, palette.length - 1);

				// Add one so the uncategorized become zero
				color = color.map((c) => { return palette[cats.indexOf(c) + 1]; });

				// Draw the figure legend
				// Start at -1 which corresponds to
				// the "(other)" category, i.e. those
				// that didn't fit in the top 20
				const dotRadius = 2 * radius;
				const dotMargin = 10 * pixelRatio;
				const xDot = width + dotMargin + dotRadius;
				const xText = xDot + dotMargin + dotRadius;
				for (let i = -1; i < cats.length; i++) {
					let yDot = (i + 2) * (2 * dotRadius + dotMargin);
					context.beginPath();
					context.circle(xDot, yDot, dotRadius);
					context.closePath();
					// i+1 because white (other) is the first color
					// and i = 1 would be the first category
					context.fillStyle = palette[i + 1];
					context.fill();
					context.lineWidth = 0.25 * pixelRatio;
					context.strokeStyle = 'black';
					context.stroke();
					context.textStyle();
					context.textSize(10 * pixelRatio);
					if (i === -1) {
						context.fillText('(all other categories)', xText, yDot + 5 * pixelRatio);
					} else {
						context.fillText(cats[i], xText, yDot + 5 * pixelRatio);
					}
				}
			} else {
				let original_cmin = Math.min(...color);
				let original_cmax = Math.max(...color);
				// Log transform if requested
				if (this.props.logScaleColor) {
					color = color.map((c) => { return Math.log2(c + 1); });
				}
				// Map to the range of colors
				const cmin = Math.min(...color);
				const cmax = Math.max(...color);
				color = color.map((c) => { return palette[Math.round((c - cmin) / (cmax - cmin) * palette.length)]; });

				// Draw the color legend
				const dotRadius = 2 * radius;
				const dotMargin = 10 * pixelRatio;
				const xDot = width + dotMargin + dotRadius;
				const xText = xDot + dotMargin + dotRadius;
				for (let i = 0; i < palette.length; i++) {
					let yDot = (i + 1) * (2 * dotRadius + dotMargin);
					context.beginPath();
					context.circle(xDot, yDot, dotRadius);
					context.closePath();
					// Invert it so max value is on top
					context.fillStyle = palette[palette.length - i - 1];
					context.fill();
					context.lineWidth = 0.25 * pixelRatio;
					context.strokeStyle = 'black';
					context.stroke();
					context.textStyle();
					context.textSize(10 * pixelRatio);
					if (i === 0) {
						context.fillText(parseFloat(original_cmax.toPrecision(3)), xText, yDot + 5 * pixelRatio);
					}
					if (i === palette.length - 1) {
						context.fillText(parseFloat(original_cmin.toPrecision(3)), xText, yDot + 5 * pixelRatio);
					}
				}
			}
		}
		// Draw the scatter plot itself
		context.globalAlpha = 0.6;
		context.strokeStyle = 'black';
		context.lineWidth = 0.25;
		// Trick to draw by color, which is a lot faster on the HTML canvas element
		palette.forEach((current_color) => {
			context.beginPath();
			for (let i = 0; i < x.length; i++) {
				if (color[i] !== current_color) {
					continue;
				}
				context.circle(x[i], y[i], radius);
			}
			context.closePath();
			context.fillStyle = current_color;
			context.stroke();
			context.fill();
		});
		context.restore();
	}

	render() {
		return (
			<Canvas paint={this.paint} style={this.props.style} />
		);
	}
}

Scatterplot.propTypes = {
	x: PropTypes.arrayOf(PropTypes.number),
	y: PropTypes.arrayOf(PropTypes.number),
	color: PropTypes.arrayOf(
		PropTypes.oneOfType([PropTypes.number, PropTypes.string])
	),
	colorMode: PropTypes.string.isRequired,
	logScaleColor: PropTypes.bool.isRequired,
	logScaleX: PropTypes.bool.isRequired,
	logScaleY: PropTypes.bool.isRequired,
	style: PropTypes.object,
};
