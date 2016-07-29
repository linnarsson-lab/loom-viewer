import React, {PropTypes} from 'react';

// A simple helper component, wrapping retina logic for Canvas.
// Expects a "painter" function that takes a "context" to draw on.
// This will draw on the canvas whenever the component updates.
export class Canvas extends React.Component {
	constructor(props) {
		super(props);

		this.retina_scale = this.retina_scale.bind(this);
		this.draw = this.draw.bind(this);
	}

	// Make sure we get a sharp canvas on Retina displays
	retina_scale(el, context) {
		const ratio = window.devicePixelRatio || 1;
		el.width = el.offsetWidth * ratio;
		el.height = el.offsetHeight * ratio;
		context.mozImageSmoothingEnabled = false;
		context.webkitImageSmoothingEnabled = false;
		context.msImageSmoothingEnabled = false;
		context.imageSmoothingEnabled = false;
		context.scale(ratio, ratio);
	}

	draw(){
		let el = this.refs.canvas;
		let context = el.getContext('2d');
		this.retina_scale(el, context);
		this.props.paint(context);
	}

	componentDidMount() {
		window.addEventListener("resize", this.draw);
		this.draw();
	}

	componentDidUpdate() {
		this.draw();
	}

	render() {
		return (
			<canvas ref='canvas' style={{ width: '100%', height: '100%' }}></canvas>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
};
