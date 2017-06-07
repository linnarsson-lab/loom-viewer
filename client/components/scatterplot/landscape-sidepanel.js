import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterplotSidepanel } from './scatterplot-sidepanel';

import { fetchGene } from '../../actions/fetch-genes';

export class LandscapeSidepanel extends PureComponent {

	componentWillMount() {
		this.fetchGenes(this.props);
	}

	componentWillUpdate(nextProps) {
		this.fetchGenes(nextProps);
	}

	fetchGenes(props) {
		const { dispatch, dataset } = props;
		const { geneToRow } = dataset.col;
		const viewState = dataset.viewState.col;
		const { xAttrs, yAttrs, colorAttr } = viewState;

		// fetch any selected genes (that aren't being fetched yet).
		let genes = [];
		for (let i = 0; i < xAttrs.length; i++) {
			let gene = xAttrs[i].attr;
			if (geneToRow[gene] &&
				!dataset.fetchedGenes[gene] &&
				!dataset.fetchingGenes[gene]) {
				genes.push(gene);
			}
		}
		for (let i = 0; i < yAttrs.length; i++) {
			let gene = yAttrs[i].attr;
			if (gene && geneToRow[gene] &&
				!dataset.fetchedGenes[gene] &&
				!dataset.fetchingGenes[gene]) {
				genes.push(gene);
			}
		}
		if (geneToRow[colorAttr] !== undefined &&
			!dataset.fetchedGenes[colorAttr] &&
			!dataset.fetchingGenes[colorAttr]) {
			genes.push(colorAttr);
		}
		if (genes.length) {
			dispatch(fetchGene(dataset, genes));
		}
	}

	render() {
		const { dispatch, dataset } = this.props;
		const viewState = dataset.viewState.col;

		return (
			<ScatterplotSidepanel
				dispatch={dispatch}
				dataset={dataset}
				axis={'col'}
				viewState={viewState}
			/>
		);
	}
}

LandscapeSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};