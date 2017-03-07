import React, { PropTypes } from 'react';

import * as colors from '../js/colors';

export function AttrLegend(props) {
	const { filterFunc, attr, mode } = props;
	const { uniques, indexedVal } = attr;
	let visibleData = [];
	const nullfunc = () => {};

	const isFloat = attr.arrayType === 'float32' ||
		attr.arrayType === 'number' ||
		attr.arrayType === 'float64';
	let l = Math.min(uniques.length, 20);
	for (let i = 0; i < l; i++) {
		let { val, count, filtered } = uniques[i];
		const filter = filterFunc ? filterFunc(val) : nullfunc;
		const cellStyle = {
			display: 'inline-block',
			color: filtered ? 'lightgrey' : mode === 'Categorical' ? colors.category20[i + 1] : 'black',
			cursor: 'pointer',
			textDecoration: (filtered ? 'line-through' : null),
		};

		let dataVal = indexedVal ? indexedVal[val] : val;
		if (isFloat) {
			dataVal = dataVal.toExponential(3);
		}
		visibleData.push(
			<td
				key={`${i}_${val}`}
				onClick={filter}
				style={cellStyle}>
				<span style={{ fontStyle: 'normal', fontWeight: 'bold' }}>■ {dataVal}:</span> {count}
			</td>
		);
	}

	// sum count for remaining values
	if (l < uniques.length) {
		let rest = 0;
		while (l < uniques.length) { rest += uniques[l++].count; }
		visibleData.push(
			<td key={20} style={{ display: 'inline-block' }}>
				<span style={{ fontStyle: 'normal' }}>□ </span>(other): {rest}
			</td>
		);
	}

	return (
		<table style={{ display: 'block' }}>
			<tbody>
				<tr>
					{visibleData}
				</tr>
			</tbody>
		</table>
	);
}


AttrLegend.propTypes = {
	mode: PropTypes.string,
	filterFunc: PropTypes.func.isRequired,
	attr: PropTypes.object.isRequired,
};