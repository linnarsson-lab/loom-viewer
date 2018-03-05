import {
	circlePath,
	drawText,
	fillPath,
	strokePath,
	textSize,
	textStyle,
} from '../plotters/canvas-util';

import {
	nullPainter,
} from '../plotters/nullpainter';

import {
	clipRange,
	constrain,
	countUniques,
	findSourceIndices,
	isLittleEndian,
	isTypedArray,
	logProject,
	rndNormArray,
} from '../js/util';

import {
	attrToColorFactory,
	attrToColorIndexFactory,
	getPalette,
} from '../js/colors';

const {
	PI,
	sin,
	cos,
} = Math;
const TAU = 2 * PI;

// "global" array of sprite canvases.
// Dots will be drawn in later (depends on colour settings)
// Multiple radii; no need to draw a 256x256 image for a 8x8 dot
const allSprites = (() => {
	const _allSprites = [];
	for (let j = 0; j < 6; j++) {
		const _sprites = [];
		for (let i = 0; i < 257; i++) {
			_sprites.push(document.createElement('canvas'));
			_sprites[i].id = `dot_sprite_${j}_${i}`;
			_sprites[i].width = 4 << j;
			_sprites[i].height = 4 << j;
		}
		_allSprites.push(_sprites);
	}
	return _allSprites;
})();

// Type hints for memoization initialisation
const tObject = {};
// const tUint8Array = new Uint8Array(1);
// const tUint16Array = new Uint16Array(1);
const tUint32Array = new Uint32Array(1);
// const tFloat32Array = new Float32Array(1);

const {
	log2,
} = Math;

function DerivedData() {
	let backingArrays = new BackingArrays(0);
	this.backingArrays = backingArrays;
	this.colorData = new ColorData(backingArrays);
	this.coordinates = new Coordinates(backingArrays);
	this.calcLayout = new CalcLayout();
	this.renderedSprites = new PrerenderSprites(backingArrays);
	this.scaledXY = new ScaleToContext(backingArrays);
	this.sortedData = new SortRenderOrder(backingArrays);
	this.blitSprites = new BlitSprites();
	this.context = {
		width: 0,
		height: 0,
		pixelRatio: 0,
	};
	this.mContext = tObject;
}

DerivedData.prototype.updateContext = function (context) {
	this.mContext = context;
	this.context.width = context.width;
	this.context.height = context.height;
	this.context.pixelRatio = context.pixelRatio;
};

DerivedData.prototype.resize = function (totalIndices) {
	let {
		backingArrays,
	} = this;
	let spriteLength = backingArrays.spriteLength;
	if (backingArrays.resize(totalIndices, spriteLength)) {
		this.colorData.resize(backingArrays);
		this.coordinates.resize(backingArrays);
		this.scaledXY.resize(backingArrays);
		this.sortedData.resize(backingArrays);
		return true;
	}
	return false;
};

export function memoizedScatterPlot() {

	let args = new Args(),
		pArgs = new Args(),
		u = new Update(),
		m = new DerivedData();

	let {
		backingArrays,
		calcLayout,
		colorData,
		coordinates,
		renderedSprites,
		scaledXY,
		sortedData,
		blitSprites,
	} = m;

	const scatterplotPainter = (context) => {
		context.save();
		// Mark if context changed (for layout and sprite prep)
		u.updateContext(m, context);
		m.updateContext(context);
		let {
			labelLayout,
			spriteLayout,
		} = calcLayout;

		calcLayout.update(args, u, context);

		if (u.totalIndices || u.calcLayout) {
			backingArrays.resize(args.totalIndices, spriteLayout.spriteLength);
			renderedSprites.resize(backingArrays);
			sortedData.resize(backingArrays);
		}

		renderedSprites.update(args, u, args.color.mode, args.color.attr, spriteLayout);

		scaledXY.update(args, u, coordinates, spriteLayout, labelLayout);

		u.sortedData = u.scaledXY;
		if (u.sortedData) {
			sortedData.update(
				colorData.cIdx,
				scaledXY.x.iData,
				scaledXY.y.iData,
				spriteLayout.x,
				spriteLayout.y,
				spriteLayout.height,
				spriteLayout.spriteLength,
				spriteLayout.spriteRadius
			);
		}

		// Now that we converted the coordinates,
		// prepared the sprites and the colour indices
		// to look them up, we can blit them to the canvas.
		// This weird way of calling blitSprites is to help the JIT
		u.blitSprites = (
			u.convertCoordinates ||
			u.convertColorData ||
			u.calcLayout ||
			u.prerenderSprites ||
			u.scaledXY ||
			u.sortedData
		);
		if (u.blitSprites) {
			// Blit sprites to context
			blitSprites.blit(
				context,
				m.context.width,
				m.context.height,
				spriteLayout.spriteLength,
				spriteLayout.spriteW,
				sortedData.xySprites,
				renderedSprites.spriteData32
			);

			// Self-explanatory
			drawLabels(
				labelLayout,
				coordinates.labels,
				context
			);

			// Heatmap scale, if necessary
			if (args.color.mode === 'Heatmap') {
				drawHeatmapScale(
					args.color,
					args.settings,
					labelLayout,
					context
				);
			}

		}

		finaliseRender(args, pArgs, u);

		context.restore();

		// When switching from one (x,y) coordinates to another,
		// we animate the scatterplot to make correlations between
		// data more discoverable.
		return m.scaledXY.animationInProgress;
	};

	const scatterplotUpdate = (cAttr, xAttr, yAttr, ascIndices, settings) => {
		if (cAttr && xAttr && yAttr && ascIndices && settings) {
			updateArgs(args, pArgs, u, cAttr, xAttr, yAttr, ascIndices, settings);
			// The following things are independent of context,
			// so we precompute them once and re-use them during
			// re-renders (like animated transitions).

			// If the total number of indices changes,
			// all backing arrays need to be resized.
			if (u.totalIndices) {
				u.backingArrays = m.resize(args.totalIndices);
			}

			// Convert color data to lookup indices for sprites.
			// We can't pre-render the sprites themselves yet,
			// because their dimension may change to fit context size.
			colorData.convert(args, u);

			// Convert x and y attributes to coordinates, and find
			// the label positions of grouped labels.
			coordinates.convert(args, u);

			return scatterplotPainter;
		}
		return nullPainter;
	};
	return scatterplotUpdate;
}


/**
 * Args stores the arguments passed to mScatterplot
 * via update. All other memoisation objects derive
 * their state from it.
 */
function Args() {
	this.width = 0;
	this.height = 0;
	this.pixelRatio = 0;
	this.scaleFactor = 50;
	this.totalIndices = 0;
	this.ascIndices = tUint32Array;
	this.x = new ArgsAxis();
	this.y = new ArgsAxis();
	this.color = new ArgsColor();
	this.settings = tObject;
}

function ArgsAxis() {
	this.logScale = false;
	this.jitter = false;
	this.attr = tObject;
}

function ArgsColor() {
	this.mode = '';
	this.logScale = false;
	this.clip = false;
	this.lowerBound = 0;
	this.upperBound = 0;
	this.attr = tObject;
}

/**
 * Update keeps track of whether Args has
 * changed compared to the previous state update.
 * (assumes that passed data is immutable)
 */
function Update() {
	// Keep track of Args updates
	this.scaleFactor = false;
	this.ascIndices = false;
	this.totalIndices = false;
	this.settings = false;
	this.x = new UpdateAxis();
	this.y = new UpdateAxis();
	this.color = new UpdateColor();
	// Keep track of which derived state updated
	this.backingArrays = false;
	this.convertColorData = false;
	this.convertCoordinates = false;
	this.calcLayout = false;
	this.prerenderSprites = false;
	this.scaledXY = false;
	this.sortedData = false;
	this.blitSprites = false;
	// Keep track of context updates
	this.width = false;
	this.height = false;
	this.pixelRatio = false;
	this.context = false;
}

