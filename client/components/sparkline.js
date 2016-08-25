import React, {PropTypes} from 'react';
import { nMostFrequent } from '../js/util';
import * as _ from 'lodash';
import * as colors from '../js/colors';
import { Canvas } from './canvas';


class CategoriesPainter {
	constructor(data) {
		this.categories = nMostFrequent(data, 20);
	}

	paint(context, width, height, pixelsPer, yoffset, groupedData) {
		const cwidth = Math.min(width, 20);
		const fontArgs = context.font.split(' ');
		context.font = (cwidth - 1) + 'px ' + fontArgs[fontArgs.length - 1];
		let y = 0;
		groupedData.forEach((group) => {
			const commonest = nMostFrequent(group, 1)[0];
			const color = this.categories.indexOf(commonest) + 1;
			context.fillStyle = colors.category20[color];
			context.fillRect(0, yoffset + y, cwidth, pixelsPer);
			y += pixelsPer;
		});
	}
}

class BarPainter {
	paint(context, width, height, pixelsPer, yoffset, groupedData) {
		console.log('[BarPainter] groupedData: ', groupedData);
		const fontArgs = context.font.split(' ');
		context.font = '8px ' + fontArgs[fontArgs.length - 1];

		let max = Number.MIN_VALUE;
		let min = Number.MAX_VALUE;
		const means = groupedData.map((group) => {
			let mean = 0;
			for (let i = 0; i < group.length; i++) {
				mean += group[i];
			}
			mean /= group.length;
			if (mean > max) {
				max = mean;
			}
			if (mean < min) {
				min = mean;
			}
			return mean;
		});
		if (min >= 0 && min < 0.5 * max) {
			min = 0;
		}
		context.fillStyle = "grey";
		means.forEach((m) => {
			context.fillRect(0, yoffset, (m - min) / (max - min) * width, pixelsPer);
			yoffset += pixelsPer;
		});
		context.save();
		context.rotate(90 * Math.PI / 180);
		context.fillStyle = "blue";
		context.fillText(Number(min.toPrecision(3)), 0, -2);
		context.fillText(Number(max.toPrecision(3)), 0, -width + 2 + 10);
		context.restore();
	}
}

class QuantitativePainter {
	paint(context, width, height, pixelsPer, yoffset, groupedData) {

		let max = Number.MIN_VALUE;
		let min = Number.MAX_VALUE;
		const means = groupedData.map((group) => {
			let mean = 0;
			for (let i = 0; i < group.length; i++) {
				mean += group[i];
			}
			mean /= group.length;
			if (mean > max) {
				max = mean;
			}
			if (mean < min) {
				min = mean;
			}
			return mean;
		});
		if (min >= 0 && min < 0.5 * max) {
			min = 0;
		}
		const color = means.map((x) => {
			return colors.solar9[Math.round((x - min) / (max - min) * colors.solar9.length)];
		});
		for (let ix = 0; ix < means.length; ix++) {
			context.fillStyle = color[ix];
			context.fillRect(0, yoffset, width, pixelsPer);
			yoffset += pixelsPer;
		}
	}
}

class TextPainter {
	paint(context, width, height, pixelsPer, yoffset, groupedData) {
		// force to integer values and hint this to the JS compiler
		width |= 0;
		height |= 0;
		pixelsPer |= 0;
		yoffset |= 0;

		if (pixelsPer < 4) {
			return;
		}
		const fontArgs = context.font.split(' ');
		const fontSize = Math.min(pixelsPer, 12);
		const x = 1;
		let y = (yoffset + pixelsPer / 2 + fontSize / 2 - 1) | 0;
		context.font = fontSize + 'px ' + fontArgs[fontArgs.length - 1];

		groupedData.forEach((group) => {
			// We only draw text if zoomed in so there's a single element per group
			const text = group[0];
			context.fillText(text, x, y);
			y += pixelsPer;
		});
	}
}

class TextAlwaysPainter {
	paint(context, width, height, pixelsPer, yoffset, groupedData) {
		groupedData.forEach((group) => {
			const text = _.find(group, (s) => { return s !== ''; });
			if (text !== undefined) {
				const fontArgs = context.font.split(' ');
				const fontSize = 10;
				context.font = fontSize + 'px ' + fontArgs[fontArgs.length - 1];
				context.fillText(text, 1, yoffset + pixelsPer / 2 + fontSize / 2 - 1);
			}
			yoffset += pixelsPer;
		});
	}
}

export class Sparkline extends React.Component {
	constructor(props) {
		super(props);
		this.paint = this.paint.bind(this);
	}

	paint(context, width, height) {
		if (this.props.data === undefined) {
			return;
		}

		if (this.props.orientation === 'horizontal') {
			context.translate(0, this.props.height);
			context.rotate(-90 * Math.PI / 180);
			let t = width;
			width = height;
			height = t;
		}

		context.save();
		const leftRange = Math.min(this.props.dataRange[0], this.props.dataRange[1]) | 0;
		const rightRange = Math.max(this.props.dataRange[0], this.props.dataRange[1]) | 0;
		const totalRange = (rightRange - leftRange) | 0;
		if (totalRange === 0) { return; }

		const fractionalPixel = leftRange % 2;
		const pixelsPer = (width / totalRange) | 0;
		const yoffset = -fractionalPixel * pixelsPer;

		// Group the data
		const data = [];
		for (let ix = 0; ix < totalRange; ix++) {
			const pixel = (ix * pixelsPer) | 0;
			if (data[pixel] === undefined) {
				data[pixel] = [];
			}
			data[pixel].push(this.props.data[(ix + leftRange) | 0]);
		}

		// Which painter should we use?
		let painter = null;
		switch (this.props.mode) {
			case 'TextAlways':
				painter = new TextAlwaysPainter();
				break;
			case 'Categorical':
				painter = new CategoriesPainter(this.props.data);
				break;
			case 'Bars':
				painter = new BarPainter();
				break;
			case 'Heatmap':
				painter = new QuantitativePainter();
				break;
			default:
				painter = new TextPainter();
		}
		if (painter) {
			painter.paint(
				context,
				width,
				height,
				Math.max(pixelsPer, 1),
				yoffset,
				data);
		}

		context.restore();
	}

	render() {
		// If not given a width or height prop, make it fill its parent div
		// This will implicitly set the size of the <Canvas> component, which
		// will then call the passed paint function with the right dimensions.
		const ratio = window.devicePixelRatio || 1;
		const style = {};
		if (this.props.width) {
			style['minWidth'] = ((this.props.width * ratio) | 0) + 'px';
			style['maxWidth'] = ((this.props.width * ratio) | 0) + 'px';
		}
		if (this.props.height) {
			style['minHeight'] = ((this.props.height * ratio) | 0) + 'px';
			style['maxHeight'] = ((this.props.height * ratio) | 0) + 'px';
		}
		return (
			<div className='view' style={style}>
				<Canvas paint={this.paint} clear />
			</div>
		);
	}
}

Sparkline.propTypes = {
	orientation: PropTypes.string.isRequired,
	mode: PropTypes.string.isRequired,
	width: PropTypes.number,
	height: PropTypes.number,
	data: PropTypes.array,
	dataRange: PropTypes.arrayOf(PropTypes.number).isRequired,
	//screenRange: PropTypes.arrayOf(PropTypes.number).isRequired,
};
