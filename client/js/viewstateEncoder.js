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
	let retVal = () => { };
	retVal.encoder = (val) => { return valArr.indexOf(val); };
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

const heatmapModes = oneOf(['Text', 'Bars', 'Categorical', 'Heatmap', 'Heatmap2']);
const sparklineColorModes = oneOf(['Bars', 'Categorical', 'Heatmap', 'Heatmap2']);
const sparklineGeneModes = oneOf(['Bars', 'Heatmap', 'Heatmap2']);
const scatterplotModes = oneOf(['Heatmap', 'Heatmap2', 'Categorical']);

export function createViewStateConverter(dataset) {
	// to avoid confusion with row and col in schema below
	const rowData = dataset.row;
	const colData = dataset.col;

	const oneOfRowAllKeys = oneOf(rowData.allKeys),
		oneOfColAllKeys = oneOf(colData.allKeys),
		oneOfColKeys = oneOf(colData.keys),
		oneOfGeneKeys = oneOf(colData.geneKeys);

	const viewStateSchema = {
		row: {
			order: vectorOf([{ key: oneOfRowAllKeys, asc: boolVal }]),
			filter: vectorOf([{ attr: oneOfRowAllKeys, val: anyVal}]),
		},
		col: {
			order: vectorOf([{ key: oneOfColAllKeys, asc: boolVal }]),
			filter: vectorOf([{ attr: oneOfColAllKeys, val: anyVal}]),
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
		landscape: {
			coordinateAttrs: vectorOf([oneOfColAllKeys]),
			jitter: { x: boolVal, y: boolVal },
			logscale: { x: boolVal, y: boolVal },
			asMatrix: boolVal,
			colorAttr: oneOfColAllKeys,
			colorMode: scatterplotModes,
		},
		cellMD: { searchVal: anyVal },
		genescape: {
			coordinateAttrs: vectorOf([oneOfRowAllKeys]),
			jitter: { x: boolVal, y: boolVal },
			logscale: { x: boolVal, y: boolVal },
			asMatrix: boolVal,
			colorAttr: oneOfRowAllKeys,
			colorMode: scatterplotModes,
		},
		geneMD: { searchVal: anyVal },
	};

	return {
		encode: createEncoder(viewStateSchema),
		decode: createDecoder(viewStateSchema),
	};
}


/* // The previous hand-written, fragile and bug-prone code for this

export function encodeViewstate(dataset) {
	const { viewState, row, col } = dataset;
	const version = 0;
	return [version,
		encodeRow(viewState.row, row, version),
		encodeCol(viewState.col, col, version),
		encodeHeatmap(viewState.heatmap, row, col, version),
		encodeSparkline(viewState.sparkline, col, version),
		encodeLandscape(viewState.landscape, col, version),
		encodeCellMD(viewState.cellMD, version),
		encodeGenescape(viewState.genescape, row, version),
		encodeGeneMD(viewState.geneMD, version)];
}

export function decodeViewstate(vsArray, dataset) {
	const { viewState, row, col } = dataset;
	const version = vsArray[0] | 0;
	let newVS;
	switch (version) {
		case 0:
			const _row = decodeRow(vsArray[1], row, version),
				_col = decodeCol(vsArray[2], col, version),
				heatmap = decodeHeatmap(vsArray[3], row, col, version),
				sparkline = decodeSparkline(vsArray[4], col, version),
				landscape = decodeLandscape(vsArray[5], col, version),
				cellMD = decodeCellMD(vsArray[6], version),
				genescape = decodeGenescape(vsArray[7], row, version),
				geneMD = decodeGeneMD(vsArray[8], version);
			newVS = {};
			if (row) { newVS.row = _row; }
			if (col) { newVS.col = _col; }
			if (heatmap) { newVS.heatmap = heatmap; }
			if (sparkline) { newVS.sparkline = sparkline; }
			if (landscape) { newVS.landscape = landscape; }
			if (cellMD) { newVS.cellMD = cellMD; }
			if (genescape) { newVS.genescape = genescape; }
			if (geneMD) { newVS.geneMD = geneMD; }
		default:
	}
	return merge(viewState, newVS);
}

function encodeHeatmap(hms, row, col, version) {
	if (hms) {
		switch (version | 0) {
			case 0:
				// center: { lat: float, lng: float } -> [float, float]
				// colAttr: allKeysNoUniques
				// colMode: text, categorical, bar, heatmap, heatmap2
				// rowAttr: allKeysNoUniques
				// rowMode: text, categorical, bar, heatmap, heatmap2
				// zoom: integer

				// Part of initialstate (no need to store in URL)
				// zoomRange: [integer, integer, integer]
				// dataBounds: [float, float, float, float]
				// fullZoomHeight: integer
				// fullZoomWidth: integer
				// shape: [integer, integer]

				const { center, colAttr, colMode, rowAttr, rowMode, zoom } = hms;
				let cAttr = colAttr ? col.allKeysNoUniques.indexOf(colAttr) : -1;
				let rAttr = rowAttr ? row.allKeysNoUniques.indexOf(rowAttr) : -1;
				let cMode = heatmapModes.length;
				while (cMode-- && heatmapModes[cMode] !== colMode) { }
				let rMode = heatmapModes.length;
				while (rMode-- && heatmapModes[rMode] !== rowMode) { }
				return [center ? [center.lat, center.lng] : 0, cAttr, cMode, rAttr, rMode, zoom];
			default:
		}
	}
	return 0;
}

function decodeHeatmap(encodedHMS, row, col, version) {
	if (encodedHMS) {
		switch (version | 0) {
			case 0:
			default:
				// [center.lat, center.lng, cAttr, cMode, rAttr, rMode, zoom];
				const center = encodedHMS[0] ? { lat: encodedHMS[0][0], lng: encodedHMS[0][1] } : undefined,
					colAttr = col.allKeysNoUniques[encodedHMS[1]],
					colMode = heatmapModes[encodedHMS[2]],
					rowAttr = row.allKeysNoUniques[encodedHMS[3]],
					rowMode = heatmapModes[encodedHMS[4]],
					zoom = encodedHMS[5];
				let hms = {};
				if (center) { hms.center = center; }
				if (colAttr) { hms.colAttr = colAttr; }
				if (colMode) { hms.colMode = colMode; }
				if (rowAttr) { hms.rowAttr = rowAttr; }
				if (rowMode) { hms.rowMode = rowMode; }
				if (zoom) { hms.zoom = zoom; }
				return hms;
		}
	}
}

function encodeRow(rs, row, version) {
	// order: array of {key (allKeys), asc (boolean)}
	// filter: array of { attr (allKeys), value (index into uniques of attr)}
	if (rs) {
		switch (version | 0) {
			case 0:
				// order: array of {key (allKeys), asc (boolean)}
				let order = [], entry;
				for (let i = 0; i < rs.order.length; i++) {
					entry = rs.order[i];
					order.push(row.allKeys.indexOf(entry.key));
					order.push(entry.asc ? 1 : 0);
				}
				// filter: array of { attr (allKeys), val (matches val in uniques of attr)}
				let filter = [];
				for (let i = 0; i < rs.filter.length; i++) {
					entry = rs.filter[i];
					// map entry.attr to allKeys index
					filter.push(row.allKeys.indexOf(entry.attr));
					// map entry.val to row.attrs[entry.attr].uniques index
					const { uniques } = row.attrs[entry.attr];
					let valIdx = uniques.length;
					while (valIdx-- && entry.val !== uniques[valIdx].val) { }
					filter.push(valIdx);
				}
				return [order, filter];
			default:
		}
	}
	return 0;
}

function decodeRow(encodedRS, row, version) {
	if (encodedRS) {
		switch (version | 0) {
			case 0:
				const orderArray = encodedRS[0];
				const filterArray = encodedRS[1];
				let order = [];
				for (let i = 0; i < orderArray.length; i += 2) {
					order.push({
						key: row.allKeys[orderArray[i]],
						asc: orderArray[i + 1] !== 0,
					});
				}
				let filter = [];
				for (let i = 0; i < filterArray.length; i += 2) {
					const attr = row.allKeys[filterArray[i]];
					const { uniques } = row.attrs[attr];
					filter.push({
						attr,
						val: uniques[filterArray[i + 1]].val,
					});
				}
				return { order, filter };
			default:
		}
	}
}

function encodeCol(cs, col, version) {
	if (cs) {
		switch (version | 0) {
			case 0:
				// order: array of {key (allKeys), asc (boolean)}
				let order = [], entry;
				for (let i = 0; i < cs.order.length; i++) {
					entry = cs.order[i];
					order.push(col.allKeys.indexOf(entry.key));
					order.push(entry.asc ? 1 : 0);
				}
				// filter: array of { attr (allKeys), val (matches val in uniques of attr)}
				let filter = [];
				for (let i = 0; i < cs.filter.length; i++) {
					entry = cs.filter[i];
					// map entry.attr to allKeys index
					filter.push(col.allKeys.indexOf(entry.attr));

					// map entry.val to col.attrs[entry.attr].uniques index
					const { uniques } = col.attrs[entry.attr];
					let valIdx = uniques.length;
					while (valIdx-- && entry.val !== uniques[valIdx].val) { }
					filter.push(valIdx);
				}
				return [order, filter];
			default:
		}
	}
	return 0;
}

function decodeCol(encodedCS, col, version) {
	if (encodedCS) {
		switch (version | 0) {
			case 0:
				const orderArray = encodedCS[0];
				const filterArray = encodedCS[1];
				let order = [];
				for (let i = 0; i < orderArray.length; i += 2) {
					order.push({
						key: col.allKeys[orderArray[i]],
						asc: orderArray[i + 1] !== 0,
					});
				}
				let filter = [];
				for (let i = 0; i < filterArray.length; i += 2) {
					const attr = col.allKeys[filterArray[i]];
					const { uniques } = col.attrs[attr];
					filter.push({
						attr,
						val: uniques[filterArray[i + 1]].val,
					});
				}
				return { order, filter };
			default:
		}
	}
}

function encodeSparkline(sls, col, version) {
	if (sls) {
		switch (version | 0) {
			case 0:
				// colAttr: name of col attribute to display as legend
				// colMode: bars, categorical, heatmap1, heatmap2
				// genes: array of gene names (geneKeys)
				// geneMode: bars, categorical, heatmap1, heatmap2
				// showLabels: boolean
				const { colAttr, colMode, genes, geneMode, showLabels } = sls;

				let cAttr = colAttr ? col.allKeysNoUniques.indexOf(colAttr) : -1;

				let cMode = sparklineColorModes.length;
				while (cMode-- && sparklineColorModes[cMode] !== colMode) { }

				let geneIndices = [];
				for (let i = 0; i < genes.length; i++) {
					geneIndices.push(
						col.geneKeysLowerCase.indexOf(
							genes[i].toLowerCase()
						)
					);
				}

				let gMode = sparklineGeneModes.length;
				while (gMode-- && sparklineGeneModes[gMode] !== geneMode) { }

				return [cAttr, cMode, geneIndices, gMode, showLabels ? 1 : 0];
			default:
		}
	}
	return 0;
}

function decodeSparkline(encodedSLS, col, version) {
	if (encodedSLS) {
		switch (version | 0) {
			case 0:
				// [cAttr, cMode, geneIndices, gMode, showLabels ? 1 : 0]
				let genes = [], geneIndices = encodedSLS[2];
				for (let i = 0; i < geneIndices.length; i++) {
					genes.push(col.geneKeys[geneIndices[i]]);
				}
				let colAttr = col.allKeysNoUniques[encodedSLS[0]],
					colMode = sparklineColorModes[encodedSLS[1]],
					geneMode = sparklineGeneModes[encodedSLS[3]],
					sls = { genes, showLabels: encodedSLS[4] !== 0 };
				if (colAttr) { sls.colAttr = colAttr; }
				if (colMode) { sls.colMode = colMode; }
				if (geneMode) { sls.geneMode = geneMode; }
				if (colAttr) { sls.colAttr = colAttr; }
				return sls;
			default:
		}
	}
}

function encodeLandscape(lss, col, version) {
	if (lss) {
		switch (version | 0) {
			case 0:
				// coordinateAttrs: array of (allKeysNoUniques)
				// jitter: [x: boolean, y: boolean]
				// log: [x: boolean, y: boolean]
				// asMatrix:  boolean
				// colorAttr: attribute key (allKeys)
				// colorMode: "categorical", "heatmap", "heatmap2"
				const { coordinateAttrs, logscale, jitter, asMatrix, colorAttr, colorMode } = lss;

				let coordAttrs = [];
				for (let i = 0; i < coordinateAttrs.length; i++) {
					coordAttrs.push(col.allKeysNoUniques.indexOf(coordinateAttrs[i]));
				}

				let cMode = scatterplotModes.length;
				while (cMode-- && scatterplotModes[cMode] !== colorMode) { }

				const cAttr = colorAttr ? col.allKeysNoUniques.indexOf(colorAttr) : -1;

				return [coordAttrs, logscale.x ? 1 : 0, logscale.y ? 1 : 0, jitter.x ? 1 : 0, jitter.y ? 1 : 0, asMatrix ? 1 : 0, cAttr, cMode];
			default:
		}
	}
	return 0;
}

function decodeLandscape(encodedLSS, col, version) {
	if (encodedLSS) {
		switch (version | 0) {
			case 0:
				//[coordAttrs, logscale.x ? 1 : 0, logscale.y ? 1 : 0, jitter.x ? 1 : 0, jitter.y ? 1 : 0, asMatrix ? 1 : 0, cAttr, cMode]
				const coordAttrs = encodedLSS[0];
				let coordinateAttrs = [];
				for (let i = 0; i < coordAttrs.length; i++) {
					coordinateAttrs.push(col.allKeysNoUniques[coordAttrs[i]]);
				}
				let colorAttr = col.allKeysNoUniques[encodedLSS[6]],
					colorMode = scatterplotModes[encodedLSS[7]],
					lss = {
						coordinateAttrs,
						logscale: { x: encodedLSS[1] !== 0, y: encodedLSS[2] !== 0 },
						jitter: { x: encodedLSS[3] !== 0, y: encodedLSS[4] !== 0 },
						asMatrix: encodedLSS[5] !== 0,
					};
				if (colorAttr) { lss.colorAttr = colorAttr; }
				if (colorMode) { lss.colorMode = colorMode; }
				return lss;
			default:
		}
	}
}

function encodeGenescape(gs, row, version) {
	if (gs) {
		switch (version | 0) {
			case 0:
				// coordinateAttrs: array of (allKeysNoUniques)
				// jitter: [x: boolean, y: boolean]
				// log: [x: boolean, y: boolean]
				// asMatrix:  boolean
				// colorAttr: attribute key (allKeys)
				// colorMode: "categorical", "heatmap", "heatmap2"
				const { coordinateAttrs, logscale, jitter, asMatrix, colorAttr, colorMode } = gs;

				let coordAttrs = [];
				for (let i = 0; i < coordinateAttrs.length; i++) {
					coordAttrs.push(row.allKeysNoUniques.indexOf(coordinateAttrs[i]));
				}

				let cMode = scatterplotModes.length;
				while (cMode-- && scatterplotModes[cMode] !== colorMode) { }

				const cAttr = colorAttr ? row.allKeysNoUniques.indexOf(colorAttr) : -1;

				return [coordAttrs, logscale.x ? 1 : 0, logscale.y ? 1 : 0, jitter.x ? 1 : 0, jitter.y ? 1 : 0, asMatrix ? 1 : 0, cAttr, cMode];
			default:
		}
	}
	return 0;
}
function decodeGenescape(encodedGS, row, version) {
	if (encodedGS) {
		switch (version | 0) {
			case 0:
				//[coordAttrs, logscale.x ? 1 : 0, logscale.y ? 1 : 0, jitter.x ? 1 : 0, jitter.y ? 1 : 0, asMatrix ? 1 : 0, cAttr, cMode]
				const coordAttrs = encodedGS[0];
				let coordinateAttrs = [];
				for (let i = 0; i < coordAttrs.length; i++) {
					coordinateAttrs.push(row.allKeysNoUniques[coordAttrs[i]]);
				}
				let colorAttr = row.allKeysNoUniques[encodedGS[6]], colorMode = scatterplotModes[encodedGS[7]],
					gs = {
						coordinateAttrs,
						logscale: { x: encodedGS[1] !== 0, y: encodedGS[2] !== 0 },
						jitter: { x: encodedGS[3] !== 0, y: encodedGS[4] !== 0 },
						asMatrix: encodedGS[5] !== 0,
					};
				if (colorAttr) { gs.colorAttr = colorAttr; }
				if (colorMode) { gs.colorMode = colorMode; }
				return gs;
			default:
		}
	}
}

function encodeCellMD(cmd, version) {
	if (cmd) {
		// searchVal: string
		switch (version | 0) {
			case 0:
			default:
				return [cmd.searchVal ? cmd.searchVal : 0];
		}
	}
	return 0;
}

function decodeCellMD(cmd, version) {
	if (cmd) {
		switch (version | 0) {
			case 0:
			default:
				return { searchVal: (cmd[0] ? cmd[0] : '') };
		}
	}
}

function encodeGeneMD(gmd, version) {
	if (gmd) {
		// searchVal: string
		switch (version | 0) {
			case 0:
			default:
				return [gmd.searchVal ? gmd.searchVal : 0];
		}
	}
	return 0;
}

function decodeGeneMD(gmd, version) {
	if (gmd) {
		switch (version | 0) {
			case 0:
			default:
				return { searchVal: (gmd[0] ? gmd[0] : '') };
		}
	}
}
*/