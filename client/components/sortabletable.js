import React, { PropTypes } from 'react';
import { Glyphicon } from 'react-bootstrap';
import { isEqual } from 'lodash';

// we can map a single or multiple
// keys from the data set to a cell.
const mapToCell = (row, key, keys) => {
	return row ? (
		keys ? keys.map((k) => { return row[k]; }) : row[key]
	) : null;
};

export const SortableTable = function (props) {
	const { data, columns, sortedKey } = props;

	let headerRows = [];
	let maxHeaders = 0;
	for (let i = 0; i < columns.length; i++) {
		const { headers } = columns[i];
		if (headers) {
			maxHeaders = Math.max(maxHeaders, columns[i].headers.length);
		}
	}
	for (let i = 0; i < maxHeaders; i++) {
		// Header
		let headerCells = [];
		for (let j = 0; j < columns.length; j++) {
			const column = columns[j];
			const { key, keys, headers, headerStyles, onHeaderClick } = column;
			let sortIcon;
			if (i === 0) {
				sortIcon = sortedKey && key === sortedKey.key ? (
					<Glyphicon
						glyph={column.sortIcon + (sortedKey.ascending ? '' : '-alt')} />
				) : null;
			}
			const header = headers ? headers[i] : null;
			const onClick = header ? Array.isArray(onHeaderClick) ? onHeaderClick[i] : onHeaderClick : null;
			headerCells.push(
				<th
					key={keys ? keys.join(' ') : key}
					style={Object.assign({ cursor: onClick ? 'pointer' : 'default' }, headerStyles ? headerStyles[i] : null)}
					onClick={onClick}>
					{header}{sortIcon}
				</th>
			);
		}
		headerRows.push(<tr key={i} >{headerCells}</tr>);
	}


	// Data
	const sortedData = data.slice(0);
	let dataRows = [];
	for (let i = 0; i < sortedData.length; i++) {
		let rowCells = [];
		for (let j = 0; j < columns.length; j++) {
			const {dataStyle, key, keys, mergeRows } = columns[j];
			const cell = mapToCell(sortedData[i], key, keys);
			let rowSpan = 1;
			if (mergeRows) {
				if (isEqual(cell, mapToCell(sortedData[i - 1], key, keys))) {
					continue;
				} else {
					while (isEqual(cell, mapToCell(sortedData[i + rowSpan], key, keys))) { rowSpan++; }
				}
			}
			rowCells.push(
				<td
					style={dataStyle}
					rowSpan={rowSpan}
					key={keys ? keys.join(' ') : key} >
					{cell}
				</td>
			);
		}
		dataRows.push(<tr key={i} >{rowCells}</tr>);
	}

	return (
		<table style={{ width: '100%' }}>
			<thead>
				{headerRows}
			</thead>
			<tbody>
				{dataRows}
			</tbody>
		</table>
	);
};

SortableTable.propTypes = {
	data: PropTypes.array.isRequired,
	columns: PropTypes.array.isRequired,
	// Indicates to the table by which of the columns,
	// if any, the data is sorted and whether it is
	// ascending or descending
	sortedKey: PropTypes.shape({
		key: PropTypes.string,
		ascending: PropTypes.bool,
	}),
};
