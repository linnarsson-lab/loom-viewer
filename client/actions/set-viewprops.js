import { fetchGene } from './fetch-genes';
import { SET_VIEW_PROPS } from './actionTypes';

// Automatically check if any of the view-state requires genes to be fetched,
// and dispatch an action if that is the case.
// (previously we had special code all over our components to do that, making
// the whole thing quite brittle)
export function setViewProps(dataset, action){
	const {
		viewState,
		axis,
		sortAttrName,
		filterAttrName,
	} = action;

	const { geneToRow } = dataset.col;
	const { fetchedGenes, fetchingGenes } = dataset;
	let geneFetchlist = [];

// tests if a value is a gene and  needs to be fetched, if so appends it to list
	const appendIfUnfetchedGene = (val) => {
		if(val !== undefined &&
			geneToRow[val] !== undefined &&
			!fetchedGenes[val] &&
			!fetchingGenes[val] &&
			geneFetchlist.indexOf(val) === -1) {
			geneFetchlist.push(val);
		}
	};

	const { col, heatmap, sparkline } = viewState;
	if (col){
		const { order, filter, xAttrs, yAttrs, colorAttr} = col;
		if (order){
			for (let i = 0; i < order.length; i++){
				appendIfUnfetchedGene(order[i].key);
			}
		}
		if (filter){
			for (let i = 0; i < filter.length; i++){
				appendIfUnfetchedGene(filter[i].attr);
			}
		}
		if (xAttrs){
			for (let i = 0; i < xAttrs.length; i++){
				appendIfUnfetchedGene(xAttrs[i].attr);
			}
		}
		if (yAttrs){
			for (let i = 0; i < yAttrs.length; i++){
				appendIfUnfetchedGene(yAttrs[i].attr);
			}
		}
		appendIfUnfetchedGene(colorAttr);
	}
	if (heatmap){
		appendIfUnfetchedGene(heatmap.colAttr);
	}
	if (sparkline){
		appendIfUnfetchedGene(sparkline.colAttr);
		const { genes } = sparkline;
		if (genes){
			for(let i = 0; i < genes.length; i++){
				appendIfUnfetchedGene(genes[i]);
			}
		}
	}

	if (axis === 'col'){
		appendIfUnfetchedGene(sortAttrName);
		appendIfUnfetchedGene(filterAttrName);
	}

	return (dispatch) => {
		if (geneFetchlist.length){
			dispatch(fetchGene(dataset, geneFetchlist));
		}
		action.type = SET_VIEW_PROPS;
		dispatch(action);
	};
}