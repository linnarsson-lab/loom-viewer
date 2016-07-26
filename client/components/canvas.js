import React, {PropTypes} from 'react';
import { findDOMNode } from 'react-dom';

// A simple helper component, wrapping retina logic for Canvas.
// Expects a "painter" function that takes a "context" to draw on.
// This will draw on the canvas whenever the component updates.
export class Canvas extends React.Component {
	constructor(props) {
		super(props);
	}

	// Make sure we get a sharp canvas on Retina displays
	retina_scale(el, context) {
		const ratio = window.devicePixelRatio || 1;
		el.style.width = this.props.width + "px";
		el.style.height = this.props.height + "px";
		el.width = this.props.width * ratio;
		el.height = this.props.height * ratio;
		context.mozImageSmoothingEnabled = false;
		context.webkitImageSmoothingEnabled = false;
		context.msImageSmoothingEnabled = false;
		context.imageSmoothingEnabled = false;
		context.scale(ratio, ratio);
	}

	componentDidMount() {
		// although using setState in componentDidMount is dirty,
		// we have to ensure that the canvas node has already
		// been rendered by the time we try to get it
		const el = findDOMNode(this);
		const context = el.getContext('2d');
		this.retina_scale(el, context);
		this.setState({ context });
	}

	componentDidUpdate() {
		this.props.paint(this.state.context);
	}

	render() {
		return (
			<canvas width={this.props.width} height={this.props.height}></canvas>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
	width: PropTypes.number.isRequired,
	height: PropTypes.number.isRequired,
};
