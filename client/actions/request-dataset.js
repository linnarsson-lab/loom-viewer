import 'whatwg-fetch';

import createFilterOptions from 'react-select-fast-filter-options';
// customise search to only care about prefixes, and ignore uppercase
import { LowerCaseSanitizer, PrefixIndexStrategy } from 'js-search';
const indexStrategy = new PrefixIndexStrategy();
const sanitizer = new LowerCaseSanitizer();

import localforage from 'localforage';
localforage.config({
	name: 'Loom',
	storeName: 'datasets',
});

import { merge, convertJSONarray, arrayConstr } from '../js/util';
import { createViewStateConverter } from '../js/viewstateEncoder';

import {
	REQUEST_DATASET,
	// REQUEST_DATASET_FETCH,
	// REQUEST_DATASET_CACHED,
	RECEIVE_DATASET,
	REQUEST_DATASET_FAILED,
	LOAD_DATASET,
} from './actionTypes';

////////////////////////////////////////////////////////////////////////////////
//
// Fetch metadata for a dataSet
//
////////////////////////////////////////////////////////////////////////////////


// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(requestDataset(...))

export function requestDataset(datasets, path) {
	return (dispatch) => {
		// Announce that the request has been started
		dispatch({
			type: REQUEST_DATASET,
			datasetName: path,
		});
		// See if the dataset already exists in the store
		// If so, we can use cached version so we don't
		// have to do anything.
		if (!datasets[path].col) {
			// try to load dataset from localforage
			localforage.getItem(path).then((dataset) => {
				if (dataset) {
					console.log(`${path} loaded from localforage`);
					dispatch(dataSetAction(LOAD_DATASET, path, dataset));
				} else {
					// dataset does not exist in localforage,
					// so we try to fetch it.
					return fetchDataset(datasets, path, dispatch);
				}
			});
		}
	};
}

function fetchDataset(datasets, path, dispatch) {
	return (
		fetch(`/loom/${path}`).then((response) => {
			// convert the JSON to a JS object, and
			// do some prep-work
			return response.json();
		}).then((data) => {
			let dataset = convertToDataSet(data, datasets[path]);
			// Store dataset in localforage so we do not need to
			// fetch it again later. This has to be done before
			// adding functions to the dataset, since localforage
			// cannot store those.
			return localforage.setItem(path, dataset);
		}).then((dataset) => {
			addFunctions(dataset);
			// This goes last, to ensure the above defaults
			// are set when the views are rendered
			dispatch(dataSetAction(RECEIVE_DATASET, path, dataset));
			// We want to separate the list metadata from
			// the full dataset attributes, to efficiently
			// reload the page later (see request-projects)
			return localforage.getItem('cachedDatasets');
		}).then((list) => {
			list = list || {};
			// Because redux is immutable, we don't have to
			// worry about the previous dispatch overwriting this.
			// However, we do have to check if the dataset was
			// already cached, because in that case dataset[path]
			// will now include all attributes.
			if (!list[path]) {
				list[path] = datasets[path];
				return localforage.setItem('cachedDatasets', list);
			}
		}).catch((err) => {
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

function convertToDataSet(data, dataset) {
	// TODO: Re-order data preparation so that
	// all non-functions are crated first, that
	// intermediate stage is stored into localForage,
	// then add all functions. (localForage can
	// save every data type that we use, except
	// functions. The function we store are the
	// viewStateConverter, and the fastFilterOptions
	// for the dropdowns)

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

	let viewState = {
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

	return merge(dataset, {
		col: cols,
		row: rows,
		totalCols: cols.geneKeys.length,
		totalRows: rows.cellKeys.length,
		viewState,
	});
}

function dataSetAction(type, path, dataset) {
	addFunctions(dataset);
	return {
		type,
		state: {
			list: {
				[path]: dataset,
			},
		},
	};
}

export function addFunctions(dataset) {
	const { row, col } = dataset;
	// Creating fastFilterOptions is a very slow operation,
	// which is why we do it once and re-use the results.
	// Also, I've commented out the filters that aren't
	// being used right now to save time
	row.dropdownOptions = {};
	//row.dropdownOptions.attrs = prepFilter(row.keys);
	row.dropdownOptions.attrsNoUniques = prepFilter(row.keysNoUniques);
	// // fastFilterOptions doesn't scale for tens of thousands of cells :/
	//	//row.dropdownOptions.keyAttr = prepFilter(row.cellKeys);
	// //row.dropdownOptions.all = prepFilter(row.allKeys);
	// //row.dropdownOptions.allNoUniques = prepFilter(row.allKeysNoUiques);
	//row.dropdownOptions.all = row.dropdownOptions.attrs;
	row.dropdownOptions.allNoUniques = row.dropdownOptions.attrsNoUniques; //prepFilter(row.allKeysNoUniques);

	col.dropdownOptions = {};
	//col.dropdownOptions.attrs = prepFilter(col.keys);
	col.dropdownOptions.attrsNoUniques = prepFilter(col.keysNoUniques);
	col.dropdownOptions.keyAttr = prepFilter(col.geneKeys);
	//col.dropdownOptions.all = prepFilter(col.allKeys);
	col.dropdownOptions.allNoUniques = prepFilter(col.allKeysNoUniques);

	dataset.viewStateConverter = createViewStateConverter(dataset);

	// redux tools trips over gigantic typed arrays,
	// so we need to add a custom serialiser for the attributes
	if (process.env.NODE_ENV !== 'production') {
		reduxToJSON(col);
		reduxToJSON(row);
	}

}

export function reduxToJSON(attrs) {
	for (let i = 0; i < attrs.keys.length; i++) {
		let key = attrs.keys[i], attr = attrs.attrs[key];
		const {
			name,
			arrayType,
			data,
			indexedVal,
			uniques,
			colorIndices,
			min,
			max,
		} = attr;

		const reduxJSON = {
			name,
			arrayType,
			data: Array.from(data.slice(0, Math.min(3, data.length))),
			data_length: `${data.length} items`,
			indexedVal,
			uniques: uniques.slice(0, Math.min(3, uniques.length)),
			total_uniques: `${uniques.length} items`,
			colorIndices,
			min,
			max,
		};
		attr.toJSON = () => { return reduxJSON; };
	}
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
	let arrayType = length < (1 << 8) ? 'uint8' : (length < (1 << 16) ? 'uint16' : (length < (1 << 32) ? 'uint32' : 'float64'));
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