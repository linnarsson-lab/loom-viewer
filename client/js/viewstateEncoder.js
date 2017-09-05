import {
	anyVal,
	intVal,
	boolVal,
	oneOf,
	vectorOf,
	makeCompressor,
} from './state-compressor';

// NOTE: When adding a new mode, append it at the end
// of the array to maintain backwards compatibility!
const heatmapModes = oneOf(['Text', 'Bars', 'Categorical', 'Heatmap', 'Heatmap2', 'Stacked', 'Flame', 'Flame2', 'Box']);
const sparklineColorModes = oneOf(['Bars', 'Categorical', 'Heatmap', 'Heatmap2', 'Stacked', 'Flame', 'Flame2', 'Box']);
const sparklineGeneModes = oneOf(['Bars', 'Heatmap', 'Heatmap2', 'Flame', 'Flame2', 'Box']);
const scatterplotModes = oneOf(['Heatmap', 'Heatmap2', 'Categorical']);

export function createViewStateConverter(dataset) {
	// to avoid confusion with row and col in schema below
	const rowData = dataset.row;
	const colData = dataset.col;

	const oneOfRowAllKeys = oneOf(rowData.allKeys),
		oneOfColAllKeys = oneOf(colData.allKeys),
		oneOfColKeys = oneOf(colData.keys),
		oneOfGeneKeys = oneOf(colData.geneKeys);

	// Note: this schema doesn't necessarily include
	// all redux state! If it can be reconstructed from
	// other state, it will be skipped.
	// The skipped state is included as commented out
	// strings for documentation purposes.
	const viewStateSchema = {
		row: {
			order: vectorOf([{ key: oneOfRowAllKeys, asc: boolVal }]),
			filter: vectorOf([{ attr: oneOfRowAllKeys, val: anyVal }]),
			// indices: vectorOf(rangeVal(0, 1<<32))
			xAttrs: vectorOf([{
				attr: oneOfRowAllKeys,
				jitter: boolVal,
				logscale: boolVal,
			}]),
			yAttrs: vectorOf([{
				attr: oneOfRowAllKeys,
				jitter: boolVal,
				logscale: boolVal,
			}]),
			settings: {
				scaleFactor: intVal,
				logScale: boolVal,
				clip: boolVal,
				lowerBound: intVal,
				upperBound: intVal,
			},
			colorAttr: oneOfRowAllKeys,
			colorMode: scatterplotModes,
		},
		col: {
			order: vectorOf([{ key: oneOfColAllKeys, asc: boolVal }]),
			filter: vectorOf([{ attr: oneOfColAllKeys, val: anyVal }]),
			// indices: vectorOf(rangeVal(0, 1<<32))
			xAttrs: vectorOf([{
				attr: oneOfColAllKeys,
				jitter: boolVal,
				logscale: boolVal,
			}]),
			yAttrs: vectorOf([{
				attr: oneOfColAllKeys,
				jitter: boolVal,
				logscale: boolVal,
			}]),
			settings: {
				scaleFactor: intVal,
				logScale: boolVal,
				clip: boolVal,
				lowerBound: intVal,
				upperBound: intVal,
			},
			colorAttr: oneOfColAllKeys,
			colorMode: scatterplotModes,
		},
		heatmap: {
			center: { lat: anyVal, lng: anyVal },
			colAttr: oneOfColAllKeys,
			colMode: heatmapModes,
			rowAttr: oneOfRowAllKeys,
			rowMode: heatmapModes,
			zoom: intVal,
		},
		sparkline: {
			colAttr: oneOfColKeys,
			colMode: sparklineColorModes,
			genes: vectorOf([oneOfGeneKeys]),
			geneMode: sparklineGeneModes,
			showLabels: boolVal,
			groupBy: boolVal,
		},
		cellMD: { searchVal: anyVal },
		geneMD: { searchVal: anyVal },
	};

	return makeCompressor(viewStateSchema);
}