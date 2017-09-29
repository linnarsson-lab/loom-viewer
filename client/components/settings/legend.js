import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import { OverlayTooltip } from 'components/settings/collapsible';

import {
	nullFunc,
	attrToColorFactory,
} from 'js/util';

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

		const {
			uniques,
			indexedVal,
		} = attr;

		let filteredVals = {};
		for (let i = 0; i < filteredAttrs.length; i++){
			const filterEntry = filteredAttrs[i];
			if (filterEntry.attr === attr.name) {
				filteredVals[filterEntry.val] = true;
			}
		}

		const selectColor = attrToColorFactory(attr, mode, settings);

		const isFloat = attr.arrayType === 'float32' ||
			attr.arrayType === 'number' ||
			attr.arrayType === 'float64';

		const showBlock = mode !== 'Bars';
		let l = Math.min(uniques.length, 20),
			i = l,
			visibleData = new Array(l + (l < uniques.length ? 1 : 0));
		while (i--) {

			let {
				val,
				count,
			} = uniques[i];

			const filtered = filteredVals[val];
			const cellStyle = {
				display: 'flex',
				cursor: 'pointer',
				textDecoration: (filtered ? 'line-through' : null),
			};
			const color = filtered ? 'lightgrey' : selectColor(val);
			let icon = showBlock ? (
				<span style={{ color }}>██</span>
			) : null;

			let dataVal = indexedVal ? indexedVal[val] : val;
			if (isFloat) {
				dataVal = dataVal.toExponential(3);
			}

			const valFilterFunc = filterFunc ? filterFunc(val) : nullFunc;

			const tooltipText = filtered ?
				`Click to remove "${dataVal}" from filter` :
				`Filter out "${dataVal}"`;

			visibleData[i] = (
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
		i = l;
		while (i--) {
			rest -= uniques[i].count;
		}
		if (rest) {
			let icon = showBlock ? (
				<span style={restStyle1}>□ </span>
			) : null;
			visibleData[l] = (
				<td key={20} style={restStyle2}>
					{icon} (other): {rest}
				</td>
			);
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
	attr: PropTypes.object.isRequired,
	mode: PropTypes.string,
	settings: PropTypes.object,
};