function UpdateAxis() {
	this.logScale = false;
	this.jitter = false;
	this.attr = false;
}

function UpdateColor() {
	this.mode = false;
	this.logScale = false;
	this.clip = false;
	this.lowerBound = false;
	this.upperBound = false;
	this.attr = false;
}

/**
 * Update the state of `args` the passed arguments.
 * Tracks what has changed via direct comparisons and via
 * the `args` used in the last render, which is stored in
 * `pArgs`. (the reason for this is that passing arguments
 * happens asynchronously with rendering, and in theory
 * `updateArgs` could be called multiple times before a
 * frame is rendered). Changes are stored in `u`.
 * @param {Args} args
 * @param {Args} pArgs
 * @param {Update} u
 * @param {Uint32Array} ascIndices
 * @param {*} cAttr
 * @param {*} xAttr
 * @param {*} yAttr
 * @param {*} settings
 */
function updateArgs(args, pArgs, u, cAttr, xAttr, yAttr, ascIndices, settings) {
	const totalIndices = cAttr.data.length;
	let {
		colorMode,
		logScale,
		clip,
		scaleFactor,
		lowerBound,
		upperBound,
	} = settings;
	let ac = args.color,
		pc = pArgs.color,
		uc = u.color;
	let ax = args.x,
		px = pArgs.x,
		ux = u.x;
	let ay = args.y,
		py = pArgs.y,
		uy = u.y;
	const sx = settings.x,
		sy = settings.y;
	// Keep track of changes. We compare against the last state
	// used in a render, as well as the last state passed.
	scaleFactor = scaleFactor || 50;
	u.scaleFactor = pArgs.scaleFactor !== scaleFactor || args.scaleFactor !== scaleFactor;
	u.ascIndices = pArgs.ascIndices !== ascIndices || args.ascIndices !== ascIndices;
	u.totalIndices = pArgs.totalIndices !== totalIndices || args.totalIndices !== totalIndices;

	uc.attr = pc.attr !== cAttr || ac.attr !== cAttr;
	uc.mode = pc.mode !== colorMode || ac.mode !== colorMode;
	uc.logScale = pc.logScale !== logScale || ac.logScale !== logScale;
	uc.lowerBound = pc.lowerBound !== lowerBound || ac.lowerBound !== lowerBound;
	uc.upperBound = pc.upperBound !== upperBound || ac.upperBound !== upperBound;
	uc.clip = pc.clip !== clip || ac.clip !== clip || uc.lowerBound || uc.upperBound;

	ux.attr = px.attr !== xAttr || ax.attr !== xAttr;
	ux.logScale = px.logScale !== sx.logScale || ax.logScale !== sx.logScale;
	ux.jitter = px.jitter !== sx.jitter || ax.jitter !== sx.jitter;

	uy.attr = py.attr !== yAttr || ay.attr !== yAttr;
	uy.logScale = py.logScale !== sy.logScale || ay.logScale !== sy.logScale;
	uy.jitter = py.jitter !== sy.jitter || ay.jitter !== sy.jitter;

	// Assign new data. Note: we do not update pBase here,
	// since we are using it to compare the current data
	// to the data used in the last render.
	// Therefore, pBase is only updated after a render.
	args.scaleFactor = scaleFactor || 50;
	args.ascIndices = ascIndices;
	args.totalIndices = totalIndices;
	args.settings = settings;

	ac.attr = cAttr;
	ac.mode = colorMode;
	ac.logScale = logScale;
	ac.clip = clip;
	ac.lowerBound = lowerBound;
	ac.upperBound = upperBound;

	ax.attr = xAttr;
	ax.logScale = sx.logScale;
	ax.jitter = sx.jitter;

	ay.attr = yAttr;
	ay.logScale = sy.logScale;
	ay.jitter = sy.jitter;
}

/**
 * @param {DerivedData} m
 * @param {tObject} context
 */
Update.prototype.updateContext = function (m, context) {
	this.context = m.mContext !== context;
	this.width = m.context.width !== context.width;
	this.height = m.context.height !== context.height;
	this.pixelRatio = m.context.pixelRatio !== context.pixelRatio;
};

/**
 * A lot of our objects use TypedArrays, and for
 * the most part their sizes are fixed to the number
 * of columns/rows. Given that the size is perfectly
 * predictable, we use one ArrayBuffer for all of them
 * for better cache coherence.
 *
 * @param {number} totalIndices
 * @param {number} spriteLength size in width*height
 */
function BackingArrays(totalIndices, spriteLength) {
	let t = totalIndices | 0;
	let s = spriteLength | 0;
	this.totalIndices = t;
	this.spriteLength = s;
	// See below for how we added up to this number.
	// In theory, it might be that we need more memory
	// than one contiguous ArrayBuffer can hold.
	// ArrayBuffer can be at most 2**32 bytes long.
	let buffer = new ArrayBuffer(t * 48 + 256 * 4 * 4);
	let spriteBuffer = new ArrayBuffer(t * 8 + 257 * 4 * s);

	// ColorData
	this.cIdx = new Uint16Array(buffer, 0, t); // 2x - offset after, in bytes
	this.cIdxFull = new Uint16Array(buffer, t * 2, t); // 4x

	// Coordinates
	this.coordinates = {
		x: new Float32Array(buffer, t * 4, t), // 8x
		y: new Float32Array(buffer, t * 8, t), // 12x
	};

	// ScaleToContext
	this.scaleToContext = {
		x: {
			data: new Float32Array(buffer, t * 12, t), // 16x
			iData: new Float32Array(buffer, t * 16, t), // 20x
			pData: new Float32Array(buffer, t * 20, t), // 24x
		},
		y: {
			data: new Float32Array(buffer, t * 24, t), // 28x
			iData: new Float32Array(buffer, t * 28, t), // 32x
			pData: new Float32Array(buffer, t * 32, t), // 36x
		},
	};

	// SortRenderOrder
	this.compVal = new Uint32Array(buffer, t * 36, t); // 40x
	this.count = new Uint32Array(buffer, t * 40, 256 * 4); // 44x + 1024
	this.indices = new Uint32Array(buffer, t * 40 + 256 * 4 * 4, t * 2); // 48x + 1024

	this.xySprites = new Uint32Array(spriteBuffer, 0, t * 2); // 8x

	// PrerenderSprites
	// - at the end because we look up large sprites via xySprites when blitting,
	//	 and we pre-allocate the largest possible sprites length once
	this.spriteData32 = new Uint32Array(spriteBuffer, t * 8, 257 * s);

}

/**
 * @param {number} totalIndices
 * @param {number} spriteLength
 */
BackingArrays.prototype.resize = function (totalIndices, spriteLength) {
	let t = (totalIndices | 0) || this.totalIndices;
	let s = (spriteLength | 0) || this.spriteLength;
	let changed = t !== this.totalIndices || s !== this.spriteLength;
	if (this.totalIndices !== t) {
		this.totalIndices = t;

		let buffer = new ArrayBuffer(t * 48 + 256 * 4 * 4);

		this.cIdx = new Uint16Array(buffer, 0, t);
		this.cIdxFull = new Uint16Array(buffer, t * 2, t);
		this.coordinates = {
			x: new Float32Array(buffer, t * 4, t),
			y: new Float32Array(buffer, t * 8, t),
		};
		this.scaleToContext = {
			x: {
				data: new Float32Array(buffer, t * 12, t),
				iData: new Float32Array(buffer, t * 16, t),
				pData: new Float32Array(buffer, t * 20, t),
			},
			y: {
				data: new Float32Array(buffer, t * 24, t),
				iData: new Float32Array(buffer, t * 28, t),
				pData: new Float32Array(buffer, t * 32, t),
			},
		};
		this.compVal = new Uint32Array(buffer, t * 36, t);
		this.count = new Uint32Array(buffer, t * 40, 256 * 4);
		this.indices = new Uint32Array(buffer, t * 40 + 256 * 4 * 4, t * 2);
	}
	if (this.spriteLength !== s) {
		this.spriteLength = s;
		let spriteBuffer = new ArrayBuffer(t * 8 + 257 * 4 * s);
		this.xySprites = new Uint32Array(spriteBuffer, 0, t * 2); // 8x
		this.spriteData32 = new Uint32Array(spriteBuffer, t * 8, 257 * s);
	}
	return changed;
};

