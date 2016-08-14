import React, {PropTypes} from 'react';
import { debounce } from 'lodash';


// A simple helper component, wrapping retina logic for canvas.
// Expects a "painter" function that takes a "context" to draw on.
// This will draw on the canvas whenever the component updates.
export class Canvas extends React.Component {
	constructor(props) {
		super(props);

		this.fitToZoomAndPixelRatio = this.fitToZoomAndPixelRatio.bind(this);
		this.draw = this.draw.bind(this);
	}

	// Make sure we get a sharp canvas on Retina displays
	// as well as adjust the canvas on zoomed browsers
	fitToZoomAndPixelRatio() {
		let el = this.refs.canvas;
		if (el) {
			const ratio = window.devicePixelRatio || 1;
			const width = (el.parentNode.clientWidth * ratio) | 0;
			const height = (el.parentNode.clientHeight * ratio) | 0;
			if (width !== el.width || height !== el.height) {
				el.width = width;
				el.height = height;
				let context = el.getContext('2d');
				context.mozImageSmoothingEnabled = false;
				context.webkitImageSmoothingEnabled = false;
				context.msImageSmoothingEnabled = false;
				context.imageSmoothingEnabled = false;
				context.scale(ratio, ratio);
				context.clearRect(0, 0, el.width, el.height);
			}
		}
	}

	draw() {
		let el = this.refs.canvas;
		if (el) {
			this.fitToZoomAndPixelRatio();
			let context = el.getContext('2d');
			this.props.paint(context, el.clientWidth, el.clientHeight);
		}
	}

	componentDidMount() {
		this.draw();
		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// resizing/redrawing of the canvas.
		window.addEventListener("resize", debounce(this.draw, 200));
	}

	componentDidUpdate() {
		this.draw();
	}

	render() {
		return (
			<div style={{
				flex: '1 1 auto',
				margin: 0,
				padding: 0,
				border: 0,
			}}>
				<canvas
					ref='canvas'
					style={{ display: 'block', width: '100%', height: '100%' }}
					/>
			</div>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
};
