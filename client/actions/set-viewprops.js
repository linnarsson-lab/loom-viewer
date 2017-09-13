import { fetchGene } from './fetch-genes';
import { SET_VIEW_PROPS } from './actionTypes';

// Automatically check if any of the view-state requires genes to be fetched,
// and dispatch an action if that is the case.
// (previously we had special code all over our components to do that, making
// the whole thing quite brittle)
// The `setViewProps` thunk is only required for SET_VIEW_PROPS actions that
// might result in genes being fetched; if our action is guaranteed to not do
// so (for example, `colorMode` settings), we can still use a direct
// SET_VIEW_PROPS, since that has less overhead.
export function setViewProps(dataset, action) {
	const {
		axis,
		sortAttrName,
		filterAttrName,
		viewState,
	} = action;

	let geneFetchlist = [];

	const { geneToRow } = dataset.col;
	if (geneToRow) {
		const { fetchedGenes, fetchingGenes } = dataset;
		// tests if a value is a gene and  needs to be fetched,
		// if so appends it to list
		const appendIfUnfetchedGene = (val) => {
			if (val !== undefined &&
				geneToRow[val] !== undefined &&
				!fetchedGenes[val] &&
				!fetchingGenes[val] &&
				geneFetchlist.indexOf(val) === -1) {
				geneFetchlist.push(val);
			}
		};

		if (axis === 'col') {
			appendIfUnfetchedGene(sortAttrName);
			appendIfUnfetchedGene(filterAttrName);
		}

		if (viewState) {
			const { col, heatmap, sparkline } = viewState;
			if (col) {
				const { order, filter, scatterPlots } = col;
				if (order) {
					for (let i = 0; i < order.length; i++) {
						appendIfUnfetchedGene(order[i].key);
					}
				}
				if (filter) {
					for (let i = 0; i < filter.length; i++) {
						appendIfUnfetchedGene(filter[i].attr);
					}
				}
				if (scatterPlots && scatterPlots.plots) {
					for (let i = 0; i < scatterPlots.plots.length; i++) {
						const plot = scatterPlots.plots[i];
						appendIfUnfetchedGene(plot.x.attr);
						appendIfUnfetchedGene(plot.y.attr);
						appendIfUnfetchedGene(plot.colorAttr);
					}
				}
			}
			if (heatmap) {
				appendIfUnfetchedGene(heatmap.colAttr);
			}
			if (sparkline) {
				appendIfUnfetchedGene(sparkline.colAttr);
				const { genes } = sparkline;
				if (genes) {
					for (let i = 0; i < genes.length; i++) {
						appendIfUnfetchedGene(genes[i]);
					}
				}
			}
		}
	}

	return (dispatch) => {
		if (geneFetchlist.length) {
			dispatch(fetchGene(dataset, geneFetchlist));
		}
		action.type = SET_VIEW_PROPS;
		dispatch(action);
	};
}