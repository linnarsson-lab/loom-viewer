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
	}

	// Make sure we get a sharp canvas on Retina displays
	// as well as adjust the canvas on zoomed browsers
	fitToZoomAndPixelRatio() {
		let el = this.refs.canvas;
		if (el) {
			const ratio = window.devicePixelRatio || 1;
			const width = (el.parentNode.clientWidth * ratio) | 0;
			const height = (el.parentNode.clientHeight * ratio) | 0;
			if (width !== el.width || height !== el.height) {
				el.width = width;
				el.height = height;
				let context = el.getContext('2d');
				context.mozImageSmoothingEnabled = false;
				context.webkitImageSmoothingEnabled = false;
				context.msImageSmoothingEnabled = false;
				context.imageSmoothingEnabled = false;
				context.scale(ratio, ratio);
				context.clearRect(0, 0, el.width, el.height);
			}
		}
	}

	draw() {
		let el = this.refs.canvas;
		if (el) {
			this.fitToZoomAndPixelRatio();
			let context = el.getContext('2d');
			if (context) {
				this.props.paint(context, el.clientWidth, el.clientHeight);
			}
			if (this.props.loop) {
				window.requestAnimationFrame(this.draw);
			}
		}
	}

	componentDidMount() {
		this.draw();
		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// resizing/redrawing of the canvas.
		window.addEventListener("resize", debounce(this.draw, 200));
	}

	componentDidUpdate(prevProps) {
		// only call draw if it wasn't already looping
		if (!prevProps.loop) {
			this.draw();
		}
	}

	render() {
		return (
			<div className='view' style={this.props.style}>
				<canvas
					ref='canvas'
					style={{
						display: 'block',
						width: '100%',
						height: '100%',
					}}
					/>
			</div>
		);
	}
}

Canvas.propTypes = {
	paint: PropTypes.func.isRequired,
	loop: PropTypes.bool,
	style: PropTypes.object,
};



export class CanvasBenchmark extends React.Component {

	constructor(props) {
		super(props);

		this.generateSprite = this.generateSprite.bind(this);
		this.generatePoints = this.generatePoints.bind(this);
		this.paintArc = this.paintArc.bind(this);
		this.paintSprite = this.paintSprite.bind(this);

		// save sprite and timer in component state;
		const drawTime = 0.0;
		// save to component state
		this.state = {
			drawTime,
			selectedPainter: this.paintSprite,
			playing: false,
			totalDots: 20000,
		};
	}

	generateSprite(totalDots) {
		// create a pre-rendered dot sprite
		const radius = Math.max(3, Math.sqrt(totalDots) / 60) | 0;
		const sprite = document.createElement('canvas');
		sprite.id = "dot_sprite";
		sprite.width = 2 * radius + 1;
		sprite.height = 2 * radius + 1;
		const context = sprite.getContext('2d');
		// draw dot on sprite
		context.lineWidth = 1;
		context.strokeStyle = "white";
		context.fillStyle = "black";
		context.beginPath();
		context.arc(sprite.width / 2 | 0, sprite.height / 2 | 0, radius, 0, 2 * Math.PI, false);
		context.closePath();
		context.stroke();
		context.fill();
		this.setState({ sprite });
	}

	// create x and y arrays with random points between 0-1
	// not included in rendering timing
	generatePoints() {
		if (this.state) {
			const totalDots = this.state.totalDots;
			const x = new Array(totalDots);
			const y = new Array(totalDots);
			for (let i = 0; i < totalDots; i++) {
				x[i] = Math.random();
				y[i] = Math.random();
			}
			return { x, y };
		}
	}

	paintArc(context, width, height) {
		if (this.state) {

			const { x, y } = this.generatePoints();
			const TWO_PI = 2 * Math.PI;
			const radius = Math.max(3, Math.sqrt(x.length) / 60) | 0;	// Suitable radius of the markers

			context.lineWidth = 1;
			context.strokeStyle = "white";
			context.fillStyle = "black";
			context.clearRect(0, 0, width, height);
			for (let i = 0; i < x.length; i++) {
				const xi = (x[i] * width) | 0;
				const yi = (y[i] * height) | 0;
				context.beginPath();
				context.arc(xi, yi, radius, 0, TWO_PI, false);
				context.closePath();
				context.stroke();
				context.fill();
			}
		}
	}

	paintSprite(context, width, height) {
		if (this.state) {
			if (this.state.sprite) {
				const { x, y } = this.generatePoints();

				const { sprite } = this.state;
				context.clearRect(0, 0, width, height);
				for (let i = 0; i < x.length; i++) {
					const xi = (x[i] * width) | 0;
					const yi = (y[i] * height) | 0;
					context.drawImage(sprite, xi, yi);
				}
			}
			else {
				this.generateSprite(this.state.totalDots);
			}
		}
	}

	render() {
		const { selectedPainter, playing } = this.state;
		const isArcs = selectedPainter === this.paintArc;
		const isSprites = selectedPainter === this.paintSprite;
		return (
			<div className='view'>
				<ButtonGroup>
					<Button
						bsStyle={ isArcs ? 'success' : 'default' }
						onClick={ () => { this.setState({ selectedPainter: this.paintArc }); } } >
						Arcs
					</Button>
					<Button
						bsStyle={ isSprites ? 'success' : 'default' }
						onClick={ () => { this.setState({ selectedPainter: this.paintSprite }); } }  >
						Sprites
					</Button>
					<Button
						bsStyle={ playing ? 'warning' : 'success' }
						onClick={ () => { this.setState({ playing: !this.state.playing }); } }>
						<Glyphicon glyph={ playing ? 'pause' : 'play' } />
					</Button>
				</ButtonGroup>

				<div className='view'>
					<Canvas
						paint={ selectedPainter }
						loop={ this.state.playing } />
				</div>
			</div>
		);
	}
}
