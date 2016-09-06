import React, {PropTypes} from 'react';
import { debounce } from 'lodash';

// A simple helper component, wrapping retina logic for canvas and
// auto-resizing the canvas to fill its parent container.
// To determine size/layout, we just use CSS on the div containing
// the Canvas component (we're using this with flexbox, for example).
// Expects a "paint" function that takes a "context" to draw on
// Whenever this component updates it will call this paint function
// to draw on the canvas. For convenience, pixel dimensions are stored
// in context.width, context.height and contex.pixelRatio.
export class Canvas extends React.Component {
	constructor(props) {
		super(props);

		this.fitToZoomAndPixelRatio = this.fitToZoomAndPixelRatio.bind(this);
		this.draw = this.draw.bind(this);

		this.state = {
			width: 1,
			height: 1,
			ratio: window.devicePixelRatio || 1,
			resizing: true,
		};

		const resize = () => { this.setState({ resizing: true }); };
		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// (unmount, resize, remount)-ing of the canvas.
		this.setResize = debounce(resize, 200);


		// Attach helper functions to context prototype
		if (CanvasRenderingContext2D.prototype.circle === undefined) {
			CanvasRenderingContext2D.prototype.circle = function (x, y, radius) {
				this.moveTo(x + radius, y);
				this.arc(x, y, radius, 0, 2 * Math.PI);
			};
		}
		if (CanvasRenderingContext2D.prototype.textSize === undefined) {
			CanvasRenderingContext2D.prototype.textSize = function (size = 10) {
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
		if (CanvasRenderingContext2D.prototype.textStyle === undefined) {
			CanvasRenderingContext2D.prototype.textStyle = function (fill = 'black', stroke = 'white', lineWidth = 2) {
				this.fillStyle = fill;
				this.strokeStyle = stroke;
				this.lineWidth = lineWidth;
			};
		}
		if (CanvasRenderingContext2D.prototype.drawText === undefined) {
			CanvasRenderingContext2D.prototype.drawText = function (text, x, y) {
				this.strokeText(text, x, y);
				this.fillText(text, x, y);
			};
		}
	}

	componentDidMount() {
		this.fitToZoomAndPixelRatio();
		window.addEventListener('resize', this.setResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.setResize);
	}

	componentDidUpdate(prevProps, prevState) {
		// if resizing was not true both before the update,
		// but is now, then the canvas has been unmounted
		if (!prevState.resizing && this.state.resizing) {
			this.fitToZoomAndPixelRatio();
		}

		if (!this.state.resizing && !prevProps.loop) {
			this.draw();
		}
	}

	// Make sure we get a sharp canvas on Retina displays
	// as well as adjust the canvas on zoomed browsers
	// Does NOT scale; painter functions decide how to handle
	// window.devicePixelRatio on a case-by-case basis
	fitToZoomAndPixelRatio() {
		const view = this.refs.view;
		const ratio = window.devicePixelRatio || 1;
		const width = (view.clientWidth * ratio) | 0;
		const height = (view.clientHeight * ratio) | 0;
		const resizing = false;
		this.setState({ width, height, ratio, resizing });
	}

	// Relies on a ref to a DOM element, so only call
	// when canvas element has been rendered!
	draw() {
		const { width, height, ratio, resizing } = this.state;
		if (!resizing) {
			const canvas = this.refs.canvas;
			let context = canvas.getContext('2d');
			// store width, height and ratio in context for paint functions
			context.width = width;
			context.height = height;
			context.pixelRatio = ratio;
			// should we clear the canvas every redraw?
			if (this.props.clear) { context.clearRect(0, 0, canvas.width, canvas.height); }
			this.props.paint(context);
			// is the provided paint function an animation? (not entirely sure about this API)
		}
		if (this.props.loop) {
			window.requestAnimationFrame(this.draw);
		}
	}

	render() {
		// The way canvas interacts with CSS layouting is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we completely remove
		// the node when resizing. After calculations are done,
		// we mount it again at the proper dimensions.
		let canvas = null;
		if (!this.state.resizing) {
			canvas = (<canvas
				ref='canvas'
				width={this.state.width}
				height={this.state.height}
				style={{
					width: '100%',
					height: '100%',
				}} />
			);
		}

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

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
	clear: PropTypes.bool,
	loop: PropTypes.bool,
	className: PropTypes.string,
	style: PropTypes.object,
};