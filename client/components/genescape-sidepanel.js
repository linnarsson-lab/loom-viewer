import React, { PropTypes } from 'react';
import { ScatterplotSidepanel } from './scatterplot-sidepanel';

import { SET_VIEW_PROPS, FILTER_METADATA } from '../actions/actionTypes';

export const GenescapeSidepanel = function (props) {
	const { dispatch, dataset } = props;
	const attrs = dataset.row.attrs;
	const genescapeState = dataset.viewState.genescape;
	const { coordinateAttrs, colorAttr } = genescapeState;

	// filter out undefined attributes from selection;
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
			} else {
				for (let i = idx; i < newVals.length; i++) {
					newVals[i] = newVals[i + 1];
				}
				newVals.pop();
			}
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'genescape',
				path: dataset.path,
				viewState: { genescape: { coordinateAttrs: newVals } },
			});
		};
	};

	const rowAttrOptions = dataset.row.keys.filter(
		(key) => {
			return attrs[key] && !attrs[key].uniqueVal;
		}
	);

	const filterFunc = (val) => {
		return () => {
			dispatch({
				type: FILTER_METADATA,
				path: dataset.path,
				stateName: 'genescape',
				attr: 'rowAttrs',
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
			attrOptions={rowAttrOptions}
			coordAttrFactory={coordAttrFactory}
			stateName={'genescape'}
			filterFunc={filterFunc}
			viewState={genescapeState}
			/>
	);
};

GenescapeSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};