/**
 * `ColorData` stores the indices to the sprite
 * belonging to a given data point.
 *
 * The total number of sprites is determined by
 * the palette size, which is at most 257
 * (blank + 256 colors), so we are forced to
 * use a `Uint16Array`.
 *
 * `ColorData.cIdxFull` stores the sprite index
 * for all datapoints.

 * `ColorData.cIdx` is a selection of that based
 * on `ascendingIndices`, making everything else
 * blank.
 *
 * Later on, to reduce cache misses when drawing,
 * instead of storing pixel data of the sprites
 * separately (an array of `Uint32Arrays`), we
 * use a single `Uint32Array` with pixel data
 * of all sprites stored sequentially.
 *
 * Essentially, we will use a 1D texture atlas.
 *
 * See `SortRenderOrder` for more details on that.
 *
 * Hence, a that stage, `cIdx` will be converted
 * to the appropriate offset to the sprite section.
 * Our sprites are up to 128x128 pixels (nb: all
 * sprites are square and the same size), a 14
 * bit value, times 257, a 9 bit value. So we
 * need at least 23 bits for `spriteOffSet`,
 * hence the `Uint32Array`.
 * @param {BackingArrays} backingArrays
 */
function ColorData(backingArrays) {
	this.cIdx = backingArrays.cIdx;
	this.cIdxFull = backingArrays.cIdxFull;
}

/** @param {BackingArrays} backingArrays */
ColorData.prototype.resize = function (backingArrays) {
	this.cIdx = backingArrays.cIdx;
	this.cIdxFull = backingArrays.cIdxFull;
};

/**
 * Create indices for visible sprites. Note: filtered
 * sprites are not removed, just greyed out in the background.
 * @param {Args} args
 * @param {Update} u
 */
ColorData.prototype.convert = function (args, u) {
	const {
		totalIndices,
		ascIndices,
		settings,
	} = args;
	const {
		attr,
		mode,
	} = args.color;

	// Colors change when:
	// - color attr changes
	// - color mode changes
	// - we have a heatmap-mode and the clip or logscale setting changes
	const uc = u.color;
	const changedColors = (uc.attr || uc.mode) ||
		(uc.logScale || uc.clip) && (
			mode === 'Heatmap' ||
			mode === 'Flame' ||
			mode === 'Icicle'
		);

	let {
		cIdx,
		cIdxFull,
	} = this;
	if (changedColors || u.totalIndices) {
		// Convert to palette indices
		const dataToIdx = attrToColorIndexFactory(attr, mode, settings);
		const data = attr.data;
		for (let i = 0; i < cIdxFull.length; i++) {
			let colorIndex = dataToIdx(data[i]);
			cIdxFull[i] = colorIndex;
		}
	}

	if (changedColors || u.totalIndices || u.ascIndices) {
		if (ascIndices.length === totalIndices) {
			cIdx.set(cIdxFull);
		} else {
			// set all to zero by default
			cIdx.fill(0);
			// only color the sprites that are selected
			for (let i = 0; i < ascIndices.length; i++) {
				let j = ascIndices[i];
				cIdx[j] = cIdxFull[j];
			}
		}
	}

	// Keep track of whether anything changed this update
	u.convertColorData = changedColors || u.totalIndices || u.ascIndices;
};

/**
 * @param {BackingArrays} backingArrays
 */
function Coordinates(backingArrays) {
	this.x = new CoordinateAxis(backingArrays.coordinates.x);
	this.y = new CoordinateAxis(backingArrays.coordinates.y);
	this.labels = [new GroupedLabels('', 0, 0)];
}

/**
 * convertCoordinates takes the input attributes
 * and converts them to Float32 coordinates
 * (jittered if necessary)
 * @param {Args} args
 * @param {Update} u
 */
Coordinates.prototype.convert = function (args, u) {
	u.convertCoordinates = (
		u.x.attr || u.x.logScale || u.x.jitter ||
		u.y.attr || u.y.logScale || u.y.jitter
	);

	if (u.convertCoordinates) {

		let {
			x,
			y,
		} = this;

		// Convert attribute data to positional data
		x.convertAxis(args.x);
		y.convertAxis(args.y);

		// Find midpoint of labels.
		const cAttr = args.color.attr;
		this.findLabelPositions(args.color.mode, cAttr.data, cAttr.indexedVal);
		// Jitter if necessary
		if (args.x.jitter && args.y.jitter) {
			this.jitterXY();
		} else {
			if (args.x.jitter) {
				x.jitterAxis();
			}
			if (args.y.jitter) {
				y.jitterAxis();
			}
		}

		// log project if necessary
		if (args.x.logScale) {
			x.logProjectAxis();
			this.logProjectXlabels();
		}
		if (args.y.logScale) {
			y.logProjectAxis();
			this.logProjectYlabels();
		}
	}
};

/**
 * @param {BackingArrays} backingArrays
 */
Coordinates.prototype.resize = function (backingArrays) {
	this.x.data = backingArrays.coordinates.x;
	this.y.data = backingArrays.coordinates.y;
};

/**
 * @param {string} name
 * @param {Float32Array} backingArray
 */
function CoordinateAxis(name, backingArray) {
	this.jitterScale = 1.0;
	this.name = name;
	this.categorical = false;
	this.data = backingArray;
}

/**
 * If we have a string array, convert it
 * to numbers as a form of categorization.
 * We must also ensure the data array is a
 * Float32Array array, for jittering,
 * log-projection and interpolation.
 *
 * Does not do log-projection yet,
 * since this has to happen after jittering.
 * @param {ArgsAxis} argsAxis
 */
CoordinateAxis.prototype.convertAxis = function (argsAxis) {
	const attr = argsAxis.attr;
	this.name = attr.name;
	this.categorical = attr.arrayType = 'string';
	this.convertAttrData(attr.data);
	// For small value ranges (happens with PCA a lot),
	// jittering needs to be scaled down.
	let delta = attr.max - attr.min;
	// TODO: remember how the heck I ended up
	// with this formula and document that for later…
	this.jitterScale = delta < 8 ?
		((log2(delta) * 8) | 0) / 32 :
		1;
};

/**
 * Attributes can have different types of arrays to
 * store their data. For the scatterplot this must be
 * converted to a `Float32Array`, to enable jittering,
 * log projection and smooth transition animations.
 * (all of that will happen at a later step)
 *
 * JavaScript also optimises better with monomorphic data.
 * Therefore, the code is refactored into sub-functions
 * so that the array conversion itself happens with
 * monomorphic data.
 *
 * Attributes with numerical data are presumed to indicate
 * positional data, not categories. If they *are* intended
 * to be used as categories, use integers, or at least
 * constant steps between values (10, 20, 30, etc)
 *
 * Indexed string attributes, where `data` is a `Uint8Array`,
 * can be converted directly: it represents an array of
 * indices into a look-up `Array` of all the strings,
 * which is sorted ascendingly. In other words:
 * attr.data already represents all categories
 * in ascending lexical order.
 *
 * Plain arrays are only used for unindexed string data.
 * @param {*} data
 */
CoordinateAxis.prototype.convertAttrData = function (data) {
	if (data.constructor !== Array) {
		// We assume that `Float32Array.set`
		// has an internal type switch to efficiently
		// convert different Typed Arrays.
		// (Given that I can beat the internal sorting
		// algorithm with a JS radix sort, this may be
		// giving the engines a bit too much credit…)
		this.data.set(data);
	} else {
		this.convertAttrStringData(data);
	}
};

