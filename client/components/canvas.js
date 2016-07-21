import React, {PropTypes} from 'react';
import { findDOMNode } from 'react-dom';

// A simple helper component, wrapping retina logic for Canvas.
// Expects a "paint" function that takes a "context" to draw on.
export class Canvas extends React.Component {
	constructor(props) {
		super(props);
	}

	retina_scale(el) {
		const context = el.getContext('2d');
		const ratio = window.devicePixelRatio || 1;
		el.style.width = this.props.width + "px";
		el.style.height = this.props.height + "px";
		el.width = this.props.width * ratio;
		el.height = this.props.height * ratio;
		context.scale(ratio, ratio);
	}

	componentDidMount() {
		const el = findDOMNode(this);
		this.retina_scale(el);	// Make sure we get a sharp canvas on Retina displays
		const context = el.getContext('2d');
		this.props.paint(context);
	}

	componentDidUpdate() {
		const el = findDOMNode(this);
		this.retina_scale(el);	// Make sure we get a sharp canvas on Retina displays
		const context = el.getContext('2d');
		this.props.paint(context);
	}

	componentWillUnmount() {
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
