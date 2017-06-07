import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { RemountOnResize } from './remount-on-resize';


// Passing a context is supposedly faster than prototypical lookup
export function circle(context, x, y, radius) {
	context.moveTo(x + radius, y);
	context.arc(x, y, radius, 0, 2 * Math.PI);
}

export function textSize(context, size = 10) {
	// will return an array with [ size, font ] as strings
	const fontArgs = context.font.split(' ');
	const font = fontArgs[fontArgs.length - 1];
	switch (typeof size) {
		case 'number':
			context.font = size + 'px ' + font;
			break;
		case 'string':
			context.font = size + font;
			break;
	}
}

export function textStyle(context, fill = 'black', stroke = 'white', lineWidth = 3) {
	context.fillStyle = fill;
	context.strokeStyle = stroke;
	context.lineWidth = lineWidth;
}

export function drawText(context, text, x, y) {
	context.strokeText(text, x, y);
	context.fillText(text, x, y);
}

class CanvasComponent extends PureComponent {
	constructor(props) {
		super(props);
		this.draw = this.draw.bind(this);
	}

	// Make sure we get a sharp canvas on Retina displays
	// as well as adjust the canvas on zoomed browsers
	// Does NOT scale; painter functions decide how to handle
	// window.devicePixelRatio on a case-by-case basis
	componentDidMount() {
		const view = this.refs.view;
		const ratio = window.devicePixelRatio || 1;
		const width = (view.clientWidth * ratio) | 0;
		const height = (view.clientHeight * ratio) | 0;
		this.setState({ width, height, ratio });
	}

	componentDidUpdate() {
		if (this.props.redraw) {
			this.draw();
		}
	}


	// Relies on a ref to a DOM element, so only call
	// when canvas element has been rendered!
	draw() {
		if (this.state && this.props.paint) {
			const canvas = this.refs.canvas;
			let context = canvas.getContext('2d');
			// store width, height and ratio in context for paint functions
			context.width = this.state.width;
			context.height = this.state.height;
			context.pixelRatio = this.state.ratio;
			// should we clear the canvas every redraw?
			if (this.props.clear) { context.clearRect(0, 0, canvas.width, canvas.height); }
			this.props.paint(context);
		}
	}

	render() {
		// The way canvas interacts with CSS layouting is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we only render it after
		// mounting, that is: after CSS layouting is done.
		const canvas = this.state ? (
			<canvas
				ref='canvas'
				width={this.state.width}
				height={this.state.height}
				style={{
					width: '100%',
					height: '100%',
				}} />
		) : null;

		return (
			<div
				ref='view'
				className={this.props.className ? this.props.className : 'view'}
				style={this.props.style}>
				{canvas}
			</div>
		);
	}
}

CanvasComponent.propTypes = {
	paint: PropTypes.func.isRequired,
	clear: PropTypes.bool,
	redraw: PropTypes.bool,
	className: PropTypes.string,
	style: PropTypes.object,
};