/**
 * Having text data that is not indexed means having
 * more than 256 unique strings. This requires a bit of
 * extra work to convert to integer numbers representing
 * categories, but as before we intend to order
 * them in ascending lexical order.
 * @param {Array} data
 */
CoordinateAxis.prototype.convertAttrStringData = function (data) {
	let positionArray = this.data;
	// First list all unique values in the data.
	let uniques = countUniques(data, 0, data.length);
	// Make a look-up map where each unique
	// value returns a positive float value
	let categories = new Map();
	for (let i = 0; i < uniques.length; i++) {
		categories.set(uniques[i].val, i);
	}
	// Convert strings to positions. This whole process
	// is likely to be very slow, because this mostly
	// happens when all strings are unique
	for (let i = 0; i < positionArray.length; i++) {
		positionArray[i] = categories.get(data[i]);
	}
};

/**
 * @param {string} mode
 * @param {*[]} colorData
 * @param {*} indexedVal
 */
Coordinates.prototype.findLabelPositions = function (mode, colorData, indexedVal) {

	this.labels.length = 0;
	if (mode === 'Categorical') {
		// xCompare sorts by colorData first, xData second
		let xData = this.x.data;
		const xCompare = makeAxisCompareFunc(colorData, xData);
		const xIndices = findSourceIndices(colorData, xCompare);
		// yCompare sorts by colorData first, yData second
		let yData = this.y.data;
		const yCompare = makeAxisCompareFunc(colorData, yData);
		const yIndices = findSourceIndices(colorData, yCompare);
		let j = 0;
		while (j < xIndices.length) {
			let i = j,
				label = colorData[xIndices[j]];
			// keep going as long as we have the same group
			while (label === colorData[xIndices[j]] && j < xIndices.length) {
				j++;
			}
			// n = [i,j) is now the range of indices for one unique
			// value in colorData. We used the axis data
			// as our secondary key, therefore:
			//		 xData[xIndices[n]]
			//		 yData[yIndices[n]]
			// are sorted ranges for x positions and y positions
			// Therefore, the middle of this range, or
			//		 k = Math.round(i+j/2) ( or i+j >> 1 )
			// will result in the median x and y values
			const k = i + j >> 1;
			this.labels.push(new GroupedLabels(
				indexedVal ? indexedVal[label] : label,
				xData[xIndices[k]],
				yData[yIndices[k]]
			));
			i = j;
		}
	}
};

Coordinates.prototype.logProjectXlabels = function() {
	for(let i = 0; i < this.labels.length; i++){
		this.labels[i].x = logProject(this.labels[i].x);
	}
};

Coordinates.prototype.logProjectYlabels = function() {
	for(let i = 0; i < this.labels.length; i++){
		this.labels[i].y = logProject(this.labels[i].y);
	}
};

/**
 * @param {*} label
 * @param {number} x
 * @param {number} y
 */
function GroupedLabels(label, x, y) {
	this.label = label;
	this.x = x;
	this.y = y;
	this.xPos = 0;
	this.yPos = 0;
}

GroupedLabels.prototype.update = function (label, x, y) {
	this.label = label;
	this.x = x;
	this.y = y;
	this.xPos = 0;
	this.yPos = 0;
};

/**
 * Makes a comparator function for
 * `findSourceIndices`
 * Sorts by colorData as the first key,
 * and axisData as the second key
 * @param {*[]} colorData
 * @param {Float32Array} axisData
 */
function makeAxisCompareFunc(colorData, axisData) {
	return isTypedArray(colorData) ? (
		(i, j) => {
			const cv = colorData[i] - colorData[j];
			const av = axisData[i] - axisData[j];
			return cv ? cv : av ? av : i - j;
		}
	) : (
		(i, j) => {
			const ci = colorData[i];
			const cj = colorData[j];
			const av = axisData[i] - axisData[j];
			return ci < cj ? -1 : ci > cj ? 1 : av ? av : i - j;
		}
	);

}

/**
 * Jitters the data in-place for both axes.
 *
 * When jittering both axes, do so in a
 * circle around the data for nicer-looking results
 * @param {CoordinateAxis} x
 * @param {CoordinateAxis} y
 */
Coordinates.prototype.jitterXY = function () {
	const xJit = this.x.data;
	const yJit = this.y.data;
	const xJitterScale = this.x.jitterScale;
	const yJitterScale = this.y.jitterScale;
	const randomness = rndNormArray(xJit.length << 1);
	for (let i = 0; i < xJit.length; i++) {
		const r = randomness[(i << 1) + 1];
		const t = TAU * randomness[i << 1];
		xJit[i] += xJitterScale * r * sin(t);
		yJit[i] += yJitterScale * r * cos(t);
	}
};

/**
 * Jitters the data in-place	for one axis.
 */
CoordinateAxis.prototype.jitterAxis = function () {
	let {
		data,
		jitterScale,
	} = this;
	const randomness = rndNormArray(data.length);
	for (let i = 0; i < data.length; i++) {
		data[i] += +jitterScale * randomness[i];
	}
};


/**
 * Log-projects the data in-place for one axis.
 */
CoordinateAxis.prototype.logProjectAxis = function () {
	let {
		data,
	} = this;
	for (let i = 0; i < data.length; i++) {
		data[i] = logProject(data[i]);
	}
};


/**
 * @param {string} xName
 * @param {string} yName
 * @param {string} colorName
 * @param {number} width
 * @param {number} height
 * @param {number} pixelRatio
 */
function LabelLayout(xName, yName, colorName, width, height, pixelRatio) {
	this.labelTextSize = 0;
	this.labelMargin = 0;
	this.xLabel = {
		name: '',
		x: 0,
		y: 0,
	};
	this.yLabel = {
		name: '',
		x: 0,
		y: 0,
	};
	this.colorLabel = {
		name: '',
		x: 0,
		y: 0,
		heatmapWidth: 0,
	};
	this.update(xName, yName, colorName, width, height, pixelRatio);
}

/**
 * @param {string} xName
 * @param {string} yName
 * @param {string} colorName
 * @param {number} width
 * @param {number} height
 * @param {number} pixelRatio
 */
LabelLayout.prototype.update = function (xName, yName, colorName, width, height, pixelRatio) {
	const shortEdge = Math.min(width, height);
	const heatmapWidth = constrain(shortEdge / 10, 16, 256 * pixelRatio) | 0;

	let labelTextSize = constrain(Math.sqrt(shortEdge), 12, 64) * pixelRatio * 0.75 | 0;
	let labelMargin = (labelTextSize * 1.8) | 0;
	const labelOffset = labelTextSize * 3 | 0;

	this.labelTextSize = labelTextSize;
	this.labelMargin = labelMargin;

	let {
		xLabel,
		yLabel,
		colorLabel,
	} = this;
	xLabel.name = xName;
	xLabel.x = labelMargin * 1.5 | 0;
	xLabel.y = height - labelTextSize | 0;
	// before applying yLabel, context	will be
	// translated and rotated so (x,y) origin
	// will point to lower left
	yLabel.name = yName;
	yLabel.x = labelMargin * 1.5 | 0;
	yLabel.y = labelTextSize | 0;
	colorLabel.name = colorName;
	colorLabel.x = width - heatmapWidth - labelOffset | 0;
	colorLabel.y = height - labelTextSize | 0;
	// width of heatmap scale, if plotted
	colorLabel.heatmapWidth = heatmapWidth;
	return this;
};

function SpriteLayout(width, height, pixelRatio, scaleFactor, labelMargin) {
	this.x = 0;
	this.y = 0;
	this.width = 0;
	this.height = 0;
	this.radius = 0;
	this.sprites = allSprites[0];
	this.spriteW = 0;
	this.spriteH = 0;
	this.spriteLength = 0;
	this.spriteRadius = 0;
	this.update(width, height, pixelRatio, scaleFactor, labelMargin);
}

