import React, { PropTypes } from 'react';
import { ScatterplotSidepanel } from './scatterplot-sidepanel';
import { fetchGene } from '../actions/actions';

import { SET_VIEW_PROPS, FILTER_METADATA } from '../actions/actionTypes';

export const LandscapeSidepanel = function (props) {
	const { dispatch, dataset } = props;
	const { row, col } = dataset;
	const geneData = row.attrs.Gene.data,
		attrs = col.attrs,
		lss = dataset.viewState.landscape;
	const { coordinateAttrs, colorAttr } = lss;

	// filter out undefined attributes;
	let newAttrs = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			newAttrs.push(attr);
		}
	}

	const coordAttrFactory = (idx) => {
		return (value) => {
			let newVals = newAttrs.slice(0);
			if (value) {
				newVals[idx] = value;
				if (geneData.indexOf(value) !== -1) {
					dispatch(fetchGene(dataset, [value]));
				}
			} else {
				for (let i = idx; i < newVals.length; i++) {
					newVals[i] = newVals[i + 1];
				}
				newVals.pop();
			}
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'landscape',
				path: dataset.path,
				viewState: { landscape: { coordinateAttrs: newVals } },
			});
		};
	};

	const colAttrOptions = col.keys.filter((key) => {
		return attrs[key] && !attrs[key].uniqueVal;
	}).concat(geneData);

	const filterFunc = (val) => {
		return () => {
			dispatch({
				type: FILTER_METADATA,
				path: dataset.path,
				stateName: 'landscape',
				attr: 'colAttrs',
				key: colorAttr,
				val,
			});
		};
	};
	
	return (
		<ScatterplotSidepanel
			dataset={dataset}
			dispatch={dispatch}
			attrs={attrs}
			attrOptions={colAttrOptions}
			coordAttrFactory={coordAttrFactory}
			stateName={'landscape'}
			filterFunc={filterFunc}
			viewState={lss}
			/>
	);
};

LandscapeSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};