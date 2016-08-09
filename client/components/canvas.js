import React, {PropTypes} from 'react';

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
			let context = el.getContext('2d');
			const ratio = window.devicePixelRatio || 1;
			el.width = el.parentNode.clientWidth * ratio;
			el.height = el.parentNode.clientHeight * ratio;
			context.mozImageSmoothingEnabled = false;
			context.webkitImageSmoothingEnabled = false;
			context.msImageSmoothingEnabled = false;
			context.imageSmoothingEnabled = false;
			context.scale(ratio, ratio);
			context.clearRect(0, 0, el.width, el.height);
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
		window.addEventListener("resize", this.draw);
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
