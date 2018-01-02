import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import { OverlayTooltip } from 'components/settings/collapsible';

import {
	nullFunc,
} from 'js/util';

import {
	attrToColorFactory,
} from 'js/colors';

const buttonStyle = {
	whiteSpace: 'normal',
	textAlign: 'left',
};

const iconStyle = {
	fontStyle: 'normal',
	fontWeight: 'bold',
};

const restStyle1 = { fontStyle: 'normal' };
const restStyle2 = { display: 'flex' };

const rowStyle = {
	display: 'flex',
	flex: '0 0 auto',
	flexWrap: 'wrap',
	justifyContent: 'start',
	alignContent: 'start',
	flexDirection: 'row',
};

export class AttrLegend extends Component {
	render() {
		const {
			filteredAttrs,
			filterFunc,
			attr,
			mode,
			settings,
		} = this.props;


		let visibleData;
		if (attr) {
			const {
				uniques,
				indexedVal,
			} = attr;

			let filteredVals = {};
			for (let i = 0; i < filteredAttrs.length; i++) {
				const filterEntry = filteredAttrs[i];
				if (filterEntry.attr === attr.name) {
					filteredVals[filterEntry.val] = true;
				}
			}

			const selectColor = attrToColorFactory(attr, mode, settings);

			const isFloat = attr.arrayType === 'float32' ||
				attr.arrayType === 'number' ||
				attr.arrayType === 'float64';

			const showBlock = mode !== 'Bars' && mode !== 'Box';
			let l = Math.min(uniques.length, 100);
			visibleData = [];

			const sortedUniques = uniques
				.slice(0, l)
				.sort((a, b) => {
					return a.val < b.val ?
						-1 :
						a.val > b.val ?
							1 :
							0;
				});

			for (let i = 0; i < l; i++) {

				let {
					val,
					count,
				} = sortedUniques[i];

				const filtered = filteredVals[val];
				const cellStyle = {
					display: 'flex',
					cursor: 'pointer',
					textDecoration: filtered ?
						'line-through' :
						null,
				};
				const color = filtered ?
					'lightgrey' :
					selectColor(val);
				let icon = showBlock ?
					(
						<span style={{ color }}>██</span>
					) :
					null;

				let dataVal = indexedVal ?
					indexedVal[val] :
					val;

				if (isFloat) {
					dataVal = dataVal.toExponential(3);
				}

				const valFilterFunc = filterFunc ?
					filterFunc(val) :
					nullFunc;

				const tooltipText = filtered ?
					`Click to remove "${dataVal}" from filter` :
					`Filter out "${dataVal}"`;

				visibleData.push(
					<td
						key={`${i}_${val}`}
						style={cellStyle}>
						<OverlayTooltip
							tooltip={tooltipText}
							tooltipId={`filter-${i}_${val}-tltp`}>
							<Button
								bsStyle='link'
								style={buttonStyle}
								onClick={valFilterFunc} >
								<span style={iconStyle}>{icon} {dataVal}:</span> {count}
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
			for (let i = 0; i < l; i++) {
				rest -= uniques[i].count;
			}
			if (rest) {
				visibleData.push(
					<td key={100} style={restStyle2}>
						{showBlock ?
							<span style={restStyle1}>□</span> :
							null} (other): {rest}
					</td>
				);
			}
		}

		return (
			<table>
				<tbody>
					<tr style={rowStyle}>
						{visibleData}
					</tr>
				</tbody>
			</table>
		);
	}
}


AttrLegend.propTypes = {
	filteredAttrs: PropTypes.array.isRequired,
	filterFunc: PropTypes.func.isRequired,
	attr: PropTypes.object,
	mode: PropTypes.string,
	settings: PropTypes.object,
};