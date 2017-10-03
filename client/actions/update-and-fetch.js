import { fetchGene } from './fetch-genes';
import { UPDATE_VIEWSTATE } from './action-types';


/**
 * Automatically check if any of the view-state requires genes to be fetched,
 * and dispatch an action if that is the case.
 *
 * (previously we had special code all over our components to do that, making
 * the whole thing quite brittle)
 *
 * The `updateAndFetchGenes` thunk is only required for UPDATE_VIEWSTATE
 * actions that might result in genes being fetched.
 *
 * If our action does not involve any genes (for example, `colorMode` settings),
 * use a more direct UPDATE_VIEWSTATE, since that has less overhead.
 * @param {*} dataset
 * @param {*} action
 */
export function updateAndFetchGenes(dataset, action) {
	const {
		axis,
		sortAttrName,
		filterAttrName,
		viewState,
	} = action;

	let geneFetchList = [];

	const { geneToRow } = dataset.col;
	if (geneToRow) {
		const {
			fetchedGenes,
			fetchingGenes,
		} = dataset;
		// tests if a value is a gene and  needs to be fetched,
		// if so appends it to list
		const appendIfUnfetchedGene = (val) => {
			if (val !== undefined &&
				geneToRow[val] !== undefined &&
				!fetchedGenes[val] &&
				!fetchingGenes[val] &&
				geneFetchList.indexOf(val) === -1) {
				geneFetchList.push(val);
			}
		};

		if (axis === 'col') {
			appendIfUnfetchedGene(sortAttrName);
			appendIfUnfetchedGene(filterAttrName);
		}

		if (viewState) {

			const {
				col,
				heatmap,
				sparkline,
			} = viewState;

			if (col) {

				const {
					order,
					filter,
					scatterPlots,
				} = col;

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
				if (scatterPlots && scatterPlots.plotSettings) {
					const plots = Object.values(scatterPlots.plotSettings);
					for (let i = 0; i < plots.length; i++) {
						const plot = plots[i];
						plot.x && appendIfUnfetchedGene(plot.x.attr);
						plot.y && appendIfUnfetchedGene(plot.y.attr);
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
		action.type = action.type || UPDATE_VIEWSTATE;
		dispatch(action);
		if (geneFetchList.length) {
			dispatch(fetchGene(dataset, geneFetchList));
		}
	};
}