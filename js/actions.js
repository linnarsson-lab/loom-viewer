
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

function rowForGene(rowAttrs, gene) {
	var index = -1;
	Object.keys(rowAttrs).forEach((key)=>{
		var temp = rowAttrs[key].indexOf(gene);
		if(temp >= 0) {
			index = temp;
		}
	});
	return index;
}

// Thunk action creator, following http://rackt.org/redux/docs/advanced/AsyncActions.html
// Though its insides are different, you would use it just like any other action creator:
// store.dispatch(fetchgene(...))

export function fetchGene(rowAttrs, gene) {
	return dispatch => {
		console.log("fetchGene");
		var row = rowForGene(rowAttrs, gene);
		if(row == -1) {
			return;
		}

		// First, make known the fact that the request has been started
		dispatch(requestGene(gene));
		// Second, perform the request (async)
		console.log("Requesting data.");
		return fetch(`/row/${row}`)
			.then(response => response.json())
			.then(json => {
				// Third, once the response comes in, dispatch an action to provide the data
				dispatch(receiveGene(gene, json))
				console.log("Received data.");
			})
			// Or, if it failed, dispatch an action to set the error flag
			.catch(err => {
				dispatch(requestGeneFailed(gene));
				console.log("Failed to receive data.");
			});
	}
}