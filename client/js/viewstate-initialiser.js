import {
	firstMatchingKeyCaseInsensitive,
	sortedDeepCopy,
} from './util';


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

	// Would be nice to come up with a more robust solution than this. And no, I don't want a regex.
	const colorAttrColumn = firstMatchingKeyCaseInsensitive(colAttrs, ['ClusterNames', '_ClusterNames', 'ClusterName', '_ClusterName', 'Clusters', '_Clusters', 'Cluster', '_Cluster', 'Class', '_Class', 'Classes', '_Classes', 'ClassName', '_ClassName', 'Class_Name', '_Class_Name', 'ClassNames', '_ClassNames', 'Class_Names', '_Class_Names', 'Louvain_Jaccard', '_KMeans_20', '_KMeans20', 'KMeans_20', 'KMeans20', '_KMeans_10', '_KMeans10', 'KMeans_10', 'KMeans10', '(original order)']),

		colorAttrRow = firstMatchingKeyCaseInsensitive(rowAttrs, ['_Selected', 'Selected', 'Excluded', '_Excluded', '(original order)']);
	const initialState = {
		heatmap: {
			dataBounds: [0, 0, 0, 0], // Data coordinates of the current view
			colAttr: colorAttrColumn,
			colMode: 'Stacked',
			rowAttr: firstMatchingKeyCaseInsensitive(dataset.row.attrs, ['_Selected', '_Excluded', '(original order)']),
			rowMode: 'Stacked',
			zoom: 8,
			zoomRange,
			fullZoomHeight,
			fullZoomWidth,
			shape,
		},

		sparkline: {
			colAttr: colorAttrColumn,
			colorMode: 'Stacked',
			geneMode: 'Box',
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
							attr: firstMatchingKeyCaseInsensitive(colAttrs, ['X', '_X', 'SFDP_X', '_tSNE1', '_tSNE_1', 'tSNE1', 'tSNE_1', '_PCA1', '_PCA_1', 'PCA1', 'PCA_1', '(original order)']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKeyCaseInsensitive(colAttrs, ['Y', '_Y', 'SFDP_Y', '_tSNE2', '_tSNE_2', 'tSNE2', 'tSNE_2', '_PCA2', '_PCA_2', 'PCA2', 'PCA_2', '(original order)']),
							jitter: false,
							logScale: false,
						},
						colorAttr: colorAttrColumn,
						colorMode: 'Stacked',
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
							attr: firstMatchingKeyCaseInsensitive(rowAttrs, ['_X', 'X', '_LogMean', '_tSNE1', '_tSNE_1', 'tSNE1', 'tSNE_1', '_PCA1', '_PCA_1', 'PCA1', 'PCA_1', '(original order)']),
							jitter: false,
							logScale: false,
						},
						y: {
							attr: firstMatchingKeyCaseInsensitive(rowAttrs, ['_Y', 'Y', '_LogCV', '_tSNE2', '_tSNE_2', 'tSNE2', 'tSNE_2', '_PCA2', '_PCA_2', 'PCA2', 'PCA_2', '(original order)']),
							jitter: false,
							logScale: false,
						},
						colorAttr: colorAttrRow,
						colorMode: 'Stacked',
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

	// Make sure the initial classes are sorted, so that the rest
	// of the JavaScript code will use the sorted hidden class.
	// Makes initialisation a little bit slower, but prevents
	// hidden class issues with state loaded from URI.
	return sortedDeepCopy(initialState);
}