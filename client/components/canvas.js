import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	RemountOnResize,
} from './remount-on-resize';

class CanvasComponent extends PureComponent {

	draw() {
		const { canvas, props, state } = this;
		if (canvas && props.paint) {
			let context = canvas.getContext('2d');
			// store width, height and ratio in context for paint functions
			context.width = state.width;
			context.height = state.height;
			context.pixelRatio = state.ratio;
			context.pixelScale = state.pixelScale;
			// should we clear the canvas every redraw?
			if (props.clear) {
				if (props.bgColor) {
					context.fillStyle = props.bgColor;
					context.fillRect(0, 0, context.width, context.height);
				} else {
					context.clearRect(0, 0, context.width, context.height);
				}
			}
			props.paint(context);
		}
	}

	constructor(props) {
		super(props);
		this.mountedView = this.mountedView.bind(this);
		this.draw = this.draw.bind(this);
	}

	mountedView(view) {
		// Scaling lets us adjust the painter function for
		// high density displays and zoomed browsers.
		// Painter functions decide how to use scaling
		// on a case-by-case basis.
		if (view) {
			const pixelScale = this.props.pixelScale || 1;
			const ratio = window.devicePixelRatio || 1;
			const width = (view.clientWidth * ratio) | 0;
			const height = (view.clientHeight * ratio) | 0;
			this.setState({ view, width, height, ratio, pixelScale });
		}
	}


	componentDidUpdate() {
		if (this.props.redraw) {
			this.draw();
		}
	}

	render() {
		// The way canvas interacts with CSS layouting is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we only render it after
		// mounting view, that is: after CSS layouting is done.
		const canvas = this.state && this.state.view ? (
			<canvas
				ref={(cv) => { this.canvas = cv; }}
				width={this.state.width}
				height={this.state.height}
				style={{
					width: '100%',
					height: '100%',
				}}
			/>
		) : null;

		return (
			<div
				ref={this.mountedView}
				style={this.props.style}
			>
				{canvas}
			</div>
		);
	}
}

CanvasComponent.propTypes = {
	paint: PropTypes.func.isRequired,
	clear: PropTypes.bool,
	redraw: PropTypes.bool,
	pixelScale: PropTypes.number,
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
		const { props } = this;
		let style = Object.assign({}, props.style);
		let { width, height } = props;
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
				watchedVal={props.watchedVal}
			>
				<CanvasComponent
					paint={props.paint}
					clear={props.clear}
					bgColor={props.bgColor}
					pixelScale={props.pixelScale}
					redraw={props.redraw}
					className={props.className}
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
	pixelScale: PropTypes.number,
	watchedVal: PropTypes.any,
	className: PropTypes.string,
	style: PropTypes.object,
};