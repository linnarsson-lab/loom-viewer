import React, { PropTypes } from 'react';

import * as colors from '../js/colors';

export function AttrLegend(props) {
	const { filterFunc, attr, mode } = props;
	const { uniques, indexedVal } = attr;
	let visibleData = [];
	const nullfunc = () => { };

	const isFloat = attr.arrayType === 'float32' ||
		attr.arrayType === 'number' ||
		attr.arrayType === 'float64';




	let selectColor = () => {
		return 'black';		// Bars
	};
	if (mode === 'Categorical') {
		selectColor = (i) => {
			return colors.category20[i + 1];
		};
	} else if (mode === 'Heatmap' || mode === 'Heatmap2') {
		let { min, max, hasZeros } = attr;
		min = hasZeros && min > 0 ? 0 : min;
		const heatmapScale = ((colors.solar256.length - 1) / (max - min) || 1);
		const palette = mode === 'Heatmap' ? colors.solar256 : colors.YlGnBu256;
		selectColor = (i, val) => {
			const heatmapIdx = ((val - min) * heatmapScale) | 0;
			return palette[heatmapIdx];
		};
	}

	let l = Math.min(uniques.length, 20);
	for (let i = 0; i < l; i++) {
		let { val, count, filtered } = uniques[i];
		const color = filtered ? 'lightgrey' : selectColor(i, val);

		const cellStyle = {
			display: 'inline-block',
			cursor: 'pointer',
			textDecoration: (filtered ? 'line-through' : null),
		};

		let dataVal = indexedVal ? indexedVal[val] : val;
		if (isFloat) {
			dataVal = dataVal.toExponential(3);
		}

		const filter = filterFunc ? filterFunc(val) : nullfunc;

		visibleData.push(
			<td
				key={`${i}_${val}`}
				onClick={filter}
				style={cellStyle}>
				<span style={{ fontStyle: 'normal', fontWeight: 'bold' }}><span style={{ color }}>⬛</span> {dataVal}:</span> {count}
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