import React, {PropTypes} from 'react';
import { RemountOnResize } from './remount-on-resize';


// Attach helper functions to context prototype
function enhanceCanvasRenderingContext2D() {
	let prototype = CanvasRenderingContext2D.prototype;
	if (!prototype.circle) {
		prototype.circle = function (x, y, radius) {
			this.moveTo(x + radius, y);
			this.arc(x, y, radius, 0, 2 * Math.PI);
		};
	}
	if (!prototype.textSize) {
		prototype.textSize = function (size = 10) {
			// will return an array with [ size, font ] as strings
			const fontArgs = this.font.split(' ');
			const font = fontArgs[fontArgs.length - 1];
			switch (typeof size) {
				case 'number':
					this.font = size + 'px ' + font;
					break;
				case 'string':
					this.font = size + font;
					break;
			}
		};
	}
	if (!prototype.textStyle) {
		prototype.textStyle = function (fill = 'black', stroke = 'white', lineWidth = 2) {
			this.fillStyle = fill;
			this.strokeStyle = stroke;
			this.lineWidth = lineWidth;
		};
	}
	if (!prototype.drawText) {
		prototype.drawText = function (text, x, y) {
			this.strokeText(text, x, y);
			this.fillText(text, x, y);
		};
	}
}

class CanvasComponent extends React.Component {
	constructor(props) {
		super(props);
		this.draw = this.draw.bind(this);

		enhanceCanvasRenderingContext2D();
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
		if (this.state) {
			const { width, height, ratio } = this.state;
			const canvas = this.refs.canvas;
			let context = canvas.getContext('2d');
			// store width, height and ratio in context for paint functions
			context.width = width;
			context.height = height;
			context.pixelRatio = ratio;
			// should we clear the canvas every redraw?
			if (this.props.clear) { context.clearRect(0, 0, canvas.width, canvas.height); }
			this.props.paint(context);
		}
	}

	render() {
		// The way canvas interacts with CSS layouting is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we only render it after
		// mounting, after CSS layouting is done.
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
export function Canvas(props) {
	// If not given a width or height prop, make these fill their parent div
	// This will implicitly set the size of the <Canvas> component, which
	// will then call the passed paint function with the right dimensions.
	let style = props.style ? props.style : {};
	if (props.width) {
		style['minWidth'] = (props.width | 0) + 'px';
		style['maxWidth'] = (props.width | 0) + 'px';
	}
	if (props.height) {
		style['minHeight'] = (props.height | 0) + 'px';
		style['maxHeight'] = (props.height | 0) + 'px';
	}
	return (
		<RemountOnResize
			/* Since canvas interferes with CSS layouting,
			we unmount and remount it on resize events */
			>
			<CanvasComponent
				paint={props.paint}
				clear={props.clear}
				redraw={props.redraw}
				className={props.className}
				style={style}
				/>
		</RemountOnResize>
	);
}

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
	width: PropTypes.number,
	height: PropTypes.number,
	clear: PropTypes.bool,
	redraw: PropTypes.bool,
	className: PropTypes.string,
	style: PropTypes.object,
};


// === Canvas Grid ===
/**
 * CanvasGrid is similar to Canvas, except that it Expects
 * an array of sketch objects instead of a paint function
 * Each sketch contains:
 * - a paint function
 * - an x and y position
 * - a width and a height field
 * Later we might expand this with other functions for
 * capturing mouse, touch and keyboard events.
 */

class CanvasGridComponent extends React.Component {
	constructor(props) {
		super(props);
		this.draw = this.draw.bind(this);

		enhanceCanvasRenderingContext2D();
	}

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
		if (this.state) {
			const { width, height, ratio } = this.state;
			const canvas = this.refs.canvas;
			let context = canvas.getContext('2d');
			if (this.props.clear) { context.clearRect(0, 0, width, width); }

			context.pixelRatio = ratio;
			const { sketches } = this.props;
			for (let i = 0; i < sketches.length; i++) {
				const sketch = sketches[i];
				// move to (x,y) position
				context.translate(sketch.x, sketch.y);
				// store width, height and ratio in context for paint functions
				context.width = sketch.width;
				context.height = sketch.height;
				// should we clear the canvas every redraw?
				if (sketch.clear) { context.clearRect(0, 0, context.width, context.width); }
				// draw sketch within given boundary
				sketch.paint(context);
				// undo translation
				context.translate(-sketch.x, -sketch.y);
			}
		}
	}

	render() {
		// The way canvas interacts with CSS layouting is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we only render it after
		// mounting, after CSS layouting is done.
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

CanvasGridComponent.propTypes = {
	sketches: PropTypes.arrayOf(PropTypes.object).isRequired,
	clear: PropTypes.bool,
	redraw: PropTypes.bool,
	className: PropTypes.string,
	style: PropTypes.object,
};

export function CanvasGrid(props) {
	// If not given a width or height prop, make these fill their parent div
	// This will implicitly set the size of the <Canvas> component, which
	// will then call the passed paint function with the right dimensions.
	let style = props.style ? props.style : {};
	if (props.width) {
		style['minWidth'] = (props.width | 0) + 'px';
		style['maxWidth'] = (props.width | 0) + 'px';
	}
	if (props.height) {
		style['minHeight'] = (props.height | 0) + 'px';
		style['maxHeight'] = (props.height | 0) + 'px';
	}
	return (
		<RemountOnResize
			/* Since canvas interferes with CSS layouting,
			we unmount and remount it on resize events */
			>
			<CanvasGridComponent
				sketches={props.sketches}
				clear={props.clear}
				redraw={props.redraw}
				className={props.className}
				style={style}
				/>
		</RemountOnResize>
	);
}

CanvasGrid.propTypes = {
	sketches: PropTypes.arrayOf(PropTypes.object).isRequired,
	width: PropTypes.number,
	height: PropTypes.number,
	clear: PropTypes.bool,
	redraw: PropTypes.bool,
	className: PropTypes.string,
	style: PropTypes.object,
};


