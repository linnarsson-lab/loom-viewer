import 'whatwg-fetch';

import createFilterOptions from 'react-select-fast-filter-options';
// customise search to only care about prefixes, and ignore uppercase
import { LowerCaseSanitizer, PrefixIndexStrategy } from 'js-search';
const indexStrategy = new PrefixIndexStrategy();
const sanitizer = new LowerCaseSanitizer();

import { convertJSONarray, arrayConstr } from '../js/util';
import { createViewStateConverter } from '../js/viewstateEncoder';

import {
	REQUEST_DATASET,
	// REQUEST_DATASET_FETCH,
	// REQUEST_DATASET_CACHED,
	RECEIVE_DATASET,
	REQUEST_DATASET_FAILED,
} from './actionTypes';

////////////////////////////////////////////////////////////////////////////////
//
// Fetch metadata for a dataSet
//
////////////////////////////////////////////////////////////////////////////////


// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchDataSet(...))

export function fetchDataSet(datasets, path) {
	return (dispatch) => {
		// Announce that the request has been started
		dispatch({
			type: REQUEST_DATASET,
			datasetName: path,
		});
		// See if the dataset already exists in the store
		// If so, we can use cached version.
		// If not, perform the actual fetch request (async)
		if (!datasets[path].col) {
			return (
				fetch(`/loom/${path}`)
					.then((response) => {
						// convert the JSON to a JS object, and
						// do some prep-work
						return response.json();
					})
					.then((data) => {
						// This goes last, to ensure the above defaults
						// are set when the views are rendered
						dispatch(receiveDataSet(data, path));
					})
					.catch((err) => {
						// Or, if fetch request failed, dispatch
						// an action to set the error flag
						console.log({ err }, err);
						dispatch({
							type: REQUEST_DATASET_FAILED,
							datasetName: path,
						});
					})
			);
		}
	};
}

function receiveDataSet(data, path) {
	let prepRows = prepData(data.rowAttrs),
		prepCols = prepData(data.colAttrs);
	let rows = prepRows.data,
		cols = prepCols.data;

	// some old loom files have 'Cell_ID'
	rows.cellKeys = cols.attrs.CellID ?
		cols.attrs.CellID.data.slice() : cols.attrs.Cell_ID ?
			cols.attrs.Cell_ID.data.slice() : [];
	rows.cellKeys.sort();
	rows.allKeys = rows.keys.concat(rows.cellKeys);
	rows.allKeysNoUniques = rows.keysNoUniques.concat(rows.cellKeys);

	cols.geneKeys = rows.attrs.Gene ? rows.attrs.Gene.data.slice() : [];
	cols.rowToGenes = new Array(cols.geneKeys.length);
	cols.geneToRow = {};
	cols.geneToRowLowerCase = {};
	// store row indices for gene fetching later
	let i = cols.geneKeys.length;
	while (i--) {
		let gene = cols.geneKeys[i];
		cols.rowToGenes[i] = gene;
		cols.geneToRow[gene] = i;
		cols.geneToRowLowerCase[gene.toLowerCase()] = i;
	}
	cols.geneKeys.sort();
	cols.geneKeysLowerCase = cols.geneKeys.map((gene) => { return gene.toLowerCase(); });
	cols.allKeys = cols.keys.concat(cols.geneKeys);
	cols.allKeysNoUniques = cols.keysNoUniques.concat(cols.geneKeys);

	// Creating fastFilterOptions is a very slow operation,
	// which is why we do it once and re-use the results.
	// Also, I've commented out the filters that aren't being used
	// right now to save some time
	rows.dropdownOptions = {};
	//rows.dropdownOptions.attrs = prepFilter(rows.keys);
	rows.dropdownOptions.attrsNoUniques = prepFilter(rows.keysNoUniques);
	// // fastFilterOptions doesn't scale for tens of thousands of cells :/
	//	//rows.dropdownOptions.keyAttr = prepFilter(rows.cellKeys);
	// //rows.dropdownOptions.all = prepFilter(rows.allKeys);
	// //rows.dropdownOptions.allNoUniques = prepFilter(rows.allKeysNoUiques);
	//rows.dropdownOptions.all = rows.dropdownOptions.attrs;
	rows.dropdownOptions.allNoUniques = rows.dropdownOptions.attrsNoUniques; //prepFilter(rows.allKeysNoUniques);

	cols.dropdownOptions = {};
	//cols.dropdownOptions.attrs = prepFilter(cols.keys);
	cols.dropdownOptions.attrsNoUniques = prepFilter(cols.keysNoUniques);
	cols.dropdownOptions.keyAttr = prepFilter(cols.geneKeys);
	//cols.dropdownOptions.all = prepFilter(cols.allKeys);
	cols.dropdownOptions.allNoUniques = prepFilter(cols.allKeysNoUniques);

	let dataset = {
		col: cols,
		row: rows,
		totalCols: cols.geneKeys.length,
		totalRows: rows.cellKeys.length,
	};

	dataset.viewState = {
		row: {
			order: prepRows.order,
			filter: [],
			indices: prepRows.indices,
			ascendingIndices: prepRows.indices,
		},
		col: {
			order: prepCols.order,
			filter: [],
			indices: prepCols.indices,
			ascendingIndices: prepCols.indices,
		},
		heatmap: {
			zoomRange: data.zoomRange,
			fullZoomHeight: data.fullZoomHeight,
			fullZoomWidth: data.fullZoomWidth,
			shape: data.shape,
		},
	};

	dataset.viewStateConverter = createViewStateConverter(dataset);

	return {
		type: RECEIVE_DATASET,
		state: {
			list: {
				[path]: dataset,
			},
		},
	};
}

