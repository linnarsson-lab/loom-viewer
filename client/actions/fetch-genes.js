import 'whatwg-fetch';

import {
	REQUEST_GENE_FETCH,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
} from './actionTypes';

import { convertJSONarray } from '../js/util';

////////////////////////////////////////////////////////////////////////////////
//
// Fetch a row of values for a single gene for a dataset
//
////////////////////////////////////////////////////////////////////////////////

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(dataset, genes) {
	const { title, path, col, fetchedGenes, fetchingGenes } = dataset;
	const { geneToRow, rowToGenes } = col;
	if (geneToRow === undefined || genes === undefined) {
		return () => { };
	} else {
		// `genes` can be either a string or an array of strings
		genes = typeof genes === 'string' ? [genes] : genes;

		// To avoid memory overhead issues (this has crashed
		// the browser in testing), we shouldn't make the
		// individual fetches *too* big. After a bit of testing
		// I guesstimate that for 50k cells, we want to fetch
		// at most 10 rows at once.
		const rowsPerFetch = ((1000000 / dataset.totalCols) | 0) || 1;
		let fetchGeneNames = [], fetchRows = [];
		for (let i = 0; i < genes.length; i++) {
			const gene = genes[i];
			const row = geneToRow[gene];
			// If gene is already cached, being fetched or
			// not part of the dataset, skip fetching.
			if (row !== undefined &&
				!fetchedGenes[gene] &&
				!fetchingGenes[gene]) {
				fetchGeneNames.push(gene);
				fetchRows.push(row);
			}
		}
		if (fetchRows.length > 0) {
			return (dispatch) => {
				_fetchGenes(dispatch, fetchGeneNames, fetchRows, rowsPerFetch, path, title, rowToGenes);
			};
		} else {
			return () => { };
		}
	}
}

function _fetchGenes(dispatch, fetchGeneNames, fetchRows, rowsPerFetch, path, title, rowToGenes) {
	for (let i = 0; i < fetchGeneNames.length; i += rowsPerFetch) {
		let i1 = Math.min(i + rowsPerFetch, fetchGeneNames.length);
		const _fetchGeneNames = fetchGeneNames.slice(i, i1),
			_fetchRows = fetchRows.slice(i, i1);

		// Announce gene request from server, add to geneKeys
		// to indicate it is being fetched
		dispatch(requestGenesFetch(_fetchGeneNames, path, title));
		// Second, perform the request (async)
		fetch(`/loom/${path}/row/${_fetchRows.join('+')}`)
			// Third, once the response comes in,
			// dispatch an action to provide the data
			.then((response) => { return response.json(); })
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
						console.log({ gene });
					} else {
						const convertedGene = convertJSONarray(gene.data, geneName);
						attrs[geneName] = convertedGene;
					}
				}
				dispatch(receiveGenes(attrs, _fetchGeneNames, path));
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch((err) => {
				console.log({ err }, err);
				dispatch(requestGenesFailed(_fetchGeneNames, path, title));
			});
	}
}

function requestGenesFetch(genes, path) {
	let fetchingGenes = {};
	let i = genes.length;
	while (i--) {
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
	let i = genes.length;
	while (i--) {
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
	let fetchingGenes = {}, fetchedGenes = {};
	let i = genes.length;
	while (i--) {
		fetchingGenes[genes[i]] = false;
		fetchedGenes[genes[i]] = true;
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