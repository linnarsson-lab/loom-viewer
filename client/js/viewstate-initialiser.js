import { firstMatchingKey } from './util';


function initialiseOrder(attr, keys) {
	// Initial sort order
	let order = [];
	for (let i = 0; i < Math.min(5, keys.length); i++) {
		order.push({
			key: keys[i],
			asc: true,
		});
	}
	return order;
}

// Initiate state for a fetched dataset.
// Not all loom files have the same attributes,
// but we do have a number of default attributes
// that can be expected. For convenience,
// if any of these attributes are present,
// we select them for the initial viewState
export function viewStateInitialiser(dataset) {
	const colAttrs = dataset.col.attrs;
	const rowAttrs = dataset.row.attrs;
	const colIndices = colAttrs['(original order)'].data;
	const rowIndices = rowAttrs['(original order)'].data;

	const {
		zoomRange,
		fullZoomHeight,
		fullZoomWidth,
		shape,
	} = dataset.heatmap;

	return {
		heatmap: {
			dataBounds: [0, 0, 0, 0], // Data coordinates of the current view
			colAttr: firstMatchingKey(dataset.col.attrs, ['Clusters', 'Class', '_KMeans_10']),
			colMode: 'Stacked',
			rowAttr: firstMatchingKey(dataset.row.attrs, ['_Selected', '_Excluded']),
			rowMode: 'Stacked',
			zoom: 8,
			zoomRange,
			fullZoomHeight,
			fullZoomWidth,
			shape,
		},

		sparkline: {
			colAttr: firstMatchingKey(colAttrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
			colMode: 'Stacked',
			geneMode: 'Bars',
			genes: ['Cdk1', 'Top2a', 'Hexb', 'Mrc1', 'Lum', 'Col1a1', 'Cldn5', 'Acta2', 'Tagln', 'Foxj1', 'Ttr', 'Aqp4', 'Meg3', 'Stmn2', 'Gad2', 'Slc32a1', 'Plp1', 'Sox10', 'Mog', 'Mbp', 'Mpz'],
			showLabels: true,
			groupBy: false,
		},

		cellMD: { searchVal: '' },
		geneMD: { searchVal: '' },

		col: {
			order: initialiseOrder(colAttrs, dataset.col.keys),
			filter: [],
			indices: colIndices,
			originalIndices: colIndices,
			ascendingIndices: colIndices,
			scatterPlots: {
				selectedPlot: 0,
				totalPlots: 1,
				plotSettings: {
					0: {
						x: {
							attr: firstMatchingKey(colAttrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(colAttrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(colAttrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
						scaleFactor: 20,
					},
				},
			},
		},

		row: {
			order: initialiseOrder(rowAttrs, dataset.row.keys),
			filter: [],
			indices: rowIndices,
			originalIndices: rowIndices,
			ascendingIndices: rowIndices,
			scatterPlots: {
				selectedPlot: 0,
				totalPlots: 1,
				plotSettings: {
					0: {
						x: {
							attr: firstMatchingKey(rowAttrs, ['_X', 'X', '_LogMean', '_tSNE1', '_PCA1']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKey(rowAttrs, ['_Y', 'Y', '_LogCV', '_tSNE2', '_PCA2']),
							jitter: false,
							logScale: false,
						},
						colorAttr: firstMatchingKey(rowAttrs, ['_Selected', '_Excluded']),
						colorMode: 'Categorical',
						logScale: true,
						clip: false,
						lowerBound: 0,
						upperBound: 100,
						emphasizeNonZero: false,
						scaleFactor: 20,
					},
				},
			},
		},
	};
}