import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import * as colors from '../js/colors';

export class AttrLegend extends PureComponent {
	render() {
		const { filterFunc, attr, mode } = this.props;
		const { uniques, indexedVal } = attr;
		const nullfunc = () => { };

		const isFloat = attr.arrayType === 'float32' ||
			attr.arrayType === 'number' ||
			attr.arrayType === 'float64';

		let selectColor = () => {
			return 'black';		// Bars
		};
		let block = '';
		if (mode === 'Categorical') {
			selectColor = (i) => {
				return colors.category20[i + 1];
			};
			// We're using █ (FULL BLOCK) because some fonts replace
			// BLACK SQUARE BLOCK with a graphical icon, and we need
			// to be able to color the block.
			// https://en.wikipedia.org/wiki/Block_Elements
			// https://en.wikipedia.org/wiki/Geometric_Shapes
			block = '██';
		} else if (mode === 'Heatmap' || mode === 'Heatmap2') {
			let { min, max } = attr;
			const heatmapScale = ((colors.solar256.length - 1) / (max - min) || 1);
			const palette = mode === 'Heatmap' ? colors.solar256 : colors.YlGnBu256;
			selectColor = (i, val) => {
				const heatmapIdx = ((val - min) * heatmapScale) | 0;
				return palette[heatmapIdx];
			};
			block = '██';
		}

		let l = Math.min(uniques.length, 20),
			i = l,
			visibleData = new Array(l + (l < uniques.length ? 1 : 0));
		while (i--) {
			let { val, count, filtered } = uniques[i];
			const color = filtered ? 'lightgrey' : selectColor(i, val);

			const cellStyle = {
				display: 'inline-block',
				cursor: 'pointer',
				textDecoration: (filtered ? 'line-through' : null),
			};

			let icon = block ? (
				<span style={{ color }}>██</span>
			) : null;

			let dataVal = indexedVal ? indexedVal[val] : val;
			if (isFloat) {
				dataVal = dataVal.toExponential(3);
			}

			const filter = filterFunc ? filterFunc(val) : nullfunc;

			visibleData[i] = (
				<td
					key={`${i}_${val}`}
					onClick={filter}
					style={cellStyle}>
					<span style={{ fontStyle: 'normal', fontWeight: 'bold' }}>
						{icon} {dataVal}:
				</span> {count}
				</td>
			);
		}

		// sum count for remaining values
		if (l < uniques.length) {
			// by definition, data.length is the total
			// number of datapoints. So the remaining
			// number of datapoints is the total
			// total datapoints minus shown
			// datapoints
			let rest = attr.data.length, i = l;
			while (i--) {
				rest -= uniques[i].count;
			}
			let icon = block ? (
				<span style={{ fontStyle: 'normal' }}>□ </span>
			) : null;
			visibleData[l] = (
				<td key={20} style={{ display: 'inline-block' }}>
					{icon} (other): {rest}
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
}


AttrLegend.propTypes = {
	mode: PropTypes.string,
	filterFunc: PropTypes.func.isRequired,
	attr: PropTypes.object.isRequired,
};