// A simple helper component, wrapping retina logic for canvas and
// auto-resizing the canvas to fill its parent container.
// To determine size/layout, we just use CSS on the div containing
// the Canvas component (we're using this with flexbox, for example).
// Expects a "paint" function that takes a "context" to draw on
// Whenever this component updates it will call this paint function
// to draw on the canvas. For convenience, pixel dimensions are stored
// in context.width, context.height and contex.pixelRatio.
export class Canvas extends PureComponent {
	render() {
		// If not given a width or height prop, make these fill their parent div
		// This will implicitly set the size of the <Canvas> component, which
		// will then call the passed paint function with the right dimensions.
		let { width, height, style } = this.props;
		style = style || {};
		if (width) {
			style['minWidth'] = (width | 0) + 'px';
			style['maxWidth'] = (width | 0) + 'px';
		}
		if (height) {
			style['minHeight'] = (height | 0) + 'px';
			style['maxHeight'] = (height | 0) + 'px';
		}
		return (
			<RemountOnResize
			/* Since canvas interferes with CSS layouting,
			we unmount and remount it on resize events */
			>
				<CanvasComponent
					paint={this.props.paint}
					clear={this.props.clear}
					redraw={this.props.redraw}
					className={this.props.className}
					style={style}
				/>
			</RemountOnResize>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
	clear: PropTypes.bool,
	redraw: PropTypes.bool,
	width: PropTypes.number,
	height: PropTypes.number,
	className: PropTypes.string,
	style: PropTypes.object,
};


// // === Canvas Grid ===
// /**
//  * CanvasGrid is similar to Canvas, except that it Expects
//  * an array of sketch objects instead of a paint function
//  * Each sketch contains:
//  * - a paint function
//  * - an x and y position (if none given, zero is assumed)
//  * - a width and a height field (if none given, context size is used)
//  * Later we might expand this with other functions for
//  * capturing mouse, touch and keyboard events.
//  */

//import { inBounds } from '../js/util';

// class CanvasGridComponent extends PureComponent {
// 	constructor(props) {
// 		super(props);
// 		this.draw = this.draw.bind(this);

// 		enhanceCanvasRenderingContext2D();
// 	}

// 	componentDidMount() {
// 		const view = this.refs.view;
// 		const ratio = window.devicePixelRatio || 1;
// 		const width = (view.clientWidth * ratio) | 0;
// 		const height = (view.clientHeight * ratio) | 0;
// 		this.setState({ x: 0, y: 0, width, height, ratio });
// 	}


// 	componentDidUpdate() {
// 		if (this.props.redraw) {
// 			this.draw();
// 		}
// 	}


// 	// Relies on a ref to a DOM element, so only call
// 	// when canvas element has been rendered!
// 	draw() {
// 		if (this.state) {
// 			const { x, y, width, height, ratio } = this.state;
// 			const canvas = this.refs.canvas;
// 			let context = canvas.getContext('2d');
// 			if (this.props.clear) { context.clearRect(0, 0, width, width); }

// 			context.pixelRatio = ratio;
// 			const bounds = [x, y, width, height];
// 			const { sketches } = this.props;
// 			for (let i = 0; i < sketches.length; i++) {
// 				const sketch = sketches[i];
// 				const sketchX = sketch.x ? sketch.x : 0;
// 				const sketchY = sketch.y ? sketch.y : 0;
// 				const sketchW = sketch.width ? sketch.width : width;
// 				const sketchH = sketch.height ? sketch.height : height;
// 				const sketchBounds = [sketchX, sketchY, sketchX + sketchW, sketchY + sketchH];
// 				if (inBounds(bounds, sketchBounds)) {
// 					// set (sketchX, sketchY) as origin
// 					context.translate(sketchX, sketchY);
// 					// store width, height and ratio in context for paint functions
// 					context.width = sketchW;
// 					context.height = sketchH;
// 					// should we clear the canvas every redraw?
// 					if (sketch.clear) { context.clearRect(0, 0, sketchW, sketchH); }
// 					// draw sketch within given boundary
// 					sketch.paint(context);
// 					// undo (sketchX, sketchY) translation
// 					context.translate(-sketchX, -sketchY);
// 				}
// 			}

// 		}
// 	}

// 	render() {
// 		// The way canvas interacts with CSS layouting is a bit buggy
// 		// and inconsistent across browsers. To make it dependent on
// 		// the layout of the parent container, we only render it after
// 		// mounting, after CSS layouting is done.
// 		const canvas = this.state ? (
// 			<canvas
// 				ref='canvas'
// 				width={this.state.width}
// 				height={this.state.height}
// 				style={{
// 					width: '100%',
// 					height: '100%',
// 				}} />
// 		) : null;

// 		return (
// 			<div
// 				ref='view'
// 				className={this.props.className ? this.props.className : 'view'}
// 				style={this.props.style} >
// 				{canvas}
// 			</div>
// 		);
// 	}
// }

// CanvasGridComponent.propTypes = {
// 	sketches: PropTypes.arrayOf(PropTypes.object).isRequired,
// 	clear: PropTypes.bool,
// 	redraw: PropTypes.bool,
// 	className: PropTypes.string,
// 	style: PropTypes.object,
// };

// export function CanvasGrid(props) {
// 	// If not given a width or height prop, make these fill their parent div
// 	// This will implicitly set the size of the <Canvas> component, which
// 	// will then call the passed paint function with the right dimensions.
// 	let style = props.style ? props.style : {};
// 	if (props.width) {
// 		style['minWidth'] = (props.width | 0) + 'px';
// 		style['maxWidth'] = (props.width | 0) + 'px';
// 	}
// 	if (props.height) {
// 		style['minHeight'] = (props.height | 0) + 'px';
// 		style['maxHeight'] = (props.height | 0) + 'px';
// 	}
// 	return (
// 		<RemountOnResize
// 			/* Since canvas interferes with CSS layouting,
// 			we unmount and remount it on resize events */
// 			>
// 			<CanvasGridComponent
// 				sketches={props.sketches}
// 				bounds={props.bounds}
// 				clear={props.clear}
// 				redraw={props.redraw}
// 				className={props.className}
// 				style={style}
// 				/>
// 		</RemountOnResize>
// 	);
// }

// CanvasGrid.propTypes = {
// 	sketches: PropTypes.arrayOf(PropTypes.object).isRequired,
// 	bounds: PropTypes.arrayOf(PropTypes.number).isRequired,
// 	width: PropTypes.number,
// 	height: PropTypes.number,
// 	clear: PropTypes.bool,
// 	redraw: PropTypes.bool,
// 	className: PropTypes.string,
// 	style: PropTypes.object,
// };