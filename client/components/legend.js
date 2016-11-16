import React, { PropTypes } from 'react';

import * as colors from '../js/colors';

export function AttrLegend(props) {
	const { filterFunc, attr, mode } = props;
	const { mostFrequent, indexedVal } = attr;
	let l = Math.min(mostFrequent.length, 20);
	let visibleData = [];
	const isFloat = attr.arrayType === 'float32' ||
			attr.arrayType === 'number'||
			attr.arrayType === 'float64';
	for (let i = 0; i < l; i++) {
		let { val, count, filtered } = mostFrequent[i];
		const filter = filterFunc(val);
		const cellStyle = {
			display: 'inline-block',
			color: filtered ? 'lightgrey' : mode === 'Categorical' ? colors.category20[i + 1] : 'black',
			cursor: 'pointer',
			textDecoration: (filtered ? 'line-through' : null),
		};

		let dataVal = val;
		if (indexedVal){
			dataVal = indexedVal[val];
		}
		if (isFloat){
			dataVal = dataVal.toExponential(3);
		}
		visibleData.push(
			<td
				key={i}
				onClick={filter}
				style={cellStyle}>
				<span style={{ fontStyle: 'normal', fontWeight:'bold' }}>■ {dataVal}:</span> {count}
			</td>
		);
	}

	if (l < mostFrequent.length) {
		let rest = 0;
		while (l < mostFrequent.length) { rest += mostFrequent[l++].count; }
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