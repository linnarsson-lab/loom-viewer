import 'whatwg-fetch';

import createFilterOptions from 'react-select-fast-filter-options';
// customise search to only care about prefixes, and ignore uppercase
import { LowerCaseSanitizer, PrefixIndexStrategy } from 'js-search';
const indexStrategy = new PrefixIndexStrategy();
const sanitizer = new LowerCaseSanitizer();

import localforage from 'localforage';

import {
	arrayConstr,
	convertJSONarray,
	extractStringArray,
	firstMatchingKeyCaseInsensitive,
	merge,
	mergeInPlace,
} from 'js/util';

import { createViewStateConverter } from 'js/viewstate-encoder';

import { viewStateInitialiser } from 'js/viewstate-initialiser';

// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import {
	compressToEncodedURIComponent,
	decompressFromEncodedURIComponent,
} from 'js/lz-string';

import { updateAndFetchGenes } from 'actions/update-and-fetch';

import {
	REQUEST_DATASET,
	// REQUEST_DATASET_FETCH,
	// REQUEST_DATASET_CACHED,
	RECEIVE_DATASET,
	REQUEST_DATASET_FAILED,
	LOAD_DATASET,
} from './action-types';

// //////////////////////////////////////////////////////////////////////////////
//
// Fetch metadata for a dataSet
//
// //////////////////////////////////////////////////////////////////////////////


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
		if (!datasets[path].loaded) {
			// try to load dataset from localforage
			localforage.getItem(path).then((dataset) => {
				if (dataset) {
					console.log(`${path} loaded from localforage`);
					// We only have cached genes if the dataset is cached
					return localforage.getItem(path + '/genes').then((genes) => {
						if (genes) {
							console.log('cached genes loaded from localforage');
							mergeGenesInPlace(dataset, genes);
						}
						// add dataset to redux store
						dataSetAction(LOAD_DATASET, path, dataset, dispatch);
					});
				} else {
					// dataset does not exist in localforage,
					// so we try to fetch it.
					return fetchDataset(datasets, path, dispatch);
				}
			});
		}
	};
}

function mergeGenesInPlace(dataset, genes) {
	// mark all genes retrieved from cache as fetched
	let fetchedGenes = {};
	let keys = Object.keys(genes),
		i = keys.length;
	while (i--) {
		fetchedGenes[keys[i]] = true;
	}
	// merge genes into column attributes
	return mergeInPlace(
		dataset,
		{
			fetchedGenes, col: { attrs: genes },
		}
	);
}

function fetchDataset(datasets, path, dispatch) {
	const oldMetaData = datasets[path];
	return (
		fetch(`/loom/${path}`).then((response) => {
			// convert the JSON to a JS object, and
			// do some prep-work
			return response.json();
		})
			.then((data) => {
				let dataset = convertToDataSet(data, datasets[path]);
				// Store dataset in localforage so we do not need to
				// fetch it again. This has to be done before adding
				// functions to the dataset, since localforage cannot
				// store those. We also want to avoid caching viewState
				return localforage.setItem(path, dataset)
					.catch((err) => {
						console.log('Caching dataset failed:', err, { err });
						return dataset;
					});
			})
			.then((dataset) => {
				// dataSetAction() adds viewState, functions and
				//
				// dispatch fully initialised dataset to redux store
				dataSetAction(RECEIVE_DATASET, path, dataset, dispatch);

				// We want to separate the list metadata from
				// the full dataset attributes, to efficiently
				// reload the page later (see request-projects)
				return localforage.getItem('cachedDatasets');
			})
			.then((list) => {
				// Because redux is immutable, we don't have to
				// worry about the previous dispatch overwriting
				// `datasets[path]`.
				// However, we do have to check if the dataset was
				// already loaded, because in that case dataset[path]
				// will now include all attributes.
				list = list || {};
				if (!list[path]) {
					list[path] = oldMetaData;
					return localforage.setItem('cachedDatasets', list)
						.catch((err) => {
							console.log('Updating cached datasets list failed:', err, { err });
						});
				}
				return null;
			})
			.catch((err) => {
				// Or, if fetch request failed, dispatch
				// an action to set the error flag
				console.log('Fetch failed:', err, { err });
				dispatch({
					type: REQUEST_DATASET_FAILED,
					datasetName: path,
				});
			})
	);
}

