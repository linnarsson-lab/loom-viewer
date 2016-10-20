import React, { PropTypes } from 'react';
import { Glyphicon } from 'react-bootstrap';
import { isEqual } from 'lodash';

export const SortableTable = function (props) {
	const { data, columns, dispatch, sortKey } = props;

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
			const { key, keys, header, headers, headerStyles, onDispatch } = column;
			let handleClick, sortIcon;
			if (!i) {
				handleClick = onDispatch ? () => {
					dispatch(onDispatch);
				} : undefined;
				sortIcon = sortKey && key === sortKey.key ? (
					<Glyphicon
						glyph={column.sortIcon + (sortKey.ascending ? '' : '-alt')} />
				) : undefined;
			}
			if (headers) {
				headerCells.push(
					<th
						key={keys ? keys.join(' ') : key}
						style={headerStyles ? headerStyles[i] : null}
						onClick={handleClick}>
						{headers[i]}{sortIcon}
					</th>
				);
			} else if (!i) {
				headerCells.push(
					<th
						key={keys ? keys.join(' ') : key}
						style={headerStyles ? headerStyles[0] : null}
						onClick={handleClick}
						rowSpan={maxHeaders}>
						{header}{sortIcon}
					</th>
				);
			}
		}
		headerRows.push(<tr key={i} >{headerCells}</tr>);
	}

	const mapToRow = (row, key, keys) => {
		return row ? (
			keys ? keys.map((k) => { return row[k]; }) : row[key]
		) : null;
	};

	// Data
	const sortedData = data.slice(0);
	let dataRows = [];
	for (let i = 0; i < sortedData.length; i++) {
		let rowCells = [];
		for (let j = 0; j < columns.length; j++) {
			const {dataStyle, key, keys, mergeRows } = columns[j];
			const cell = mapToRow(sortedData[i], key, keys);
			let rowSpan = 1;
			if (mergeRows) {
				if (isEqual(cell, mapToRow(sortedData[i - 1], key, keys))) {
					continue;
				} else {
					while (isEqual(cell, mapToRow(sortedData[i + rowSpan], key, keys))) { rowSpan++; }
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
	dispatch: PropTypes.func.isRequired,
	sortKey: PropTypes.shape({
		key: PropTypes.string,
		ascending: PropTypes.bool,
	}),
};