SpriteLayout.prototype.update = function (width, height, pixelRatio, scaleFactor, labelMargin) {
	const shortEdge = Math.min(width, height);
	// Suitable radius of the markers
	// (smaller canvas size = smaller points)
	let radius = log2(shortEdge) * scaleFactor / 50 * pixelRatio | 0;
	radius = constrain(radius, 1, 62);

	let spriteIdx = 0,
		spriteRadius = 2;
	while (spriteRadius < radius + 1) {
		spriteIdx++;
		spriteRadius = 2 << spriteIdx;
	}
	const sprites = allSprites[spriteIdx | 0];

	this.x = labelMargin + radius * 2;
	this.y = radius * 2;
	this.width = width - labelMargin - radius * 4;
	this.height = height - labelMargin - radius * 4;
	this.radius = radius;
	this.sprites = sprites;
	this.spriteW = sprites[0].width;
	this.spriteH = sprites[0].height;
	this.spriteLength = this.spriteW * this.spriteH;
	this.spriteRadius = spriteRadius;
	return this;
};

function CalcLayout() {
	this.spriteLayout = new SpriteLayout(0, 0, 0, 0, 0);
	this.labelLayout = new LabelLayout();
}

/**
 * Calculate plot layout:
 *
 * - the region for the plotting of the points,
 * - sprite size (which texture and shape)
 * - the position of the axis labels
 * - the position and width of the heatmap gradient.
 *
 * @param {Args} args
 * @param {Update} u
 * @param {*} context
 */
CalcLayout.prototype.update = function (args, u, context) {
	u.calcLayout = u.context || u.scaleFactor || u.pixelRatio;
	if (u.calcLayout) {
		let {
			width,
			height,
			pixelRatio,
		} = context;

		let {
			labelLayout,
			spriteLayout,
		} = this;
		labelLayout.update(
			args.x.attr.name,
			args.y.attr.name,
			args.color.attr.name,
			width,
			height,
			pixelRatio
		);
		spriteLayout.update(
			width,
			height,
			pixelRatio,
			args.scaleFactor,
			labelLayout.labelMargin
		);
	}
};

/**
 * `PrerenderSprites` prepares the sprites for blitting.
 * Uses `Canvas2DApi` to render the dots first, then
 * extracts pixel data from the sprites and turns it
 * into a single 1D texture atlas.
 * @param {BackingArrays} backingArray
 */
function PrerenderSprites(backingArray) {
	// Uint32Array "atlas" packing all sprite data
	// in one long array, for better cache perf
	this.spriteData32 = backingArray.spriteData32;
}

/**
 * @param {BackingArrays} backingArray
 */
PrerenderSprites.prototype.resize = function (backingArray) {
	this.spriteData32 = backingArray.spriteData32;
};

/**
 * Prepares palette & pre-renders sprites for blitting.
 * Extracts pixel data from the sprites and turns it
 * into a single 1D texture atlas.
 *
 * @param {Args} args
 * @param {Update} u
 * @param {string} mode
 * @param {*} attr
 * @param {SpriteLayout} spriteLayout
 */
PrerenderSprites.prototype.update = function (args, u, mode, attr, spriteLayout) {

	u.prerenderSprites = u.color.mode ||
		u.color.attr ||
		u.scaleFactor ||
		u.pixelRatio ||
		u.clip;
	if (u.prerenderSprites) {

		const {
			radius,
			sprites,
			spriteW,
			spriteH,
			spriteLength,
		} = spriteLayout;

		let {
			spriteData32,
		} = this;

		// sprite dimensions and line thickness
		const lineW = constrain(radius / 10, 0.125, 0.5);

		// Update sprites to new palette.
		const palette = getPalette(mode, attr);

		for (let i = 0; i < sprites.length; i++) {
			let sprite = sprites[i];
			let ctx = sprite.getContext('2d');
			ctx.clearRect(0, 0, spriteW, spriteH);
			ctx.beginPath();
			circlePath(ctx, spriteW * 0.5, spriteH * 0.5, radius);
			ctx.closePath();
			// i == 0 represents the filtered values.
			if (i > 0) {
				// use a slight stroke for unfiltered values
				ctx.globalAlpha = 0.25;
				strokePath(ctx, lineW, 'black');
				ctx.globalAlpha = 0.75;
				// skip the white zero-value
				fillPath(ctx, palette[1 + ((i - 1) % (palette.length - 1))]);
			} else {
				fillPath(ctx, 'lightgrey');
			}
			let sprite32 = new Uint32Array(ctx.getImageData(0, 0, spriteW, spriteH).data.buffer);
			spriteData32.set(sprite32, i * spriteLength);
		}
	}
};

/**
 * @param {BackingArrays} backingArrays
 */
function ScaleToContext(backingArrays) {
	this.firstRender = true;
	this.animationInProgress = true;
	this.t0 = 0;
	this.x = new ScaleToContextAxis(backingArrays.scaleToContext.x);
	this.y = new ScaleToContextAxis(backingArrays.scaleToContext.y);
}

/**
 * @param {BackingArrays} backingArrays
 */
ScaleToContext.prototype.resize = function (backingArrays) {
	let {
		x,
		y,
	} = backingArrays.scaleToContext;
	this.x.data = x.data;
	this.x.iData = x.iData;
	this.x.pData = x.pData;
	this.y.data = y.data;
	this.y.iData = y.iData;
	this.y.pData = y.pData;
};

/**
 * Project xData and yData arrays to final pixel positions,
 * with two Uint16 values bitpacked into a Uint32Array
 * (for faster radix sorting later on)
 *
 * @param {Args} m
 * @param {Update} u
 * @param {Coordinates} coordinates
 * @param {SpriteLayout} spriteLayout
 * @param {LabelLayout} labelLayout
 */
ScaleToContext.prototype.update = function (args, u, coordinates, spriteLayout, labelLayout) {
	const {
		width,
		height,
		radius,
	} = spriteLayout;

	u.scaledXY = this.firstRender || this.animationInProgress || u.convertCoordinates || u.calcLayout || u.totalIndices;

	if (u.scaledXY) {
		const newX = new ScaleToContextNewAxis(
			args.x,
			coordinates.x.jitterScale,
			coordinates.x.data,
			width,
			radius
		);
		const newY = new ScaleToContextNewAxis(
			args.y,
			coordinates.y.jitterScale,
			coordinates.y.data,
			height,
			radius
		);
		if (this.firstRender || u.totalIndices) {
			// Initiate data for interpolation.
			this.x.initiate(newX);
			this.y.initiate(newY);
			// Note: `scaleGroupLabels()` modifies `coordinates.labels`.
			this.scaleGroupLabels(coordinates.labels, spriteLayout, labelLayout);
			this.firstRender = false;
			this.animationInProgress = true;
			this.t0 = performance.now();
		} else if (u.convertCoordinates || u.calcLayout) {
			// Initiate transition due to new attributes or canvas layout
			this.x.update(newX);
			this.y.update(newY);
			this.scaleGroupLabels(coordinates.labels, spriteLayout, labelLayout);
			this.animationInProgress = true;
			this.t0 = performance.now();
		}

		if (this.animationInProgress) {
			let t = constrain((performance.now() - this.t0) / 1024, 0, 1);
			this.x.interpolate(t);
			this.y.interpolate(t);
			this.animationInProgress = t < 1;
		}
	}
};

/**
 * @param {GroupedLabels[]} labels
 * @param {SpriteLayout} spriteLayout
 * @param {LabelLayout} labelLayout
 */
