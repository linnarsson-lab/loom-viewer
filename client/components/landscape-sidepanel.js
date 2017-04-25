import React, { Component, PropTypes } from 'react';
import { ScatterplotSidepanel } from './scatterplot-sidepanel';
import { fetchGene } from '../actions/actions';

export class LandscapeSidepanel extends Component {

	componentWillMount() {
		this.fetchGenes(this.props);
	}

	componentWillUpdate(nextProps) {
		this.fetchGenes(nextProps);
	}

	fetchGenes(props) {
		const { dispatch, dataset } = props;
		const { keys } = dataset.col;
		const viewState = dataset.viewState.landscape;
		const { xAttrs, yAttrs, colorAttr } = viewState;

		// fetch any selected genes (that aren't being fetched yet).
		let genes = [];
		for (let i = 0; i < xAttrs.length; i++) {
			let value = xAttrs[i].attr;
			// `keys` will be in the range of a few dozen attributes
			// at most, whereas `genes` or `CellID` will be in the
			// thousands. So it's likely faster to check if a value
			// *isn't* in `keys`.
			if (value && keys.indexOf(value) === -1 &&
				!dataset.fetchedGenes[value]) {
				genes.push(value);
			}
		}
		for (let i = 0; i < yAttrs.length; i++) {
			let value = yAttrs[i].attr;
			if (value && keys.indexOf(value) === -1 &&
				!dataset.fetchedGenes[value]) {
				genes.push(value);
			}
		}
		if (keys.indexOf(colorAttr) === -1 && !dataset.fetchedGenes[colorAttr]) {
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