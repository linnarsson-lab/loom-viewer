import React, {
	Component,
} from 'react';
import PropTypes from 'prop-types';

import {
	Remount,
} from './remount';

import {
	AsyncPainter,
} from 'plotters/async-painter';

// Mounts a canvas, gets its context, and passes it to the AsyncPainter.
// Only renders when visible - pauses rendering otherwise
class CanvasComponent extends Component {
	constructor(...args) {
		super(...args);
		this.mountView = this.mountView.bind(this);
		this.mountCanvas = this.mountCanvas.bind(this);
		this.state = {};
	}

	componentWillUpdate(nextProps, nextState) {
		const {
			paint,
			asyncPainter,
		} = nextProps;
		const {
			context,
		} = nextState;

		// We only need to re-render if we have a new paint function
		const canRender = context && paint && asyncPainter;
		if (canRender && (paint !== this.props.paint || context !== this.state.context)) {
			asyncPainter.replaceBoth(paint, context);
		}
	}

	componentWillUnmount() {
		const {
			asyncPainter,
		} = this.props;
		// Remove context from painter, since the matching canvas will disappear too
		asyncPainter.replaceContext(null);
	}


	mountView(view) {
		// Scaling lets us adjust the painter function for
		// high density displays and zoomed browsers.
		// Painter functions decide how to use scaling
		// on a case-by-case basis.
		if (view) {
			const pixelScale = this.props.pixelScale || 1;
			const ratio = window.devicePixelRatio || 1;
			const width = (view.clientWidth * ratio) | 0;
			const height = (view.clientHeight * ratio) | 0;
			this.setState(() => {
				return {
					view,
					width,
					height,
					ratio,
					pixelScale,
				};
			});
		}
	}

	mountCanvas(canvas) {
		if (canvas) {
			let context = canvas.getContext('2d');
			const {
				state,
			} = this;
			// store width, height and ratio in context for paint functions
			context.width = state.width;
			context.height = state.height;
			context.pixelRatio = state.ratio;
			context.pixelScale = state.pixelScale;
			this.setState(() => {
				return {
					canvas,
					context,
				};
			});
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
				ref = {this.mountView}>
				{
					this.state.view ?
						( <canvas
							ref={this.mountCanvas}
							width={this.state.width}
							height={this.state.height}
							style={{
								width: '100%',
								height: '100%',
								display: 'block',
							}}
						/>
						) : null
				}
			</div>
		);
	}
}

CanvasComponent.propTypes = {
	asyncPainter: PropTypes.object.isRequired,
	paint: PropTypes.func,
	noBump: PropTypes.bool,
	pixelScale: PropTypes.number,
	className: PropTypes.string,
	style: PropTypes.object,
};

/**
 * A helper component, auto-resizing the canvas to fill its parent container.
 *
 * To determine size/layout, we just use CSS on the div containing the Canvas
 * component (we're using this with flexbox, for example).
 *
 * Expects a `paint` function that takes a `context` to draw on. After the canvas is mounted, this paint function will be called _once_. Pixel dimensions are stored in context.width, context.height and context.pixelRatio, making it possible for paint functions to depend on canvas size. Whenever the paint function or the canvas size changes it will	call this paint function, passing the canvas context
 */
export class Canvas extends Component {
	constructor(...args) {
		super(...args);
		this.asyncPainter = new AsyncPainter(null, null);
	}

	componentWillReceiveProps(nextProps){
		if(nextProps.forceUpdate){
			this.asyncPainter.enqueue(true);
		}
	}

	componentWillUnMount() {
		this.asyncPainter.remove();
	}

	render() {
		// If not given a width or height prop, make these fill their parent div
		// This will implicitly set the size of the <Canvas> component, which
		// will then call the passed paint function with the right dimensions.
		const {
			props,
		} = this;
		let style = Object.assign({}, props.style);
		let {
			width,
			height,
		} = props;
		if (width) {
			style.minWidth = (width | 0) + 'px';
			style.maxWidth = (width | 0) + 'px';
		}
		if (height) {
			style.minHeight = (height | 0) + 'px';
			style.maxHeight = (height | 0) + 'px';
		}
		/* Since canvas interferes with CSS layouting,
			we unmount and remount it on resize events,
			unless width and height are set */
		return (
			<Remount
				noResize={width !== undefined && height !== undefined}
				ignoreWidth={ props.ignoreWidth}
				ignoreHeight={props.ignoreHeight}
				ignoreResize={props.ignoreResize}
				watchedVal={props.watchedVal}>
				<CanvasComponent
					asyncPainter={this.asyncPainter}
					paint={props.paint}
					pixelScale={props.pixelScale}
					className={props.className}
					style={style} />
			</Remount>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func,
	/** Never bump rendering to front of queue */
	noBump: PropTypes.bool,
	/** Always enqueue when receiving props */
	forceUpdate: PropTypes.bool,
	width: PropTypes.number,
	height: PropTypes.number,
	pixelScale: PropTypes.number,
	/** Trigger remount whenever this value changes */
	watchedVal: PropTypes.any,
	/** Do not trigger remount on resize */
	ignoreResize: PropTypes.bool,
	/** Do not trigger remount on width resize */
	ignoreWidth: PropTypes.bool,
	/** Do not trigger remount on height resize */
	ignoreHeight: PropTypes.bool,
	className: PropTypes.string,
	style: PropTypes.object,
};