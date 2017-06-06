/**
 * Our app stores the view state in the URL by applying LZ-string
 * to its JSON.stringified version. The viewstate can get pretty
 * big, especially when a large number of genes is selected.
 *
 * However, the list of genes to choose from is limited, constant,
 * and stored in a different object. So we do not have to store
 * the full gene names in the compressed viewState to be able to
 * recover them. This also applies to other aspects of the viewState
 * In other words: because we know the structure of the viewState
 * object, we can encode much of as a positional array, with object
 * key names replaced by position, and values by index nrs into
 * arrays to recover the actual values.
 *
 * Boolean values can be replaced with 0 and 1.
 *
 * null and undefined would be converted to 0.
 *
 * Uninitialised state would be indicated with 0.
 *
 * Since the state to be saved is usually either attribute names
 * or row/column keys (respectively genes or cell id's), which
 * are stored in the metadata as arrays of strings,  we replace
 * the strings in the encoded viewState object with  indices.
 * The indices should refer to a _sorted_ array of keys to
 * ensure stability.
 *
 * This would make our viewState more complicated to change:
 * - adding new fields would mean appending to the end of the array.
 * - deleting fields would either require replacing them with 0,
 *	  or using some form of semver.
 *   (renaming should not be a major issue, relatively speaking)
 *
 * Semver would actually be fairly simple: we append the final
 * with a number, which we increase if a breaking change is made
 * to the schema. Since this is a floating point  value, we can use
 * point-increases to indicate non-breaking changes to the schema.
 *
 * The net result would be nested arrays of numbers, which are
 * much shorter, and will compress better too.
 *
 * For example:
 *	{
 *		heatmap: {
 *			zoomRange: [8, 13, 21],
 *			fullZoomWidth: 769280,
 *			fullZoomHeight: 1279488,
 *			shape: [4998, 3005]
 *		},
 *		col: {
 *			order: [
 *				{ key: 'Plp2', asc: true },
 *				{ key: 'Plp1', asc: true },
 *				{ key: 'Aplp2', asc: true },
 *				{ key: 'Aplp1', asc: true },
 *				{ key: 'Class', asc: true },
 *			],
 *			filter: []
 *		},
 *		row: {
 *			order: [
 *				{ key: '(original order)', asc: true },
 *				{ key: 'BackSPIN_level_0_group', asc: true },
 *				{ key: 'BackSPIN_level_1_group', asc: true },
 *				{ key: 'BackSPIN_level_2_group', asc: true },
 *				{ key: 'BackSPIN_level_3_group', asc: true }
 *			],
 *			filter: []
 *		},
 *		cellMD: { searchVal: '' },
 *		sparkline: {
 *			colMode: 'Categorical',
 *			geneMode: 'Bars',
 *			genes: [
 *				'Tspan12',
 *				'Gfap',
 *				'Plp1',
 *				'Plp2',
 *				'Aplp1',
 *				'Aplp2'
 *			],
 *			showLabels: true,
 *			colAttr: 'Class'
 *		}
 *	}
 *
 * Could become:
 *
 *	[
 *		[ // heatmap
 *			[8, 13, 21],
 *			769280, 1279488,
 *			[4998, 3005]
 *		],
 *		[ // col
 *			[ // order
 *			  .., 1,
 *			  .., 1,
 *			  .., 1,
 *			  .., 1,
 *			  .., 1
 *			],
 *			[] // filter
 *		],
 *		[ // row
 *			[ // order
 *			  .., 1,
 *			  .., 1,
 *			  .., 1,
 *			  .., 1,
 *			  .., 1
 *			],
 *			[] // filter
 *		],
 *		0, // unititiated landscape view
 *		[ // cellMD
 *		  '' // one of the few cases where we have to use a string
 *		],
 *		[ // sparkline
 *			0, // colMode has preset choices, so can be indexed
 *			0, // same with geneMode
 *			[ .., .., .., .., .. ],
 *			1, // "showLabels: true"
 *			.. // 'Class' is an attribute key
 *		],
 *		0, // unititiated geneScape view
 *		0, // unitiated geneMD view
 *		0, // first version of schema
 *	]
 *
 * Here '..' indicates an index to an attribute or row/col key.
 * If we give that a pessimistic estimate of five digits on average
 * (keeping in mind our upper limit of 28000 genes),
 * represented below by #####, then the saved space is as follows:
 *
 * {heatmap:{zoomRange:[8,13,21],fullZoomWidth:769280,fullZoomHeight:1279488,shape:[4998,3005]},col:{order:[{key:'Plp2',asc:true},{key:'Plp1',asc:true},{key:'Aplp2',asc:true},{key:'Aplp1',asc:true},{key:'Class',asc:true},],filter:[]},row:{order:[{key:'(originalorder)',asc:true},{key:'BackSPIN_level_0_group',asc:true},{key:'BackSPIN_level_1_group',asc:true},{key:'BackSPIN_level_2_group',asc:true},{key:'BackSPIN_level_3_group',asc:true}],filter:[]},cellMD:{searchVal:''},sparkline:{colMode:'Categorical',geneMode:'Bars',genes:['Tspan12','Gfap','Plp1','Plp2','Aplp1','Aplp2'],showLabels:true,colAttr:'Class'}}
 *
 * [[[8,13,21],769280,1279488,[4998,3005]],[[#####,1,#####, 1,#####, 1,#####, 1,#####, 1],[]],[[#####, 1,#####, 1,#####, 1,#####, 1,#####, 1],[]],0,[''],[0,0,[#####,#####,#####,#####,#####],1,#####],0,0,0]
 *
 */