function prepData(attrs) {
	let keys = Object.keys(attrs).sort();

	// store original attribute order
	const dataLength = attrs[keys[0]].data.length;
	let originalOrder = originalOrderArray(dataLength);
	attrs[originalOrder.name] = originalOrder;
	keys.unshift(originalOrder.name);

	// Initial sort order
	let order = [];
	for (let i = 0; i < Math.min(5, keys.length); i++) {
		order.push({ key: keys[i], asc: true });
	}

	// convert attribute arrays to objects with summary
	// metadata (most frequent, filtered/visible)
	// '(original order)' isn't part of the regular
	// meta-data so we have to add it first
	let newAttrs = convertArrays(attrs);

	// Add the set of keys for data that excludes data
	// where all values are the same (are useless in scatterplot
	// and sparkline views, so filtered out for convenience).
	let keysNoUniques = [];
	let i = keys.length;
	while (i--) {
		let key = keys[i];
		if (!newAttrs[key].uniqueVal) {
			keysNoUniques.push(key);
		}
	}
	keysNoUniques.sort();

	const indices = originalOrder.data.slice();

	return {
		data: {
			keys,
			keysNoUniques,
			attrs: newAttrs,
			length: dataLength,
		},
		order,
		indices,
	};
}

function originalOrderArray(length) {
	let arrayType = length < (1<<8) ? 'uint8' : (length < (1<<16) ? 'uint16' : (length < (1<<32) ? 'uint32' : 'float64'));
	let data = new (arrayConstr(arrayType))(length);
	let i = length;
	while (i--) {
		data[i] = i;
	}

	return {
		name: '(original order)',
		arrayType, data,
		colorIndices: { mostFreq: {} },
		uniques: [],
		allUnique: true,
		min: 0,
		max: data.length - 1,
	};
}


function convertArrays(attrs) {
	let keys = Object.keys(attrs);
	let newAttrs = {};
	let i = keys.length;
	while (i--) {
		// Set attrs[k] to null early, so it can be GC'ed if necessary
		// (had an allocation failure of a new typed array for large attrs,
		// so this is a realistic worry)
		const k = keys[i], attr = attrs[k];
		attrs[k] = null;
		newAttrs[k] = convertJSONarray(attr, k);
	}
	return newAttrs;
}

function prepFilter(options) {
	let i = options.length, newOptions = new Array(i);
	while (i--) {
		newOptions[i] = {
			value: options[i],
			label: options[i],
		};
	}
	return createFilterOptions({ indexStrategy, sanitizer, options: newOptions });
}