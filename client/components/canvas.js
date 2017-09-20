import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	RemountOnResize,
} from './remount-on-resize';

import {
	textSize,
	textStyle,
	drawText,
} from '../plotters/canvas';

const noop = () => { };

function makeIdlePainter(paint) {
	let running = false;

	let isRunning = () => {
		return (running);
	};

	let apply = (context) => {
		if (!running) {
			running = true;
			// indicate that we are rendering a new painter
			let size = Math.min(context.height / 3 | 0, 20);
			let height = Math.min(context.height / 3 | 0, 40);
			textSize(context, size);
			textStyle(context, 'black', 'white', 5);
			drawText(context, 'Rendering...', size, height);
			// render in background
			requestIdleCallback(() => {
				context.clearRect(0, 0, context.width, context.height);
				paint(context);
				running = false;
			});
		}
	};

	let cancel = () => {
		paint = noop;
	};

	let replace = (newPainter) => {
		paint = newPainter;
	};
	return { apply, isRunning, cancel, replace };
}

class CanvasComponent extends PureComponent {

	constructor(props) {
		super(props);

		this.mountView = (view) => {
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
		};

		this.mountCanvas = (canvas) => {
			if (canvas) {
				let context = canvas.getContext('2d');
				const { state } = this;
				// store width, height and ratio in context for paint functions
				context.width = state.width;
				context.height = state.height;
				context.pixelRatio = state.ratio;
				context.pixelScale = state.pixelScale;
				let idlePainter = this.props.paint ? makeIdlePainter(this.props.paint) : noop;
				this.setState({ canvas, context, idlePainter });
			}
		};

		this.state = {};
	}

	componentWillUpdate(nextProps, nextState) {
		const {
			idlePainter,
			context,
		} = nextState;

		const {
			paint,
		} = nextProps;


		if (idlePainter && context) {
			if (paint && this.props.paint !== paint) {
				// if our painter changed, update idlePainter accordingly
				idlePainter.replace(paint);
			}
			// draw plot in "background thread"
			// (technically there's no such thing in JS)
			idlePainter.apply(context);
		}
	}

	componentWillUnMount() {
		if (this.state.idlePainter) {
			this.state.idlePainter.cancel();
		}
	}

	render() {
		// The way canvas interacts with CSS layout is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we only mount it after
		// mounting view.
		return (
			<div
				className={this.props.className}
				style={this.props.style}
				ref={this.mountView}>
				{
					this.state.view ? (
						<canvas
							ref={this.mountCanvas}
							width={this.state.width}
							height={this.state.height}
							style={{
								width: '100%',
								height: '100%',
							}}
						/>
					) : null
				}
			</div>
		);
	}
}

CanvasComponent.propTypes = {
	paint: PropTypes.func.isRequired,
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
// in context.width, context.height and context.pixelRatio.
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
					bgColor={props.bgColor}
					pixelScale={props.pixelScale}
					className={props.className}
					style={style}
				/>
			</RemountOnResize>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
	width: PropTypes.number,
	height: PropTypes.number,
	pixelScale: PropTypes.number,
	watchedVal: PropTypes.any,
	className: PropTypes.string,
	style: PropTypes.object,
};