import { isArray } from '../js/util';

// ===================================
// Encoder/decoder generator functions
// ===================================

// TODO: Semver schema support

// value that can be anything, so passes through unchanged
// (example: input field, which can have any string value)
function _anyVal(val) {
	return val;
}

const anyVal = () => {};
anyVal.encoder = _anyVal;
anyVal.decoder = _anyVal;

function constEncoder() { return 0; }

function constDecoder(val) {
	return () => { return val; };
}

// a variable that will be one of a constrained number of values
function oneOf(valArr) {
	// make sure valArr isn't accidentally mutated later
	valArr = valArr.slice();
	// hashmap lookup is usually faster than indexOf in modern browsers
	let valToIdx = {}, i = valArr.length;
	while(i--){
		valToIdx[valArr[i]] = i;
	}
	let retVal = () => { };
	retVal.encoder = (val) => { return valToIdx[val]; };
	retVal.decoder = (idx) => { return valArr[idx]; };
	return retVal;
}

// a boolean
const boolVal = oneOf([false, true]);

// a range
function rangeVal(i, j, step) {
	step = step ? step : 1;
	if (j < i && step > 0) {
		let t = j;
		j = i;
		i = t;
	}
	let values = [];
	while (i < j) {
		values.push(i);
		i += step;
	}
	return oneOf(values);
}

// the keys of an object
function keysOf(obj) {
	let keys = Object.keys(obj);
	keys.sort();
	return oneOf(keys);
}

// a vector (arrays will be assumed to be fixed size)
// example: an array of variable size, but you know all values
// will be between 0 and 255: `encodeArray([rangeVal(0, 256)])`
function vectorOf(patternArr){
	let retVal = () => { };
	retVal.encoder = encodeVector(patternArr);
	retVal.decoder = decodeVector(patternArr);
	return retVal;
}

// Arrays in the schema are assumed to be fixed size
// For variable sized arrays following a pattern, use vectorOf()
function encodeArray(patternArr) {
	let l = patternArr.length, i = l, encoderArr = [];
	while (i--) {
		encoderArr[i] = createEncoder(patternArr[i]);
	}
	return (arr) => {
		if (arr && arr.length) {
			let i = l, retArr = new Array(l);
			while (i--) {
				retArr[i] = encoderArr[i](arr[i]);
			}
			return retArr;
		} else {
			return 0;
		}
	};
}

