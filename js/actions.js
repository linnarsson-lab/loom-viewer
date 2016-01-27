
import 'whatwg-fetch';

function requestGene(gene) {
	return {
		type: 'REQUEST_GENE',
		gene: gene
	}
}

function requestGeneFailed(row) {
	return {
		type: 'REQUEST_GENE_FAILED',
		gene: gene
	}
}

function receiveGene(gene, list) {
	return {
		type: 'RECEIVE_GENE',
		gene: gene,
		data: list,
		receivedAt: Date.now()
	}
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(rowAttrs, gene, cache) {
	return dispatch => {
		var row = -1;
		if(rowAttrs.hasOwnProperty("GeneName")) {
			row = rowAttrs["GeneName"].indexOf(gene);
		}
		else if(rowAttrs.hasOwnProperty("Gene")) {
			row = rowAttrs["Gene"].indexOf(gene);
		}
		if(row == -1) {
			return;
		}
		if(cache.hasOwnProperty(gene)) {
			return;
		}
		// First, make known the fact that the request has been started
		dispatch(requestGene(gene));
		// Second, perform the request (async)
		return fetch(`/row/${row}`)
			.then(response => response.json())
			.then(json => {
				// Third, once the response comes in, dispatch an action to provide the data
				dispatch(receiveGene(gene, json))
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch(err => {
				dispatch(requestGeneFailed(gene));
			});
	}
}