function convertToDataSet(data, dataset) {
	let row = prepData(data.rowAttrs),
		col = prepData(data.colAttrs);

	// some old loom files have 'Cell_ID'
	row.cellKeys = col.attrs.CellID ?
		col.attrs.CellID.data.slice() : col.attrs.Cell_ID ?
			col.attrs.Cell_ID.data.slice() : [];
	row.cellKeys.sort();
	row.allKeys = row.keys.concat(row.cellKeys);
	row.allKeysNoUniques = row.keysNoUniques.concat(row.cellKeys);

	const rowKey  = firstMatchingKeyCaseInsensitive(row.attrs, ['Gene', 'Genes', 'GeneName', 'Gene_Name', 'GeneNames', 'Gene_Names', '(original order)']);

	col.geneKeys = extractStringArray(row.attrs[rowKey]);
	col.rowToGenes = new Array(col.geneKeys.length);
	col.geneToRow = {};
	col.geneToRowLowerCase = {};
	// store row indices for gene fetching later
	let i = col.geneKeys.length;
	while (i--) {
		let gene = col.geneKeys[i];
		col.rowToGenes[i] = gene;
		col.geneToRow[gene] = i;
		col.geneToRowLowerCase[gene.toLowerCase()] = i;
	}
	col.geneKeys.sort();
	col.geneKeysLowerCase = col.geneKeys.map((gene) => { return gene.toLowerCase(); });
	col.allKeys = col.keys.concat(col.geneKeys);
	col.allKeysNoUniques = col.keysNoUniques.concat(col.geneKeys);

	// merge all static data into dataset, to cache in localForage
	// (this should be done without viewState and functions)
	// Note that this returns a new object, so we can safely
	// use mergeInPlace on viewState later to safe some overhead.
	return merge(dataset, {
		loaded: true,
		col,
		row,
		totalCols: col.geneKeys.length,
		totalRows: row.cellKeys.length,
		heatmap: {
			zoomRange: data.zoomRange,
			fullZoomHeight: data.fullZoomHeight,
			fullZoomWidth: data.fullZoomWidth,
			shape: data.shape,
		},
	});
}

/**
 * Initialise `dataset` with default `viewState`,
 * potentially decoded `viewState` from URI, and
 * functions (that we cannot cache in localForage)
 * @param {*} type
 * @param {string} path
 * @param {*} dataset
 */
function dataSetAction(type, path, dataset, dispatch) {
	// add conversion functions (compressor, toJSON)
	addFunctions(dataset);

	dataset.viewState = {};
	const action = {
		type,
		path,
		state: {
			list: {
				[path]: dataset,
			},
		},
		viewState: prepareViewState(dataset),
	};
	dispatch(updateAndFetchGenes(dataset, action));
}

function addFunctions(dataset) {
	const {
		row,
		col,
	} = dataset;
	// Creating fastFilterOptions is a very slow operation,
	// which is why we do it once and re-use the results.

	const rowAttrsNoUniques = prepFilter(row.keysNoUniques);
	row.dropdownOptions = {
		attrsNoUniques: rowAttrsNoUniques,
		allNoUniques: rowAttrsNoUniques,
	};

	col.dropdownOptions = {
		attrsNoUniques: prepFilter(col.keysNoUniques),
		keyAttr: prepFilter(col.geneKeys),
		allNoUniques: prepFilter(col.allKeysNoUniques),
	};

	dataset.viewStateConverter = createViewStateConverter(dataset);

	// redux tools trips over gigantic typed arrays,
	// so we need to add a custom serialiser for the attributes
	if (process.env.NODE_ENV === 'debug') {
		reduxToJSON(col);
		reduxToJSON(row);
	}

}

