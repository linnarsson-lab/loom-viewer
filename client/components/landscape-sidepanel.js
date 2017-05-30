import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ScatterplotSidepanel } from './scatterplot-sidepanel';
import { fetchGene } from '../actions/actions';

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
		const viewState = dataset.viewState.landscape;
		const { xAttrs, yAttrs, colorAttr } = viewState;

		// fetch any selected genes (that aren't being fetched yet).
		let genes = [];
		for (let i = 0; i < xAttrs.length; i++) {
			let value = xAttrs[i].attr;
			if (geneToRow[value] &&
				!dataset.fetchedGenes[value]) {
				genes.push(value);
			}
		}
		for (let i = 0; i < yAttrs.length; i++) {
			let value = yAttrs[i].attr;
			if (value && geneToRow[value] &&
				!dataset.fetchedGenes[value]) {
				genes.push(value);
			}
		}
		if (geneToRow[colorAttr] !== undefined &&
			!dataset.fetchedGenes[colorAttr]) {
			genes.push(colorAttr);
		}
		if (genes.length) {
			dispatch(fetchGene(dataset, genes));
		}
	}

	render() {
		const { dispatch, dataset } = this.props;
		const viewState = dataset.viewState.landscape;

		return (
			<ScatterplotSidepanel
				dispatch={dispatch}
				dataset={dataset}
				stateName={'landscape'}
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