/**
 * Because we know the structure of the viewState object,
 * we can encode it as a positional array, with key names
 * replaced by either position, or index nrs.
 *
 *  Boolean values can be replaced with 0 and 1.
 *  Undefined state would be indicated with 0 ("null").
 *
 * Furthermore, since the state to be saved is usually either
 * attribute names or row/column keys (respectively genes or cell
 * id's), which are stored in the metadata as arrays of strings,
 * we replace the strings in the encoded viewState object with
 * indices. The indices should refer to a _sorted_ array of keys
 * to ensure stability.
 *
 * This would make our viewState more complicated to expand:
 * - adding new fields would mean appending to the end of the array.
 * - deleting fields would either require replacing them with 0,
 *	  or using some form of semver.
 *   (renaming should not be a major issue, relatively speaking)
 *
 * Semver would actually be fairly simple: the first entry into
 * the top array is a number, which we increase if a breaking
 * change is made to the schema. Since this is a floating point
 * value, we can use point-increases to indicate non-breaking
 * changes to the schema.
 *
 * The net result would be nested arrays of numbers, which are
 * much shorter, and likely would compress better too.
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
 *		0, // first version of schema
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
 *		  '' // one of the few cases where we have ot use a string
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
 *	]
 *
 * Here '..' indicates an index to an attribute or row/col key.
 * If we give that a pessimistic estimate of five digits on average
 * (keeping in mind our upper limit of 28000 genes),
 * represented below by 99999, then the saved space is as follows:
 *
 * {heatmap:{zoomRange:[8,13,21],fullZoomWidth:769280,fullZoomHeight:1279488,shape:[4998,3005]},col:{order:[{key:'Plp2',asc:true},{key:'Plp1',asc:true},{key:'Aplp2',asc:true},{key:'Aplp1',asc:true},{key:'Class',asc:true},],filter:[]},row:{order:[{key:'(originalorder)',asc:true},{key:'BackSPIN_level_0_group',asc:true},{key:'BackSPIN_level_1_group',asc:true},{key:'BackSPIN_level_2_group',asc:true},{key:'BackSPIN_level_3_group',asc:true}],filter:[]},cellMD:{searchVal:''},sparkline:{colMode:'Categorical',geneMode:'Bars',genes:['Tspan12','Gfap','Plp1','Plp2','Aplp1','Aplp2'],showLabels:true,colAttr:'Class'}}
 *
 * [0,[[8,13,21],769280,1279488,[4998,3005]],[[99999,1,99999, 1,99999, 1,99999, 1,99999, 1],[]],[[99999, 1,99999, 1,99999, 1,99999, 1,99999, 1],[]],0,[''],[0,0,[99999,99999,99999,99999,99999],1,99999],0,0,]
 *
 */

import { merge, binaryIndexOf } from '../js/util';
const heatmapModes = ['Text', 'Bars', 'Categorical', 'Heatmap', 'Heatmap2'];
const sparklineColorModes = ['Bars', 'Categorical', 'Heatmap', 'Heatmap2'];
const sparklineGeneModes = ['Bars', 'Heatmap', 'Heatmap2'];
const scatterplotModes = ['Heatmap', 'Heatmap2', 'Categorical'];

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
				let cAttr = colAttr ? binaryIndexOf(col.sortedAllKeysNoUniques, colAttr) : -1;
				let rAttr = rowAttr ? binaryIndexOf(row.sortedAllKeysNoUniques, rowAttr) : -1;
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
					colAttr = col.sortedAllKeysNoUniques[encodedHMS[1]],
					colMode = heatmapModes[encodedHMS[2]],
					rowAttr = row.sortedAllKeysNoUniques[encodedHMS[3]],
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
					order.push(binaryIndexOf(row.sortedAllKeys, entry.key));
					order.push(entry.asc ? 1 : 0);
				}
				// filter: array of { attr (allKeys), val (matches val in uniques of attr)}
				let filter = [];
				for (let i = 0; i < rs.filter.length; i++) {
					entry = rs.filter[i];
					// map entry.attr to sortedAllKeys index
					filter.push(binaryIndexOf(row.sortedAllKeys, entry.attr));
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
						key: row.sortedAllKeys[orderArray[i]],
						asc: orderArray[i + 1] !== 0,
					});
				}
				let filter = [];
				for (let i = 0; i < filterArray.length; i += 2) {
					const attr = row.sortedAllKeys[filterArray[i]];
					const { uniques } = row.attrs[attr];
					filter.push({
						attr,
						val: uniques[filter[i + 1]].val,
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
					order.push(binaryIndexOf(col.sortedAllKeys, entry.key));
					order.push(entry.asc ? 1 : 0);
				}
				// filter: array of { attr (allKeys), val (matches val in uniques of attr)}
				let filter = [];
				for (let i = 0; i < cs.filter.length; i++) {
					entry = cs.filter[i];
					// map entry.attr to sortedAllKeys index
					filter.push(binaryIndexOf(col.sortedAllKeys, entry.attr));

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
						key: col.sortedAllKeys[orderArray[i]],
						asc: orderArray[i + 1] !== 0,
					});
				}
				let filter = [];
				for (let i = 0; i < filterArray.length; i += 2) {
					const attr = col.sortedAllKeys[filterArray[i]];
					const { uniques } = col.attrs[attr];
					filter.push({
						attr,
						val: uniques[filter[i + 1]].val,
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

				let cAttr = colAttr ? binaryIndexOf(col.sortedAllKeysNoUniques, colAttr) : -1;

				let cMode = sparklineColorModes.length;
				while (cMode-- && sparklineColorModes[cMode] !== colMode) { }

				let geneIndices = [];
				for (let i = 0; i < genes.length; i++) {
					geneIndices.push(
						binaryIndexOf(
							col.sortedGeneKeysLowerCase,
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
					genes.push(col.sortedGeneKeys[geneIndices[i]]);
				}
				let colAttr = col.sortedAllKeysNoUniques[encodedSLS[0]],
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
					coordAttrs.push(binaryIndexOf(col.sortedAllKeysNoUniques, coordinateAttrs[i]));
				}

				let cMode = scatterplotModes.length;
				while (cMode-- && scatterplotModes[cMode] !== colorMode) { }

				const cAttr = colorAttr ? binaryIndexOf(col.sortedAllKeysNoUniques, colorAttr) : -1;

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
					coordinateAttrs.push(col.sortedAllKeysNoUniques[coordAttrs[i]]);
				}
				let colorAttr = col.sortedAllKeysNoUniques[encodedLSS[6]],
					colorMode = scatterplotModes[encodedLSS[7]],
					lss = {
						coordinateAttrs,
						logscale: { x: encodedLSS[1] !== 0, y: encodedLSS[2] !== 0 },
						jitter: { x: encodedLSS[3] !== 0, y: encodedLSS[4] !== 0 },
						asMatrix: encodedLSS[5] !== 0
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
					coordAttrs.push(binaryIndexOf(row.sortedAllKeysNoUniques, coordinateAttrs[i]));
				}

				let cMode = scatterplotModes.length;
				while (cMode-- && scatterplotModes[cMode] !== colorMode) { }

				const cAttr = colorAttr ? binaryIndexOf(row.sortedAllKeysNoUniques, colorAttr) : -1;

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
					coordinateAttrs.push(row.sortedAllKeysNoUniques[coordAttrs[i]]);
				}
				let colorAttr = row.sortedAllKeysNoUniques[encodedGS[6]], colorMode = scatterplotModes[encodedGS[7]],
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