import React, {PropTypes} from 'react';
import * as colors from '../js/colors';
import * as _ from 'lodash';
import { nMostFrequent } from '../js/util';

import { Canvas } from './canvas';


export class Scatterplot extends React.Component {

	constructor(props) {
		super(props);

		// Required to let us pass `paint` to a
		// Canvas component without `this` errors
		this.paint = this.paint.bind(this);
	}

	paint(context, width, height) {
		if (this.props.x === undefined) {
			return;
		}
		if (this.props.y === undefined) {
			return;
		}

		// Erase previous paint
		context.save();
		context.fillStyle = "white";
		context.fillRect(0, 0, width, height);

		// Calculate some general properties
		width = (width - 200);	// Make room for color legend on right
		let x = this.props.x;
		// Log transform if requested
		if (this.props.logScaleX) {
			x = x.map((x) => { return Math.log2(x + 1 + 0.5 * Math.random()); });
		}
		x = _.map(x, (t) => { return isFinite(t) ? t : 0; });
		let y = this.props.y;
		// Log transform if requested
		if (this.props.logScaleY) {
			y = y.map((x) => { return Math.log2(x + 1 + 0.5 * Math.random()); });
		}
		y = _.map(y, (t) => { return isFinite(t) ? t : 0; });
		const radius = Math.max(3, Math.sqrt(x.length) / 60);	// Suitable radius of the markers
		const xmin = Math.min(...x);	// Scale of data
		const xmax = Math.max(...x);
		const ymin = Math.min(...y);
		const ymax = Math.max(...y);
		let color = _.map(this.props.color, (t) => { return isNaN(t) ? 0 : t; });
		const palette = (this.props.colorMode === "Heatmap" ? colors.solar9 : colors.category20);

		// Calculate the color scale
		if (color === undefined || color.length === 0) {
			color = Array.from({ length: x.length }, () => { return "grey"; });
		} else {
			// Do we need to categorize the color scale?
			if (this.props.colorMode === "Categorical" || !_.every(color, (x) => { return isFinite(x); })) {
				let cats = nMostFrequent(color, palette.length - 1);	// Reserve palette[0] for all uncategorized items
				color = color.map((x) => { return palette[cats.indexOf(x) + 1]; });	// Add one so the uncategorized become zero

				// Draw the figure legend
				for (let i = -1; i < cats.length; i++) {  // Start at -1 which corresponds to the "(other)" category, i.e. those that didn't fit in the top 20
					context.beginPath();
					context.arc(width + 20, (i + 2) * 15, 7, 0, 2 * Math.PI, false);
					context.closePath();
					context.fillStyle = palette[i + 1];	// i+1 because white (other) is the first color and i = 1 would be the first category
					context.fill();
					context.lineWidth = 0.25;
					context.strokeStyle = "black";
					context.stroke();
					context.fillStyle = "black";
					if (i === -1) {
						context.fillText("(all other categories)", width + 30, (i + 2) * 15 + 3);
					} else {
						context.fillText(cats[i], width + 30, (i + 2) * 15 + 3);
					}
				}
			} else {
				let original_cmin = Math.min(...color);
				let original_cmax = Math.max(...color);
				// Log transform if requested
				if (this.props.logScaleColor) {
					color = color.map((x) => { return Math.log2(x + 1); });
				}
				// Map to the range of colors
				const cmin = Math.min(...color);
				const cmax = Math.max(...color);
				color = color.map((x) => { return palette[Math.round((x - cmin) / (cmax - cmin) * palette.length)]; });

				// Draw the color legend
				for (let i = 0; i < palette.length; i++) {
					context.beginPath();
					context.arc(width + 20, (i + 1) * 15, 7, 0, 2 * Math.PI, false);
					context.closePath();
					context.fillStyle = palette[palette.length - i - 1];	// Invert it so max value is on top
					context.fill();
					context.lineWidth = 0.25;
					context.strokeStyle = "black";
					context.stroke();
					context.fillStyle = "black";
					if (i === 0) {
						context.fillText(parseFloat(original_cmax.toPrecision(3)), width + 30, (i + 1) * 15 + 3);
					}
					if (i === palette.length - 1) {
						context.fillText(parseFloat(original_cmin.toPrecision(3)), width + 30, (i + 1) * 15 + 3);
					}
				}
			}
		}
		// Draw the scatter plot itself
		context.globalAlpha = 0.5;
		context.strokeStyle = "black";
		context.lineWidth = 0.25;
		// Trick to draw by color, which is a lot faster on the HTML canvas element
		palette.forEach((current_color) => {
			for (let i = 0; i < x.length; i++) {
				if (color[i] !== current_color) {
					continue;
				}
				const xi = (x[i] - xmin) / (xmax - xmin) * (width - 2 * radius) + radius;
				const yi = (1 - (y[i] - ymin) / (ymax - ymin)) * (height - 2 * radius) + radius;	// "1-" because Y needs to be flipped

				context.beginPath();
				context.arc(xi, yi, radius, 0, 2 * Math.PI, false);
				context.closePath();
				context.fillStyle = color[i];
				context.fill();
				context.stroke();
			}
		});
		context.restore();
	}

	render() {
		return (
			<Canvas paint={this.paint} />
		);
	}
}

Scatterplot.propTypes = {
	x: PropTypes.arrayOf(PropTypes.number).isRequired,
	y: PropTypes.arrayOf(PropTypes.number).isRequired,
	color: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])).isRequired,
	colorMode: PropTypes.string.isRequired,
	logScaleColor: PropTypes.bool.isRequired,
	logScaleX: PropTypes.bool.isRequired,
	logScaleY: PropTypes.bool.isRequired,
};
