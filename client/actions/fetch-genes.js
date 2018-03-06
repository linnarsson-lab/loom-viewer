import 'whatwg-fetch';

import {
	REQUEST_GENE_FETCH,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
} from './action-types';

import {
	disjointArrays,
	convertJSONarray,
} from 'js/util';

import localforage from 'localforage';
import 'localforage-getitems';
import 'localforage-setitems';
import {
	reduxAttrToJSON,
} from '../js/util';

// =======================================================
// Fetch a row of values for a single gene for a dataset
// =======================================================


// Thunk action creator, following:
// http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different,
// you would use it just like any
// other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(dataset, genes) {
	const {
		title,
		path,
		col,
		fetchedGenes,
		fetchingGenes,
	} = dataset;
	const {
		geneToRow,
		rowToGenes,
	} = col;
	if (geneToRow === undefined || genes === undefined) {
		return () => {};
	} else {
		// filter out the genes already in the store;
		let unfetched = [];
		for (let i = 0; i < genes.length; i++) {
			const gene = genes[i];
			if (!fetchedGenes[gene] &&
				!fetchingGenes[gene]) {
				unfetched.push(gene);
			}
		}
		return (dispatch) => {
			// Announce gene request from cache/server,
			// add genes to fetchingGenes to indicate
			// they are being fetched
			dispatch(requestGenesFetch(unfetched, path, title));

			let cacheKeys = new Array(unfetched.length);
			for (let i = 0; i < unfetched.length; i++) {
				cacheKeys[i] = path + '/' + unfetched[i];
			}
			// try loading from cache
			localforage.getItems(cacheKeys)
				// store all genes retrieved from cache
				.then((retrievedGenes) => {
					let cachedNames = [],
						cachedGenes = {},
						keys = Object.keys(retrievedGenes);
					for (let i = 0; i < keys.length; i++) {
						let gene = retrievedGenes[keys[i]];
						// each key that is uncached returns as an
						// undefined entry in this array
						if (gene) {
							cachedGenes[gene.name] = gene;
							cachedNames.push(gene.name);
						}
					}
					if (cachedNames.length) {
						// the overlapping names are the cached names
						cachedNames = disjointArrays(cachedNames, unfetched);
						console.log('loaded cached genes: ', cachedNames);
						dispatch(receiveGenes(cachedGenes, cachedNames, path));
					}
					return unfetched;
				})
				// fetch remaining genes
				.then((uncachedGenes) => {
					// To avoid memory overhead issues (this has crashed
					// the browser in testing), we shouldn't make the
					// individual fetches *too* big. After a bit of testing
					// I guesstimate that for 50k cells, we want to fetch
					// at most 10 rows at once.
					const rowsPerFetch = ((1000000 / dataset.totalCols) | 0) || 1;
					let fetchGeneNames = [];
					let fetchRows = [];
					for (let i = 0; i < uncachedGenes.length; i++) {
						const gene = uncachedGenes[i];
						const row = geneToRow[gene];
						// Only fetch genes that are part of the dataset
						if (row !== undefined) {
							fetchGeneNames.push(gene);
							fetchRows.push(row);
						}
					}
					if (fetchRows.length > 0) {
						fetchUncachedGenes(dispatch, fetchGeneNames, fetchRows, rowsPerFetch, path, title, rowToGenes);
					}
				});
		};
	}
}

function fetchUncachedGenes(dispatch, fetchGeneNames, fetchRows, rowsPerFetch, path, title, rowToGenes) {
	for (let i = 0; i < fetchGeneNames.length; i += rowsPerFetch) {
		let i1 = Math.min(i + rowsPerFetch, fetchGeneNames.length);
		const _fetchGeneNames = fetchGeneNames.slice(i, i1),
			_fetchRows = fetchRows.slice(i, i1);
		// Second, perform the request (async)
		fetch(`/loom/${path}/row/${_fetchRows.join('+')}`)
			// Third, once the response comes in,
			// dispatch an action to provide the data
			.then((response) => {
				return response.json();
			})
			.then((data) => {
				// Genes are appended to the attrs object
				let attrs = {};
				while (data.length) {
					// We pop from data, so JS can GC the after converting
					// to TypedArrays. I actually had an allocation failure
					// so this is a real risk when fetching large amounts of data.
					const gene = data.pop();
					const geneName = rowToGenes[gene.idx];
					if (geneName === undefined) {
						console.log('fetchGene: row index out of bounds error!');
						console.log({gene});
					} else {
						const convertedGene = convertJSONarray(gene.data, geneName);
						attrs[geneName] = convertedGene;
					}
				}
				return cacheGenes(attrs, path)
					.then(() => {
						dispatch(receiveGenes(attrs, _fetchGeneNames, path));
					});
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch((err) => {
				console.log(
					'Requesting genes failed:', 
					{err},
					err
				);
				dispatch(requestGenesFailed(_fetchGeneNames, path, title));
			});
	}
}

function cacheGenes(genes, path) {
	let keys = Object.keys(genes),
		items = {};
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i],
			gene = genes[key];
		items[path + '/' + key] = gene;
	}
	console.log('caching genes: ', keys);
	return localforage.setItems(items)
		.catch((err) => {
			console.log(
				'caching genes failed:',
				{err}
				err,
			);
		});
}

function requestGenesFetch(genes, path) {
	let fetchingGenes = {};
	for (let i = 0; i < genes.length; i++) {
		fetchingGenes[genes[i]] = true;
	}
	return {
		type: REQUEST_GENE_FETCH,
		state: {
			list: {
				[path]: {
					fetchingGenes,
				},
			},
		},
	};
}

function requestGenesFailed(genes, path) {
	let fetchingGenes = {};
	for (let i = 0; i < genes.length; i++) {
		fetchingGenes[genes[i]] = false;
	}
	return {
		type: REQUEST_GENE_FAILED,
		genes,
		state: {
			list: {
				[path]: {
					fetchingGenes,
				},
			},
		},
	};
}

function receiveGenes(attrs, genes, path) {
	let fetchingGenes = {},
		fetchedGenes = {};
	for (let i = 0; i < genes.length; i++) {
		fetchingGenes[genes[i]] = false;
		fetchedGenes[genes[i]] = true;
	}
	if (process.env.NODE_ENV === 'debug') {
		for (let i = 0; i < genes.length; i++) {
			reduxAttrToJSON(attrs[genes[i]]);
		}
	}
	return {
		type: RECEIVE_GENE,
		path,
		receivedAt: Date.now(),
		genes,
		state: {
			list: {
				[path]: {
					fetchingGenes,
					fetchedGenes,
					col: {
						attrs,
					},
				},
			},
		},
	};
}