function decodeArray(patternArr) {
	let l = patternArr.length, decoderArr = [], i = l;
	while (i--) {
		decoderArr[i] = createDecoder(patternArr[i]);
	}
	return (arr) => {
		if (arr) {
			let i = l, retArr = new Array(l);
			while (i--) {
				retArr[i] = decoderArr[i](arr[i]);
			}
			return retArr;
		}
		// else return undefined
	};
}

function encodeVector(patternArr){
	let l = patternArr.length, i = l, encoderArr = [];
	while (i--) {
		encoderArr[i] = createEncoder(patternArr[i]);
	}
	return (arr) => {
		if (arr && arr.length) {
			let i = arr.length, retArr = new Array(i);
			while (i--) {
				retArr[i] = encoderArr[i % l](arr[i]);
			}
			return retArr;
		} else {
			return 0;
		}
	};
}

function decodeVector(patternArr) {
	let l = patternArr.length, decoderArr = [], i = l;
	while (i--) {
		decoderArr[i] = createDecoder(patternArr[i]);
	}
	return (arr) => {
		if (arr) {
			let i = arr.length, retArr = new Array(i);
			while (i--) {
				retArr[i] = decoderArr[i % l](arr[i]);
			}
			return retArr;
		}
		// else return undefined
	};
}

function encodeObj(schema) {
	let keys = Object.keys(schema);
	// sort keys to ensure consistent encoding/decoding
	keys.sort();

	let _encoder = {};
	let i = keys.length;
	while (i--) {
		let k = keys[i];
		_encoder[k] = createEncoder(schema[k]);
	}

	let encoder = (obj) => {
		if (obj) {
			let i = keys.length, retArr = new Array(i);
			while (i--) {
				let k = keys[i];
				retArr[i] = _encoder[k](obj[k]);
			}
			return retArr;
		} else {
			return 0;
		}
	};

	i = keys.length;
	while (i--) {
		let k = keys[i];
		encoder[k] = _encoder[k];
	}
	return encoder;

}

function decodeObj(schema) {
	let keys = Object.keys(schema);
	// sort keys to ensure consistent encoding/decoding
	keys.sort();

	let _decoder = {};
	let i = keys.length;
	while (i--) {
		let k = keys[i];
		_decoder[k] = createDecoder(schema[k]);
	}

	let decoder = (arr) => {
		if (arr) {
			let i = keys.length, retObj = {};
			while (i--) {
				let k = keys[i], decoded = _decoder[k](arr[i]);
				if (decoded !== undefined) {
					retObj[k] = decoded;
				}
			}
			return retObj;
		}
		// else return undefined
	};

	i = keys.length;
	while (i--) {
		let k = keys[i];
		decoder[k] = _decoder[k];
	}
	return decoder;
}


function createEncoder(schema) {
	if (schema) {
		switch (typeof schema) {
			case 'object':
				if (isArray(schema)) {
					return encodeArray(schema);
				} else {
					return encodeObj(schema);
				}
			case 'function':
				// assumed to be object containing custom
				// `encoder` and `decoder` functions
				return schema.encoder;
			case 'string':
			case 'number':
			case 'boolean':
				// assumed to be constant (what are they doing in *state*?)
				console.log({
					message: 'createEncoder: constant detected in schema',
					schema,
				});
				return constEncoder;
			default:
				// if we have no clue, play it safe
				console.log({
					message: 'createEncoder: no specific encoder present for schema',
					schema,
				});
				return anyVal().encoder;
		}
	}
	console.log('WARNING: no schema passed to createEncoder!');
	return constEncoder;
}