ScaleToContext.prototype.scaleGroupLabels = function (labels, spriteLayout, labelLayout) {
	const xBounds = this.x.bounds;
	const yBounds = this.y.bounds;
	const {
		height,
		radius,
	} = spriteLayout;
	const {
		labelMargin,
	} = labelLayout;
	const x0scale = xBounds.jitterScale - xBounds.min;
	const y0scale = yBounds.jitterScale - yBounds.min;
	const x0 = labelMargin + radius;
	const y0 = height + radius;
	const xScale = xBounds.scale;
	const yScale = yBounds.scale;
	for (let i = 0; i < labels.length && i < 1000; i++) {
		let l = labels[i];
		l.xPos = x0 + xScale * (x0scale + l.x) | 0;
		l.yPos = y0 - yScale * (y0scale + l.y) | 0;
	}
};

/**
 * @param {number} min
 * @param {number} max
 * @param {number} jitterScale
 * @param {number} scale
 */
function Bounds(min, max, jitterScale, scale) {
	this.min = min;
	this.max = max;
	this.jitterScale = jitterScale;
	this.scale = scale;
}

/**
 * @param {ArgsAxis} m
 * @param {number} jitterScale
 * @param {Float32Array} data
 * @param {number} axisLength
 * @param {number} radius
 */
function ScaleToContextNewAxis(m, jitterScale, data, axisLength, radius) {
	let {
		min,
		max,
	} = m.attr;
	if (m.logScale) {
		min = logProject(min);
		max = logProject(max);
	}
	this.logScale = m.logScale;
	this.min = min;
	this.max = max;
	this.axisLength = axisLength;
	this.radius = radius;
	this.jitter = m.jitter;
	this.jitterScale = jitterScale;
	this.data = data;
}

/**
 * @param {{data: Float32Array, iData: Float32Array, pData: Float32Array}} backingArray
 */
function ScaleToContextAxis(backingArray) {
	this.axisLength = 0;
	this.radius = 1;
	this.jitter = false;
	this.logScale = false;

	this.data = backingArray.data;
	this.iData = backingArray.iData;
	this.pData = backingArray.pData;

	this.bounds = new Bounds(0, 0, 0, 0, 0);
	this.iBounds = new Bounds(0, 0, 0, 0, 0);
	this.pBounds = new Bounds(0, 0, 0, 0, 0);
}

/**
 * Called first time a scatterplot is rendered.
 * We have to wait until we have a context before
 * ScaleToContextAxis can be fully initiated, since
 * it needs the derived layout first.
 *
 * Fundamentally, the only difference between this
 * and `ScaleToContextAxis.update` is that we must
 * initiate `pData` and `iData` the first time that
 * we use `ScaleToContextAxis`. with a new data size
 * @param {ScaleToContextNewAxis} newAxis
 */
ScaleToContextAxis.prototype.initiate = function (newAxis) {
	// the later call to `this.update(newAxis)`
	// will copy `data` to `pData`. So we are
	// effectively initiating `pData`.
	this.data.set(newAxis.data);
	// The rest can be initiated through update.
	this.update(newAxis);
};

/**
 * Updates the data in ScaleToContextAxis
 * to the new arguments, except for the
 * interpolated values (they are determined
 * later on).
 * @param {ScaleToContextNewAxis} newAxis
 */
ScaleToContextAxis.prototype.update = function (newAxis) {
	const {
		min,
		max,
		data,
		logScale,
		jitter,
		jitterScale,
		axisLength,
		radius,
	} = newAxis;

	this.pData.set(this.data);
	this.data.set(data);

	this.axisLength = axisLength;
	this.radius = radius;
	this.jitter = jitter;
	this.logScale = logScale;

	let {
		bounds,
		pBounds,
	} = this;

	// we have to include radius to prevent jittering
	// from going over the edge of the canvas
	let scale = (axisLength - 2 * radius) / (max - min + 2 * jitterScale);
	// Save current boundary position
	// as previous position to transition from.
	pBounds.min = bounds.min;
	pBounds.max = bounds.max;
	pBounds.jitterScale = bounds.jitterScale;
	pBounds.scale = bounds.scale;

	bounds.min = min;
	bounds.max = max;
	bounds.jitterScale = jitterScale;
	bounds.scale = scale;
};

/**
 * @param {number} t
 */
ScaleToContextAxis.prototype.interpolate = function (t) {
	let {
		data,
		iData,
		pData,
		bounds,
		iBounds,
		pBounds,
	} = this;

	const {
		min,
		jitterScale,
		scale,
	} = bounds;
	const pMin = pBounds.min;
	const pJitterScale = pBounds.jitterScale;
	let pScale = pBounds.scale;

	const pt = 1 - t;
	iBounds.min = t * min + pt * pMin;
	iBounds.max = t * bounds.max + pt * pBounds.max;
	iBounds.scale = t * bounds.scale + pt * pScale;
	iBounds.jitterScale = t * jitterScale + pt * pJitterScale;

	const p0 = jitterScale - min;
	const pp0 = pJitterScale - pMin;
	for (let i = 0; i < data.length; i++) {
		let pos = scale * (p0 + data[i]);
		let pPos = pScale * (pp0 + pData[i]);
		let iPos = t * pos + pt * pPos;
		iData[i] = iPos;
	}
};

/**
 * Takes color indices, (scaled) x and y coordinates,
 * sprite dimensions and layout offsets, sorts the
 * data by by filtered/unfiltered as well as (x,y)
 * position, and projects it to the final values
 * @param {BackingArrays} backingArrays
 */
function SortRenderOrder(backingArrays) {
	this.compVal = backingArrays.compVal;
	// We need four 256 sized count arrays:
	// 4 * 8 bits for 32 bit integers,
	// but to improve cache coherency a bit
	// we put them into one array.
	this.count = backingArrays.count;
	// == Radix Sort cache ==
	// Re-use arrays used in radix sort to avoid
	// time spend on allocation and GC.

	this.indices = backingArrays.indices;
	// contains both XY and sprites, in order
	// [Y0X0, SPR0, Y1X1, SPR1, Y2X2, SPR2, ...]
	this.xySprites = backingArrays.xySprites;
}

/**
 * @param {BackingArrays} backingArrays
 */
SortRenderOrder.prototype.resize = function (backingArrays) {
	this.compVal = backingArrays.compVal;
	this.count = backingArrays.count;
	this.indices = backingArrays.indices;
	this.xySprites = backingArrays.xySprites;
};

/**
 * Sort `x` and `y` and `cIdx` for tiling purposes.
 * We wish to render zero values first (ending up
 * behind everything else), then order the rest
 * from top-to-bottom (giving a back-to-front look).
 *
 * This has to be done after jittering and transition
 * interpolation to maintain the tiling order that
 * is desired.
 *
 * If we pack the x,y coordinates 0x YYYY XXXX,
 * then sorting by that value implicitly sorts
 * by Y first, X second. Packing X and Y into
 * one 32-bit integer is therefore faster than
 * using two arrays, because it we can use one
 * sorting pass, with less memory per coordinate,
 * further reducing memory latency.
 *
 * However, while Y-values expect positive values
 * to go up, the canvas expects the opposite, so
 * we sort by 0xFFFFFFFF - 0xYYYYXXXX instead.
 *
 * We also want to draw the zero-values underneath
 * the non-zero values, so if cIdx is zero, we use
 * 0x7FFFFFFF - 0xYYYYXXXX instead.
 *
 * Technically, this breaks when the canvas is more
 * than 65536 by 32768 pixels, but by the time that
 * is something to worry about I hope we are not
 * using a software renderer for this stuff…
 *
 * At the end we undo all of these projections, and
 * store our final x/y/sprite offset information
 * in `xySprites` as two consecutive elements of a
 * `Uint32Array`, ready to be used by `blitSprites`.
 *
 * @param {Uint16Array} cIdx
 * @param {Float32Array} xiData
 * @param {Float32Array} yiData
 * @param {number} x0
 * @param {number} y0
 * @param {number} height
 * @param {number} spriteLength
 * @param {number} spriteRadius
 */
