import React, {PropTypes} from 'react';
import { render, findDOMNode } from 'react-dom';
import { nMostFrequent } from '../js/util';
import * as _ from 'lodash';
import * as colors from '../js/colors';


class CategoriesPainter {
	constructor(data) {
		this.categories = nMostFrequent(data, 20);
	}

	paint(context, width, height, pixelsPer, yoffset, groupedData) {
		var cwidth = Math.min(width, 20);
		var fontArgs = context.font.split(' ');
		context.font = (cwidth - 1) + 'px ' + fontArgs[fontArgs.length - 1];
		var y = 0;
		groupedData.forEach((group) => {
			var commonest = nMostFrequent(group, 1)[0];
			var color = this.categories.indexOf(commonest) + 1;
			context.fillStyle = colors.category20[color];
			context.fillRect(0, yoffset + y, cwidth, pixelsPer);
			y += pixelsPer;
		});
	}
}
class BarPainter {
	paint(context, width, height, pixelsPer, yoffset, groupedData) {
		var max = Number.MIN_VALUE;
		var min = Number.MAX_VALUE;
		var fontArgs = context.font.split(' ');
		context.font = '8px ' + fontArgs[fontArgs.length - 1];
		var means = groupedData.map((group) => {
			var mean = 0;
			for (var i = 0; i < group.length; i++) {
				mean += group[i];
			}
			mean /= group.length;
			if(mean > max) {
				max = mean;
			}
			if(mean < min) {
				min = mean;
			}
			return mean;
		});
		if (min >= 0 && min < 0.5*max) {
			min = 0;
		}
		context.fillStyle = "grey";
		means.forEach((m)=>{
			context.fillRect(0, yoffset, (m-min)/(max-min)*width, pixelsPer);
			yoffset += pixelsPer;
		});
 		context.save();
		context.rotate(90*Math.PI/180);
		context.fillStyle = "blue";
		context.fillText(Number(min.toPrecision(3)), 0, -2);
		context.fillText(Number(max.toPrecision(3)), 0, -width+2+10);
		context.restore();
	}
}

class QuantitativePainter {
	paint(context, width, height, pixelsPer, yoffset, groupedData) {

		var max = Number.MIN_VALUE;
		var min = Number.MAX_VALUE;
		var means = groupedData.map((group) => {
			var mean = 0;
			for (var i = 0; i < group.length; i++) {
				mean += group[i];
			}
			mean /= group.length;
			if(mean > max) {
				max = mean;
			}
			if(mean < min) {
				min = mean;
			}
			return mean;
		});
		if (min >= 0 && min < 0.5*max) {
			min = 0;
		}
		var color = means.map(x => colors.solar9[Math.round((x - min)/(max - min)*colors.solar9.length)]);
		for(var ix = 0; ix < means.length; ix++) {
			context.fillStyle = color[ix];
			context.fillRect(0, yoffset, width, pixelsPer);
			yoffset += pixelsPer;
		}
	}
}

class TextPainter {
	paint(context, width, height, pixelsPer, yoffset, groupedData) {
		if(pixelsPer < 4) {
			return;
		}
		groupedData.forEach((group) => {
			var text = group[0];	// We only draw text if zoomed in so there's a single element per group
			var fontArgs = context.font.split(' ');
			var fontSize = Math.min(pixelsPer, 12);
			context.font = fontSize + 'px ' + fontArgs[fontArgs.length - 1];
			context.fillText(text, 1, yoffset + pixelsPer/2 + fontSize/2 - 1);
			yoffset += pixelsPer;
		});
	}
}
class TextAlwaysPainter {
	paint(context, width, height, pixelsPer, yoffset, groupedData) {
		groupedData.forEach((group) => {
			var text = _.find(group, (s) => s != '');
			if(text != undefined) {
				var fontArgs = context.font.split(' ');
				var fontSize = 10;
				context.font = fontSize + 'px ' + fontArgs[fontArgs.length - 1];
				context.fillText(text, 1, yoffset + pixelsPer/2 + fontSize/2 - 1);
			}
			yoffset += pixelsPer;
		});
	}
}

export class Sparkline extends React.Component {
	constructor(props) {
    	super(props);
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
	    context.clearRect(0, 0, this.props.width, this.props.height);
	    this.paint(context);
	}

	componentWillUnmount() {
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

	paint(context) {

		if(this.props.data == undefined) {
			return;
		}
		context.save();
		// Width is the narrow dimension even if rotated
		var width = this.props.width;
		var height = this.props.height;
		if(this.props.orientation == 'horizontal') {
			context.translate(0, this.props.height);
			context.rotate(-90*Math.PI/180);
			width = this.props.height;
			height = this.props.width;
		}
		var fractionalPixel = this.props.dataRange[0] % 1;
		var pixelsPer = (this.props.screenRange[1] - this.props.screenRange[0])/(this.props.dataRange[1] - this.props.dataRange[0]);
		var yoffset = this.props.screenRange[0] - fractionalPixel*pixelsPer;

		// Group the data
		var data = [];
		for(var ix = 0; ix < this.props.dataRange[1] - this.props.dataRange[0]; ix++) {
			var pixel = Math.round(ix*pixelsPer);
			if(data[pixel] == undefined) {
				data[pixel] = [];
			}
			data[pixel].push(this.props.data[Math.floor(ix + this.props.dataRange[0])]);
		}

		// Which painter should we use?
		var painter = new TextPainter();
		if(this.props.mode == 'TextAlways') {
			painter = new TextAlwaysPainter();
		}
		if(this.props.mode == 'Categorical') {
			painter = new CategoriesPainter(this.props.data);
		}
		if(this.props.mode == 'Bars') {
			painter = new BarPainter(this.props.data);
		}
		if(this.props.mode == 'Heatmap') {
			painter = new QuantitativePainter();
		}
		painter.paint(context, width, height, Math.max(Math.floor(pixelsPer), 1), yoffset, data);

		context.restore();
	}

  	render() {
		if(this.props.orientation == "vertical") {
			return (
			  <canvas width={this.props.width} height={this.props.height} className="stack-left-to-right sparkline"></canvas>
			);
		}
		return (
		  <canvas width={this.props.width} height={this.props.height} className="sparkline"></canvas>
		);
	}
}

Sparkline.propTypes = {
	orientation:	PropTypes.string.isRequired,
	mode: 			PropTypes.string.isRequired,
	width: 			PropTypes.number.isRequired,
	height: 		PropTypes.number.isRequired,
	data: 			PropTypes.array,
	dataRange: 		PropTypes.arrayOf(PropTypes.number).isRequired,
	screenRange: 	PropTypes.arrayOf(PropTypes.number).isRequired
  };
