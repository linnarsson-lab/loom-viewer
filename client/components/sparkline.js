import React, {PropTypes} from 'react';
import { nMostFrequent } from '../js/util';
import * as _ from 'lodash';
import * as colors from '../js/colors';
import { Canvas } from './canvas';


class CategoriesPainter {
	constructor(data) {
		this.categories = nMostFrequent(data, 20);
	}

	// paint(context, width, height, pixelsPer, yoffset, groupedData) {
	paint(groupedData, context, width, height) {
		let x = 0;
		const xStepSize = width / groupedData.length;
		for (let i = 0; i < groupedData.length; i++) {
			const commonest = nMostFrequent(groupedData[i], 1)[0];
			const color = this.categories.indexOf(commonest) + 1;
			context.fillStyle = colors.category20[color];
			context.fillRect(x, 0, xStepSize, height);
			x += xStepSize;
		}
	}
}

class BarPainter {
	// paint(context, width, height, pixelsPer, xOffset, groupedData) {
	paint(groupedData, context, width, height) {

		if (typeof groupedData[0][0] === 'number') {
			let max = Number.MIN_VALUE, min = Number.MAX_VALUE;

			let means = groupedData.map((group) => {
				let mean = 0;
				for (let i = 0; i < group.length; i++) {
					mean += group[i];
				}
				mean /= group.length;
				max = mean > max ? mean : max;
				min = mean < min ? mean : min;
				return mean;
			});

			if (min >= 0 && min < 0.5 * max) {
				min = 0;
			} else {
				for (let i = 0; i < means.length; i++) { means[i] -= min; }
			}

			// factor to multiply the mean values by,
			// to calculate their's height (see below)
			const scaleMean = height / (max - min);

			context.fillStyle = '#404040';
			const meanWidth = width / groupedData.length;
			for (let i = 0, xOffset = 0; i < means.length; i++) {
				// canvas defaults to positive y going *down*, so to
				// draw from bottom to top we start at height and
				// subtract the height.
				let meanHeight = (means[i] * scaleMean) | 0;
				let yOffset = height - meanHeight;
				context.fillRect(xOffset, yOffset, meanWidth, meanHeight);
				xOffset += meanWidth;
			}

			const fontArgs = context.font.split(' ');
			context.font = '10px ' + fontArgs[fontArgs.length - 1];
			context.fillStyle = 'black';
			context.strokeStyle = 'white';
			context.lineWidth = 3;
			context.strokeText(Number(min.toPrecision(3)), 2, height - 2);
			context.strokeText(Number(max.toPrecision(3)), 2, 10);
			context.fillText(Number(min.toPrecision(3)), 2, height - 2);
			context.fillText(Number(max.toPrecision(3)), 2, 10);
		} else {
			const fontArgs = context.font.split(' ');
			context.font = '16px ' + fontArgs[fontArgs.length - 1];
			context.fillStyle = 'black';
			context.strokeStyle = 'white';
			context.lineWidth = 32;
			context.strokeText('Cannot draw bars for non-numerical data', 10, height - 10);
			context.fillText('Cannot draw bars for non-numerical data', 10, height - 10);
		}
	}
}

class QuantitativePainter {
	// paint(context, width, height, pixelsPer, yoffset, groupedData) {
	paint(groupedData, context, width, height) {
		let max = Number.MIN_VALUE;
		let min = Number.MAX_VALUE;
		const means = groupedData.map((group) => {
			let mean = 0;
			for (let i = 0; i < group.length; i++) {
				mean += group[i];
			}
			mean /= group.length;
			max = mean > max ? mean : max;
			min = mean < min ? mean : min;
			return mean;
		});
		if (min >= 0 && min < 0.5 * max) {
			min = 0;
		} else {
			for (let i = 0; i < means.length; i++) { means[i] -= min; }
		}

		const colorIdxScale = colors.solar9.length / max;
		const xStepSize = means.length / width;
		for (let i = 0, x = 0; i < means.length; i++) {
			const colorIdx = (means[i] * colorIdxScale) | 0;
			context.fillStyle = colors.solar9[colorIdx];
			context.fillRect(x, 0, xStepSize, height);
			x += xStepSize;
		}
	}
}

class TextPainter {
	// paint(context, width, height, pixelsPer, yoffset, groupedData) {
	paint(groupedData, context, width, height) {
		console.log('[TextPainter] groupedData: ', groupedData);

		// When drawing horizontally, the text should be vertical
		// Note that this essentually undoes the rotation we perform
		// when Sparkline is drawn vertically.
		context.save();
		let t = width;
		width = height;
		height = t;
		context.rotate(90 * Math.PI / 180);
		context.translate(0, -height);

		const yStepSize = width / groupedData.length;
		if (yStepSize < 4) {
			return;
		}
		const fontArgs = context.font.split(' ');
		const fontSize = Math.min(yStepSize, 12);
		const x = 1;
		let y = (yStepSize + fontSize) / 2 - 1;
		context.font = fontSize + 'px ' + fontArgs[fontArgs.length - 1];
		context.fillStyle = 'black';
		context.strokeStyle = 'white';
		context.lineWidth = 3;

		groupedData.forEach((group) => {
			// We only draw text if zoomed in so there's a single element per group
			const text = group[0];
			context.strokeText(text, x, y);
			context.fillText(text, x, y);
			y += yStepSize;
		});
		context.restore();
	}
}

class TextAlwaysPainter {
	//paint(context, width, height, pixelsPer, yoffset, groupedData) {
	paint(groupedData, context, width, height) {
		console.log('[TextAlwaysPainter] groupedData: ', groupedData);
		context.save();

		const fontArgs = context.font.split(' ');
		const fontSize = 10;
		context.font = fontSize + 'px ' + fontArgs[fontArgs.length - 1];
		context.fillStyle = 'black';
		context.strokeStyle = 'white';
		context.lineWidth = 3;

		let t = width;
		width = height;
		height = t;
		context.rotate(90 * Math.PI / 180);
		context.translate(0, -height);



		const yStepSize = width / groupedData.length;
		let y = (yStepSize + fontSize) / 2 - 1;
		groupedData.forEach((group) => {
			const text = _.find(group, (s) => { return s !== ''; });
			if (text !== undefined) {
				context.strokeText(text, 1, y);
				context.fillText(text, 1, y);
			}
			y += yStepSize;
		});

		context.restore();
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
		context.save();

		if (this.props.orientation !== 'horizontal') {
			context.translate(0, this.props.height);
			context.rotate(-90 * Math.PI / 180);
			let t = width;
			width = height;
			height = t;
		}

		// force range numbers to integers
		const leftRange = Math.min(this.props.dataRange[0], this.props.dataRange[1]) | 0;
		const rightRange = Math.max(this.props.dataRange[0], this.props.dataRange[1]) | 0;
		const totalRange = (rightRange - leftRange) | 0;
		if (totalRange === 0) { return; }

		// Group the data
		const groupedData = [];
		const pixelsPer = width / totalRange;
		for (let ix = 0; ix < totalRange; ix++) {
			const pixel = (ix * pixelsPer) | 0;
			if (groupedData[pixel] === undefined) {
				groupedData[pixel] = [];
			}
			groupedData[pixel].push(this.props.data[(ix + leftRange) | 0]);
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
			painter.paint(groupedData, context, width, height);
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
