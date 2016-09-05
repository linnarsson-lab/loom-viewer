import React, {PropTypes} from 'react';
import { debounce } from 'lodash';
import {  ButtonGroup, Button, Glyphicon } from 'react-bootstrap';


// A simple helper component, wrapping retina logic for canvas.
// Expects a "painter" function that takes a "context" to draw on.
// This will draw on the canvas whenever the component updates.
export class Canvas extends React.Component {
	constructor(props) {
		super(props);

		this.fitToZoomAndPixelRatio = this.fitToZoomAndPixelRatio.bind(this);
		this.draw = this.draw.bind(this);

		this.state = {
			width: 1,
			height: 1,
			resizing: true,
		};

		const resize = () => { this.setState({ resizing: true }); };
		this.setResize = debounce(resize, 200);
	}

	componentDidMount() {
		this.fitToZoomAndPixelRatio();
		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// resizing/redrawing of the canvas.
		window.addEventListener('resize', this.setResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.setResize);
	}

	componentDidUpdate(prevProps, prevState) {

		// If resizing was true, but no longer, this means
		// that on our last render canvas was unmounted
		if (prevState.resizing && !this.state.resizing) {
			this.fitToZoomAndPixelRatio();
		}

		// Only call draw if it wasn't already looping;
		// in the latter case it will re-render on its own
		if (!prevProps.loop) {
			this.draw();
		}
	}

	// Make sure we get a sharp canvas on Retina displays
	// as well as adjust the canvas on zoomed browsers
	fitToZoomAndPixelRatio() {
		const ratio = window.devicePixelRatio || 1;
		const view = this.refs.view;
		const width = (view.clientWidth * ratio) | 0;
		const height = (view.clientHeight * ratio) | 0;
		this.setState({ width, height, ratio });
	}

	// Relies on a ref to a DOM element, so only call after mounting!
	draw() {
		if (!this.state.resizing) {
			let canvas = this.refs.canvas;
			const { width, height, ratio } = this.state;
			let context = canvas.getContext('2d');
			// store width, height and ratio in context for paint functions
			context.width = width;
			context.height = height;
			context.pixelRatio = ratio;
			// should we clear the canvas every redraw?
			if (this.props.clear) { context.clearRect(0, 0, canvas.width, canvas.height); }
			this.props.paint(context);
			// is the provided paint function an animation?
			if (this.props.loop) {
				window.requestAnimationFrame(this.draw);
			}
		}
	}

	render() {
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
		} else {
			this.setState({ resizing: false });
		}

		return (
			<div
				className='view'
				ref='view'
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
	style: PropTypes.object,
};