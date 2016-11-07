import React, { PropTypes } from 'react';

import * as colors from '../js/colors';

export function AttrLegend(props) {
	const { filterFunc, mostFrequent, mode } = props;
	let l = Math.min(mostFrequent.length, 20);
	let dataCells = [];
	for (let i = 0; i < l; i++) {
		let { val, count, filtered, visible } = mostFrequent[i];
		const filter = filterFunc(val);
		const cellStyle = {
			display: 'inline-block',
			color: visible && mode === 'Categorical' ? colors.category20[i + 1] : 'black',
			cursor: 'pointer',
			textDecoration: (filtered ? 'line-through' : null),
		};
		dataCells.push(
			<td
				key={i}
				onClick={filter}
				style={cellStyle}>
				<span style={{ fontStyle: 'normal', fontWeight: 'bold' }}>■ {val}:</span> {count}
			</td>
		);
	}
	if (l < mostFrequent.length) {
		let rest = 0;
		while (l < mostFrequent.length) { rest += mostFrequent[l++].count; }
		dataCells.push(
			<td key={20} style={{ display: 'inline-block' }}>
				<span style={{ fontStyle: 'normal' }}>□ </span>(other): {rest}
			</td>
		);
	}
	return (
		<table style={{ display: 'block' }}>
			<tbody>
				<tr>
					{dataCells}
				</tr>
			</tbody>
		</table>
	);
}


AttrLegend.propTypes = {
	mode: PropTypes.string,
	filterFunc: PropTypes.func.isRequired,
	mostFrequent: PropTypes.arrayOf(PropTypes.object).isRequired,
};