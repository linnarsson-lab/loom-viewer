import React, {PropTypes} from 'react';

// A simple helper component, wrapping retina logic for canvas.
// Expects a "painter" function that takes a "context" to draw on.
// This will draw on the canvas whenever the component updates.
export class Canvas extends React.Component {
	constructor(props) {
		super(props);

		this.scaleAndDraw = this.scaleAndDraw.bind(this);
		this.draw = this.draw.bind(this);
	}

	// TODO: One day, make this not-broken with browser-zoom
	// Make sure we get a sharp canvas on Retina displays
	scaleAndDraw() {
		let el = this.refs.canvas;
		let context = el.getContext('2d');
		const ratio = window.devicePixelRatio || 1;
		console.log("ratio: ", ratio);
		el.width = el.parentNode.clientWidth * ratio;
		el.height = el.parentNode.clientHeight * ratio;
		context.mozImageSmoothingEnabled = false;
		context.webkitImageSmoothingEnabled = false;
		context.msImageSmoothingEnabled = false;
		context.imageSmoothingEnabled = false;
		context.scale(ratio, ratio);
		this.draw();
	}

	draw() {
		let el = this.refs.canvas;
		let context = el.getContext('2d');
		context.clearRect(0, 0, el.width, el.height);
		this.props.paint(context, el.clientWidth, el.clientHeight);
	}

	componentDidMount() {
		this.scaleAndDraw();
		window.addEventListener("resize", this.scaleAndDraw);
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
				border: 'none',
			}}>
				<canvas
					ref='canvas'
					style={{ width: '100%', height: '100%' }}
					/>
			</div>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
};
