import React, {PropTypes} from 'react';
import { render, findDOMNode } from 'react-dom';
import * as colors from './colors';
import * as _ from 'lodash';
import { nMostFrequent } from './util';


export class Scatterplot extends React.Component {
	constructor(props) {
    	super(props);
	}

	retina_scale(el) {
	    var context = el.getContext('2d');
		var ratio = window.devicePixelRatio || 1;
		el.style.width = this.props.width + "px";
		el.style.height = this.props.height + "px";
		el.width = this.props.width * ratio;
		el.height = this.props.height * ratio;
		context.scale(ratio, ratio);
	}

	componentDidMount() {
	    var el = findDOMNode(this);
	    this.retina_scale(el);	// Make sure we get a sharp canvas on Retina displays
	    var context = el.getContext('2d');
	    this.paint(context);
	}

	componentDidUpdate() {
	    var el = findDOMNode(this);
	    this.retina_scale(el);	// Make sure we get a sharp canvas on Retina displays		
	    var context = el.getContext('2d');
	    this.paint(context);
	}

	componentWillUnmount() {
	}

	paint(context) {
		if(this.props.x == undefined) {
			return;
		}
		if(this.props.y == undefined) {
			return;
		}

		// Erase previous paint
		context.save();
		context.fillStyle="white";
	    context.fillRect(0, 0, this.props.width, this.props.height);

	    // Calculate some general properties
		var width = (this.props.width - 200);	// Make room for color legend on right
		var height = this.props.height;
		var x = this.props.x;
		// Log transform if requested
		if(this.props.logScaleX) {
			x = x.map(x => Math.log2(x + 1 + 0.5*Math.random()));
		}
		x = _.map(x, t => isFinite(t) ? t : 0);
		var y = this.props.y;
		// Log transform if requested
		if(this.props.logScaleY) {
			y = y.map(x => Math.log2(x + 1 + 0.5*Math.random()));
		}
		y = _.map(y, t => isFinite(t) ? t : 0);
		var radius = Math.max(3, Math.sqrt(x.length)/60);	// Suitable radius of the markers
		var xmin = Math.min(...x);	// Scale of data
		var xmax = Math.max(...x);
		var ymin = Math.min(...y);
		var ymax = Math.max(...y);
		var color = this.props.color;
		color = _.map(color, t => t == NaN ? 0 : t);
		var palette = (this.props.colorMode == "Heatmap" ? colors.solar9 : colors.category20);

		// Calculate the color scale
		if(color == undefined || color.length == 0) {
			color = Array.from({length: x.length}, () => "grey");
		} else {
			// Do we need to categorize the color scale?
			if(this.props.colorMode == "Categorical" || !_.every(color, x => isFinite(x))) {
				var cats = nMostFrequent(color, palette.length - 1);	// Reserve palette[0] for all uncategorized items
				color = color.map(x => palette[cats.indexOf(x) + 1]);	// Add one so the uncategorized become zero

				// Draw the figure legend
				for(var i = -1; i < cats.length; i++) {  // Start at -1 which corresponds to the "(other)" category, i.e. those that didn't fit in the top 20
					context.beginPath();
					context.arc(width + 20, (i+2)*15, 7, 0, 2 * Math.PI, false);
					context.closePath();
					context.fillStyle = palette[i+1];	// i+1 because white (other) is the first color and i = 1 would be the first category
					context.fill();
					context.lineWidth = 0.25;
					context.strokeStyle = "black";
					context.stroke();
					context.fillStyle = "black";
					if(i == -1) {
						context.fillText("(all other categories)", width + 30, (i+2)*15+3);
					} else {
						context.fillText(cats[i], width + 30, (i+2)*15+3);
					}
				}
			} else {
				var original_cmin = Math.min(...color);
				var original_cmax = Math.max(...color);
				// Log transform if requested
				if(this.props.logScaleColor) {
					color = color.map(x => Math.log2(x + 1));
				}
				// Map to the range of colors
				var cmin = Math.min(...color);
				var cmax = Math.max(...color);
				color = color.map(x => palette[Math.round((x - cmin)/(cmax - cmin)*palette.length)]);

				// Draw the color legend
				for(var i = 0; i < palette.length; i++) { 
					context.beginPath();
					context.arc(width + 20, (i+1)*15, 7, 0, 2 * Math.PI, false);
					context.closePath();
					context.fillStyle = palette[palette.length - i - 1];	// Invert it so max value is on top
					context.fill();
					context.lineWidth = 0.25;
					context.strokeStyle = "black";
					context.stroke();
					context.fillStyle = "black";
					if(i == 0) {
						context.fillText(parseFloat(original_cmax.toPrecision(3)), width + 30, (i+1)*15+3);
					}
					if(i == palette.length - 1) {
						context.fillText(parseFloat(original_cmin.toPrecision(3)), width + 30, (i+1)*15+3);
					}
				}
			}
		}
		// Draw the scatter plot itself
	    context.globalAlpha = 0.5;
		context.strokeStyle = "black";
		context.lineWidth = 0.25;
		// Trick to draw by color, which is a lot faster on the HTML canvas element
		palette.forEach((current_color)=>{
			for (var i = 0; i < x.length; i++) {
				if(color[i] != current_color) {
					continue;
				}
				var xi = (x[i] - xmin)/(xmax - xmin)*(width-2*radius)+radius;
				var yi = (1-(y[i] - ymin)/(ymax - ymin))*(height-2*radius)+radius;	// "1-" because Y needs to be flipped

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
		  <canvas width={this.props.width} height={this.props.height}></canvas>
		);
	}
}

Scatterplot.propTypes = {
	width: 	PropTypes.number.isRequired,
	height: PropTypes.number.isRequired,
	x: 		PropTypes.arrayOf(PropTypes.number).isRequired,
	y: 		PropTypes.arrayOf(PropTypes.number).isRequired,
	color:	PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number,PropTypes.string])).isRequired,
	colorMode: PropTypes.string.isRequired,
	logScaleColor: PropTypes.bool.isRequired,
	logScaleX: PropTypes.bool.isRequired,
	logScaleY: PropTypes.bool.isRequired
  };