SortRenderOrder.prototype.update = function (cIdx, xiData, yiData, x0, y0, height, spriteLength, spriteRadius) {

	if (this.compVal.length !== cIdx.length) {
		this.resize(cIdx.length);
	}
	const {
		compVal,
	} = this;

	// == Prepare Data for Sorting ==

	for (let i = 0, y = 0, x = 0, comp = 0; i < cIdx.length; i++) {
		x = xiData[i] & 0xFFFF;
		y = yiData[i] & 0x7FFF;
		comp = cIdx[i] > 0 ? 0xFFFFFFFF : 0x7FFFFFFF;
		compVal[i] = comp ^ (x + (y << 16));
	}

	this.radixSortIndices();

	// After this, `xySprites` will contain the bit-packed
	// coordinates and sprite-offset.
	this.convertToFinalXY(x0, y0, height, spriteRadius, spriteLength, cIdx);
};

SortRenderOrder.prototype.radixSortIndices = function () {
	let {
		count,
		compVal,
		indices,
	} = this;
	count.fill(0);

	const length = compVal.length,
		c2 = 256 * 1,
		c3 = 256 * 2,
		c4 = 256 * 3;

	let i = 0,
		j = 0,
		val = 0,
		sum = 0;

	// count all bytes
	for (i = 0; i < length; i++) {
		val = compVal[i];
		count[val & 0xFF]++;
		count[c2 + (val >>> 8 & 0xFF)]++;
		count[c3 + (val >>> 16 & 0xFF)]++;
		count[c4 + (val >>> 24 & 0xFF)]++;
	}

	// Sum counts
	for (i = 0; i < c2; i++) {
		val = count[i];
		count[i] = sum;
		sum += val;
	}
	for (i = c2, sum = 0; i < c3; i++) {
		val = count[i];
		count[i] = sum;
		sum += val;
	}
	for (i = c3, sum = 0; i < c4; i++) {
		val = count[i];
		count[i] = sum;
		sum += val;
	}
	for (i = c4, sum = 0; i < count.length; i++) {
		val = count[i];
		count[i] = sum;
		sum += val;
	}

	// initiate indices
	for (i = 0; i < length; i++) {
		indices[i] = i;
	}
	for (i = 0; i < length; i++) {
		indices[i + length] = i;
	}

	// Sort indices
	for (i = 0; i < length; i++) {
		j = indices[i];
		val = compVal[j] & 0xFF;
		indices[length + count[val]++] = j;
	}

	for (j = 0; j < length; j++) {
		i = indices[length + j];
		val = compVal[i] >>> 8 & 0xFF;
		indices[count[c2 + val]++] = i;
	}

	for (i = 0; i < length; i++) {
		j = indices[i];
		val = compVal[j] >>> 16 & 0xFF;
		indices[length + count[c3 + val]++] = j;
	}

	for (j = 0; j < length; j++) {
		i = indices[length + j];
		val = compVal[i] >>> 24 & 0xFF;
		indices[count[c4 + val]++] = i;
	}
};

/**
 * @param {number} x0
 * @param {number} y0
 * @param {number} height
 * @param {number} spriteRadius
 * @param {number} spriteLength
 * @param {Uint16Array} cIdx
 */
SortRenderOrder.prototype.convertToFinalXY = function (x0, y0, height, spriteRadius, spriteLength, cIdx) {
	let {
		compVal,
		xySprites,
		indices,
	} = this;
	const xOffset = x0 - spriteRadius | 0;
	const yOffset = y0 + height - spriteRadius | 0;
	for (let i = 0, j = 0, xy32 = 0, idx = 0; i < compVal.length; i++) {
		idx = indices[i];
		xy32 = 0x7FFFFFFF - (compVal[idx] & 0x7FFFFFFF);
		xySprites[j++] = xOffset + (xy32 & 0xFFFF) + // x
			((yOffset - ((xy32 >>> 16) & 0x7FFF)) << 16); // y
		xySprites[j++] = cIdx[idx] * spriteLength;
	}
};

// ImageData is experimental (annoyingly enough)
const tImgData = ImageData ? new ImageData(1, 1) : null;

function BlitSprites() {
	this.width = 0;
	this.height = 0;
	this.xMask = 0;
	this.yShift = 0;
	this.spriteLength = 0;
	this.canvasData = tImgData;
	this.canvasDataU32 = tUint32Array;
}



/**
 * @param {tObject} context
 * @param {number} width
 * @param {number} height
 * @param {number} spriteLength
 * @param {number} spriteSide
 * @param {Uint32Array} xySprites
 * @param {Uint32Array} spriteData32
 */
BlitSprites.prototype.blit = function (context, width, height, spriteLength, spriteSide, xySprites, spriteData32) {
	// Only replace canvasData if the width or height has updated,
	// to reduce GC pressure and time spent on memory allocation
	if (
		this.width !== width ||
		this.height !== height
	) {
		this.width = width;
		this.height = height;
		this.canvasData = context.createImageData(width, height);
		this.canvasDataU32 = new Uint32Array(this.canvasData.data.buffer);
	}
	// set pixel values in canvas image data to white
	this.canvasDataU32.fill(0xFFFFFFFF);

	// we know our sprites are square and powers of two
	// so we can just iterate over the array in one loop, and
	// calculate x and y with
	// xi = i & (bitmask equal to width - 1)
	// yi = i >>> (nr of bits to get width via power of two)
	this.spriteLength = spriteLength;
	this.xMask = (spriteSide - 1) | 0;
	this.yShift = log2(spriteSide) | 0;

	if (isLittleEndian) {
		this.littleEndian(context, width, height, xySprites, spriteData32);
	} else {
		this.bigEndian(context, width, height, xySprites, spriteData32);
	}
	// put imagedata back on the canvas
	context.putImageData(this.canvasData, 0, 0);
};

/**
 * @param {tObject} context
 * @param {number} width
 * @param {number} height
 * @param {Uint32Array} xySprites
 * @param {Uint32Array} spriteData32
 */
BlitSprites.prototype.littleEndian = function (context, width, height, xySprites, spriteData32) {
	let {
		canvasDataU32,
	} = this;
	const {
		xMask,
		yShift,
		spriteLength,
	} = this;


	for (let cIdx = 0, // canvas index
		sp = 0, // sprite pixel
		cp = 0, // canvas pixel
		sa = 0, // sprite alpha
		ca = 0, // canvas alpha
		j = 0; j < xySprites.length;) {
		for (let xy32 = xySprites[j++],
			x = xy32 & 0xFFFF,
			y = (xy32 >>> 16) & 0x7FFF,
			spriteOffset = xySprites[j++],
			c0 = x + y * width | 0, // top-left corner of sprite on target canvas
			i = 0; i < spriteLength; i++) {
			sp = spriteData32[i + spriteOffset];
			sa = (sp >>> 24);
			if (sa) {
				// index in canvas array
				cIdx = c0 + (i & xMask) + (i >>> yShift) * width;
				// canvas pixel
				cp = canvasDataU32[cIdx];
				// sa is a byte, so in the range [0,256).
				// We introduce a tiny bias towards sa (the newer pixel),
				// to replace /255 with /256, which can be written as
				// >>8, which is faster
				ca = 0x100 - ++sa;
				// A bit of bitmask-trickery lets us use:
				// - 4 instead of 6 multiplies
				// - 6 instead of 9 and-bitmasks
				// - 4 instead of 6 additions
				// - 3 instead of 1 logical shift
				canvasDataU32[cIdx] = (
					( // red + blue channel
						((sp & 0xFF00FF) * sa +
							(cp & 0xFF00FF) * ca) >>> 8
					) & 0xFF00FF
				) | ( // green channel
						(((sp >>> 8) & 0xFF) * sa +
						((cp >>> 8) & 0xFF) * ca) & 0xFF00
					) | 0xFF000000;
				/*
				ca = 0x100 - ++sa;
				// index in canvas array
				cIdx = c0 + (i & xMask) + (i >>> yShift) * width;
				// canvas pixel
				cp = canvasDataU32[cIdx];
				canvasDataU32[cIdx] = ((
					(
						(cp & 0xFF0000) * ca +
						(sp & 0xFF0000) * sa & 0xFF000000
					) + (
						(cp & 0xFF00) * ca +
						(sp & 0xFF00) * sa & 0xFF0000
					) + (
						(cp & 0xFF) * ca +
						(sp & 0xFF) * sa & 0xFF00
					)
				) >>> 8) + 0xFF000000;
				*/
			}
		}
	}
};


