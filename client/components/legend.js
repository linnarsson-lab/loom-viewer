import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { OverlayTooltip } from './collapsible';

import * as colors from '../js/colors';
const { category20, solar256, YlGnBu256 } = colors;

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
		if (mode === 'Categorical' || mode === 'Stacked') {
			selectColor = (i) => {
				return category20[i + 1];
			};
			// We're using █ (FULL BLOCK) because some fonts replace
			// BLACK SQUARE BLOCK with a graphical icon, and we need
			// to be able to color the block.
			// https://en.wikipedia.org/wiki/Block_Elements
			// https://en.wikipedia.org/wiki/Geometric_Shapes
			block = '██';
		} else if (mode === 'Heatmap' || mode === 'Heatmap2') {
			let { min, max } = attr;
			const heatmapScale = ((solar256.length - 1) / (max - min) || 1);
			const palette = mode === 'Heatmap' ? solar256 : YlGnBu256;
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
				display: 'flex',
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
					style={cellStyle}>
					<OverlayTooltip
						tooltip={filtered ?
							`Click to remove "${dataVal}" from filter` :
							`Filter out "${dataVal}"`}
						tooltipId={`filter-${i}_${val}-tltp`}>
						<Button
							bsStyle='link'
							style={{ whiteSpace: 'normal', textAlign: 'left' }}
							onClick={filter} >
							<span style={{ fontStyle: 'normal', fontWeight: 'bold' }}>
								{icon} {dataVal}: </span> {count}
						</Button>
					</OverlayTooltip>
				</td>
			);
		}

		// Sum count for remaining values.
		// by definition, data.length is the total
		// number of datapoints. So the remaining
		// number of datapoints is the total
		// total datapoints minus shown
		// datapoints
		let rest = attr.data.length;
		i = l;
		while (i--) {
			rest -= uniques[i].count;
		}
		if (rest) {
			let icon = block ? (
				<span style={{ fontStyle: 'normal' }}>□ </span>
			) : null;
			visibleData[l] = (
				<td key={20} style={{ display: 'flex' }}>
					{icon} (other): {rest}
				</td>
			);
		}

		return (
			<table>
				<tbody>
					<tr style={{ display: 'flex', flex: '0 0 auto', flexWrap: 'wrap', justifyContent: 'start', alignContent: 'start', flexDirection: 'row' }}>
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