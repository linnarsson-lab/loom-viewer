import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	Remount,
} from './remount';

import { AsyncPainter } from 'plotters/async-painter';

// Mounts a canvas and gets its context,
// then passes this context to the AsyncPainter.
class CanvasComponent extends PureComponent {
	constructor(...args) {
		super(...args);
		this.mountView = this.mountView.bind(this);
		this.mountCanvas = this.mountCanvas.bind(this);
		this.state = {};
	}

	componentWillUpdate(nextProps, nextState) {
		// if our AsyncPainter changed, and we have a
		// context, pass it the context to start rendering
		if (nextProps.AsyncPainter && nextState.context) {
			if (nextProps.AsyncPainter !== this.props.AsyncPainter && nextProps.AsyncPainter && nextState.context) {
				nextProps.AsyncPainter.replaceContext(nextState.context);
			}
		}
	}

	mountView(view){
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

	mountCanvas(canvas){
		if (canvas) {
			let context = canvas.getContext('2d');
			const { state } = this;
			// store width, height and ratio in context for paint functions
			context.width = state.width;
			context.height = state.height;
			context.pixelRatio = state.ratio;
			context.pixelScale = state.pixelScale;
			if (this.props.AsyncPainter) {
				this.props.AsyncPainter.replaceContext(context);
			}
			const newState = {
				canvas,
				context,
			};
			this.setState(() => {
				return newState;
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
				ref={this.mountView}>
				{
					this.state.view ?
						(
							<canvas
								ref={this.mountCanvas}
								width={this.state.width}
								height={this.state.height}
								style={{
									width: '100%',
									height: '100%',
									display: 'block',
								}}
							/>
						) :
						null
				}
			</div>
		);
	}
}

CanvasComponent.propTypes = {
	AsyncPainter: PropTypes.object.isRequired,
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
 * Expects a `paint` function that takes a `context` to draw on. After the canvas is mounted, this paint function will be called _once_. Pixel dimensions are stored in context.width, context.height and context.pixelRatio, making it possible for paint functions to depend on canvas size. Whenever the paint function or the canvas size changes it will  call this paint function, passing the canvas context
 */
export class Canvas extends PureComponent {
	constructor(...args) {
		super(...args);
		this.AsyncPainter = new AsyncPainter(this.props.paint, null);
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.paint !== this.props.paint) {
			this.AsyncPainter.replacePaint(nextProps.paint, nextProps.noBump);
		}
	}

	componentWillUnMount() {
		this.AsyncPainter.remove();
	}

	render() {
		// If not given a width or height prop, make these fill their parent div
		// This will implicitly set the size of the <Canvas> component, which
		// will then call the passed paint function with the right dimensions.
		const { props } = this;
		let style = Object.assign({}, props.style);
		let {
			width, height,
		} = props;
		if (width) {
			style.minWidth = (width | 0) + 'px';
			style.maxWidth = (width | 0) + 'px';
		}
		if (height) {
			style.minHeight = (height | 0) + 'px';
			style.maxHeight = (height | 0) + 'px';
		}
		return (
			<Remount
				/* Since canvas interferes with CSS layouting,
				we unmount and remount it on resize events,
				unless width and height are set */
				noResize={width !== undefined && height !== undefined}
				ignoreWidth={props.ignoreWidth}
				ignoreHeight={props.ignoreHeight}
				ignoreResize={props.ignoreResize}
				watchedVal={props.watchedVal} >
				<CanvasComponent
					AsyncPainter={this.AsyncPainter}
					pixelScale={props.pixelScale}
					className={props.className}
					style={style}
				/>
			</Remount>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func,
	/** Never bump rendering to front of queue */
	noBump: PropTypes.bool,
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