/**
	 * Initiate viewState. This includes reading and
	 *  writing URI-encoded state, which requires
	 * `viewStateConverter`, so this must
	 * be called after functions are added.
	 * @param {*} dataset
	 */
function prepareViewState(dataset) {
	// Initiate default viewState
	let viewState = viewStateInitialiser(dataset);

	const {
		encode,
		decode,
	} = dataset.viewStateConverter;

	// overwrite with previously encoded URI viewState, if any
	const paths = browserHistory
		.getCurrentLocation()
		.pathname
		.split('/');
	let viewStateURI = paths[5];
	if (viewStateURI) {
		const decompressed = decompressFromEncodedURIComponent(viewStateURI);
		const parsedJSON = JSON.parse(decompressed);
		const decodedViewState = decode(parsedJSON);
		mergeInPlace(viewState, decodedViewState);
	}

	// encode viewState to URI

	const encodedVS = encode(viewState);
	const stringifiedVS = JSON.stringify(encodedVS);
	viewStateURI = compressToEncodedURIComponent(stringifiedVS);
	const url = `/${paths[1]}/${paths[2]}/${paths[3]}/${paths[4]}/${viewStateURI}`;
	browserHistory.replace(url);

	return viewState;
}


export function reduxToJSON(attrs) {
	for (let i = 0; i < attrs.keys.length; i++) {
		let key = attrs.keys[i],
			attr = attrs.attrs[key];
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

	// store original data order
	// This isn't part of the regular
	// meta-data we have to add it
	const dataLength = attrs[keys[0]].data.length;
	let originalOrder = originalOrderAttribute(dataLength);

	let newAttrs = {
		[originalOrder.name]: originalOrder,
	};
	keys.unshift(originalOrder.name);

	// convert rest of attribute arrays to objects with summary
	// metadata (arrayType, uniques, colorIndices, etc)
	// Note --i prefix to skip originalOrder
	let i = keys.length;
	while (--i) {
		// Set attrs[k] to null early, so it can be GC'ed if necessary
		// (had an allocation failure of a new typed array for large attrs,
		// so this is a realistic worry)
		const k = keys[i],
			attr = attrs[k];
		attrs[k] = null;
		newAttrs[k] = convertJSONarray(attr, k);
	}

	// Add the set of keys for data that excludes data
	// where all values are the same (these are useless in
	// scatter plot and sparkline views, so filtered out).
	let keysNoUniques = [];
	i = keys.length;
	while (i--) {
		let key = keys[i];
		if (!newAttrs[key].uniqueVal) {
			keysNoUniques.push(key);
		}
	}
	keysNoUniques.sort();


	return {
		keys,
		keysNoUniques,
		attrs: newAttrs,
		length: dataLength,
	};
}

function originalOrderAttribute(length) {
	let arrayType = length < (1 << 8) ?
		'uint8' :
		length < (1 << 16) ?
			'uint16' :
			length < (1 << 32) ?
				'uint32' :
				'float64';

	let data = new (arrayConstr(arrayType))(length),
		uniques = {};

	let i = length;
	while (i--) {
		data[i] = i;
		uniques[i] = i;
	}

	return {
		name: '(original order)',
		arrayType,
		data,
		colorIndices: {
			uniques,
		},
		uniques: [],
		allUnique: true,
		min: 0,
		max: data.length - 1,
	};
}


function prepFilter(options) {
	let i = options.length,
		newOptions = new Array(i);
	while (i--) {
		newOptions[i] = {
			value: options[i],
			label: options[i],
		};
	}
	return {
		options: newOptions,
		fastFilterOptions: createFilterOptions({
			indexStrategy, sanitizer, options: newOptions,
		}),
	};
}