/**
 * @param {tObject} context
 * @param {number} width
 * @param {number} height
 * @param {Uint32Array} xySprites
 * @param {Uint32Array} spriteData32
 */
BlitSprites.prototype.bigEndian = function (context, width, height, xySprites, spriteData32) {
	let {
		canvasDataU32,
	} = this;
	const {
		xMask,
		yShift,
		spriteLength,
	} = this;

	for (let cIdx = 0, // canvas index
		sp = 0, // sprite pixel
		cp = 0, // canvas pixel
		sa = 0, // sprite alpha
		ca = 0, // canvas alpha
		j = 0; j < xySprites.length;) {
		for (let xy32 = xySprites[j++],
			x = xy32 & 0xFFFF,
			y = (xy32 >>> 16) & 0x7FFF,
			spriteOffset = xySprites[j++],
			c0 = x + y * width | 0, // top-left corner of sprite on target canvas
			i = 0; i < spriteLength; i++) {
			sp = spriteData32[i + spriteOffset];
			sa = (sp >>> 24);
			if (sa) {
				// alpha is a byte, so in the range [0,256).
				// We introduce a tiny bias towards the newer pixel,
				// to replace /255 with /256, which can be written as
				// >>8, which is faster
				ca = 0x100 - ++sa;
				// index in canvas array
				cIdx = c0 + (i & xMask) + (i >>> yShift) * width;
				// canvas pixel
				cp = canvasDataU32[cIdx];
				canvasDataU32[cIdx] = (
					(
						// we do the 0xFF000000 separately to avoid integer overflow
						(cp & 0xFF000000 >>> 8) * ca +
						(sp & 0xFF000000 >>> 8) * sa & 0xFF000000
					) +
					((
						(
							(cp & 0xFF0000) * ca +
							(sp & 0xFF0000) * sa & 0xFF000000
						) +
						(
							(cp & 0xFF00) * ca +
							(sp & 0xFF00) * sa & 0xFF0000
						)
					) >>> 8)
				) + 0xFF; // alpha
			}
		}
	}
};

/**
 * @param {LabelLayout} labelLayout
 * @param {GroupedLabels[]} labels
 * @param {*} context
 */
function drawLabels(labelLayout, labels, context) {
	const {
		labelTextSize,
		xLabel,
		yLabel,
		colorLabel,
	} = labelLayout;
	textStyle(context);
	textSize(context, labelTextSize);

	// X attribute name
	drawText(context, xLabel.name, xLabel.x, xLabel.y);

	// Y attribute name
	context.translate(0, context.height);
	context.rotate(-Math.PI / 2);
	drawText(context, yLabel.name, yLabel.x, yLabel.y);
	context.rotate(Math.PI / 2);
	context.translate(0, -context.height);

	// Color attribute name
	context.textAlign = 'end';
	drawText(context, colorLabel.name, colorLabel.x - labelTextSize * 6 - 5 | 0, colorLabel.y);


	// grouped labels
	context.textAlign = 'center';
	context.textBaseline = 'hanging';
	textSize(context, labelTextSize * 0.75 | 0);
	textStyle(context, '#FFF', 'rgba(0, 0, 0, 128)', 3);
	for (let i = 0; i < labels.length && i < 1000; i++) {
		let cluster = labels[i];
		drawText(context, cluster.label, cluster.xPos, cluster.yPos);
	}
	context.textAlign = 'start';
	context.textBaseline = 'alphabetic';
}

/**
 * @param {ArgsColor} color
 * @param {*} settings
 * @param {LabelLayout} labelLayout
 * @param {*} context
 */
function drawHeatmapScale(color, settings, labelLayout, context) {
	const {
		min,
		max,
	} = color.attr;
	const {
		labelTextSize,
	} = labelLayout;
	const {
		x,
		y,
		heatmapWidth,
	} = labelLayout.colorLabel;
	const {
		pixelRatio,
	} = context;

	// label for min value
	const lblMin = min !== (min | 0) ? min.toExponential(2) : min | 0;
	context.textAlign = 'end';
	drawText(context, lblMin, (x - 5) | 0, y);

	// label for max value
	const lblMax = max !== (max | 0) ? max.toExponential(2) : max | 0;
	context.textAlign = 'start';
	drawText(context, lblMax, (x + heatmapWidth + 5) | 0, y);

	// border for colour gradient
	const cY = (y - labelTextSize) | 0;
	context.fillRect(
		x - pixelRatio,
		cY - pixelRatio,
		heatmapWidth + 2 * pixelRatio,
		labelTextSize * 1.25 + 2 * pixelRatio
	);

	const range = clipRange(color.attr, settings);
	const cDelta = color.attr.max - color.attr.min;
	// draw clipping points, if required
	if (range.min !== range.clipMin) {
		const clipMin = color.logScale ? Math.pow(2, range.clipMin) : range.clipMin;
		const clipMinX = ((clipMin - range.min) * heatmapWidth / cDelta) | 0;
		context.fillRect(
			x + clipMinX,
			cY - pixelRatio * 3,
			pixelRatio | 0,
			labelTextSize * 1.25 + 6 * pixelRatio | 0
		);
	}
	if (range.max !== range.clipMax) {
		const clipMax = color.logScale ? Math.pow(2, range.clipMax) : range.clipMax;
		const clipMaxX = ((clipMax - range.min) * heatmapWidth / cDelta) | 0;
		context.fillRect(
			x + clipMaxX,
			cY - pixelRatio * 3,
			pixelRatio,
			labelTextSize * 1.25 + 6 * pixelRatio | 0
		);
	}
	// colour gradient
	const cScaleFactor = cDelta / heatmapWidth;
	const valToColor = attrToColorFactory(color.attr, color.mode, settings);
	for (let i = 0; i < heatmapWidth; i++) {
		context.fillStyle = valToColor(color.attr.min + i * cScaleFactor);
		context.fillRect(x + i, cY, 1, labelTextSize * 1.25 | 0);
	}
}

/**
 * pBase represents the state in the previous
 * render, to compare with newly passed state
 * and determine what needs to be recomputed.
 * So after a successful render we copy mBase
 * to it, and set everything in mUpdate to false
 *
 * @param {Args} m
 * @param {Args} p
 * @param {Update} u
 */
function finaliseRender(m, p, u) {
	let pc = p.color,
		mc = m.color,
		uc = u.color;

	p.scaleFactor = m.scaleFactor;
	p.ascIndices = m.ascIndices;
	p.totalIndices = m.totalIndices;
	pc.attr = mc.attr;
	pc.mode = mc.mode;
	pc.logScale = mc.logScale;
	pc.clip = mc.clip;
	pc.lowerBound = mc.lowerBound;
	pc.upperBound = mc.lowerBound;
	p.settings = m.settings;

	u.scaleFactor = false;
	u.ascIndices = false;
	u.totalIndices = false;
	u.x.logScale = false;
	u.x.jitter = false;
	u.x.attr = false;
	u.y.logScale = false;
	u.y.jitter = false;
	u.y.attr = false;
	uc.attr = false;
	uc.mode = false;
	uc.logScale = false;
	uc.clip = false;
	uc.lowerBound = false;
	uc.upperBound = false;
	u.convertColorData = false;
	u.convertCoordinates = false;
	u.calcLayout = false;
	u.prerenderSprites = false;
	u.scaledXY = false;
	u.sortedData = false;
	u.blitSprites = false;
	u.context = false;
}