function createDecoder(schema) {
	if (schema) {
		switch (typeof schema) {
			case 'object':
				if (isArray(schema)) {
					return decodeArray(schema);
				} else {
					return decodeObj(schema);
				}
			case 'function':
				// assumed to be function object containing custom
				// `encoder` and `decoder` functions
				return schema.decoder;
			case 'string':
			case 'number':
			case 'boolean':
				// assumed to be constant (what are they doing in *state*?)
				console.log({
					message: 'createDecoder: constant detected in schema',
					schema,
				});
				return constDecoder(schema);
			default:
				console.log({
					message: 'createDecoder: no specific decoder present for schema',
					schema,
				});
				return anyVal().decoder;
		}
	}
	console.log('WARNING: no schema passed to createDecoder!');
	return anyVal().decoder;
}

// ======================================
// viewStateConverter generation function
// ======================================

const heatmapModes = oneOf(['Text', 'Bars', 'Categorical', 'Heatmap', 'Heatmap2', 'Stacked', 'Flame', 'Flame2']);
const sparklineColorModes = oneOf(['Bars', 'Categorical', 'Heatmap', 'Heatmap2', 'Stacked', 'Flame', 'Flame2']);
const sparklineGeneModes = oneOf(['Bars', 'Heatmap', 'Heatmap2', 'Flame', 'Flame2']);
const scatterplotModes = oneOf(['Heatmap', 'Heatmap2', 'Categorical']);

export function createViewStateConverter(dataset) {
	// to avoid confusion with row and col in schema below
	const rowData = dataset.row;
	const colData = dataset.col;

	const oneOfRowAllKeys = oneOf(rowData.allKeys),
		oneOfColAllKeys = oneOf(colData.allKeys),
		oneOfColKeys = oneOf(colData.keys),
		oneOfGeneKeys = oneOf(colData.geneKeys);

	// Note: this schema doesn't necessarily include
	// all redux state! If it can be reconstructed from
	// other state, it will be skipped.
	// The skipped state is included as commented out
	// strings for documentation purposes.
	const viewStateSchema = {
		row: {
			order: vectorOf([{ key: oneOfRowAllKeys, asc: boolVal }]),
			filter: vectorOf([{ attr: oneOfRowAllKeys, val: anyVal}]),
			// indices: vectorOf(rangeVal(0, 1<<32))
			xAttrs: vectorOf([{
				attr: oneOfRowAllKeys,
				jitter: boolVal,
				logscale: boolVal,
			}]),
			yAttrs: vectorOf([{
				attr: oneOfRowAllKeys,
				jitter: boolVal,
				logscale: boolVal,
			}]),
			scaleFactor: anyVal,
			lowerBound: anyVal,
			upperBound: anyVal,
			colorAttr: oneOfRowAllKeys,
			colorMode: scatterplotModes,
		},
		col: {
			order: vectorOf([{ key: oneOfColAllKeys, asc: boolVal }]),
			filter: vectorOf([{ attr: oneOfColAllKeys, val: anyVal}]),
			// indices: vectorOf(rangeVal(0, 1<<32))
			xAttrs: vectorOf([{
				attr: oneOfColAllKeys,
				jitter: boolVal,
				logscale: boolVal,
			}]),
			yAttrs: vectorOf([{
				attr: oneOfColAllKeys,
				jitter: boolVal,
				logscale: boolVal,
			}]),
			scaleFactor: anyVal,
			lowerBound: anyVal,
			upperBound: anyVal,
			colorAttr: oneOfColAllKeys,
			colorMode: scatterplotModes,
		},
		heatmap: {
			center: { lat: anyVal, lng: anyVal },
			colAttr: oneOfColAllKeys,
			colMode: heatmapModes,
			rowAttr: oneOfRowAllKeys,
			rowMode: heatmapModes,
			zoom: anyVal,
		},
		sparkline: {
			colAttr: oneOfColKeys,
			colMode: sparklineColorModes,
			genes: vectorOf([oneOfGeneKeys]),
			geneMode: sparklineGeneModes,
			showLabels: boolVal,
		},
		cellMD: { searchVal: anyVal },
		geneMD: { searchVal: anyVal },
	};

	return {
		encode: createEncoder(viewStateSchema),
		decode: createDecoder(viewStateSchema),
	};
}