import React, { PropTypes } from 'react';
import { Glyphicon } from 'react-bootstrap';

export const SortableTable = function (props) {
	const { data, columns, dispatch, sortKey } = props;

	let headerRows = [];
	let maxHeaders = 0;
	for (let i = 0; i < columns.length; i++) {
		maxHeaders = Math.max(maxHeaders, columns[i].headers.length);
	}
	for (let i = 0; i < maxHeaders; i++) {
		let headerCells = [];
		for (let j = 0; j < columns.length; j++) {
			const column = columns[j];
			const { key, onDispatch, headers, headerStyles } = column;
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
			headerCells.push(
				<th
					key={key}
					style={headerStyles ? headerStyles[i] : null }
					onClick={handleClick} >
					{sortIcon}{headers[i]}
				</th>
			);
		}
		headerRows.push(<tr>{headerCells}</tr>);
	}

	const sortedData = data.slice(0);
	let dataRows = [];
	for (let i = 0; i < sortedData.length; i++) {
		const row = sortedData[i];
		let rowCells = [];
		for (let j = 0; j < columns.length; j++) {
			const {dataStyle, key } = columns[j];
			rowCells.push(<td style={dataStyle} key={key} >{row[key]}</td>);
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
	data: PropTypes.array,
	columns: PropTypes.array,
	dispatch: PropTypes.func.isRequired,
	sortKey: PropTypes.shape({
		key: PropTypes.string,
		ascending: PropTypes.bool,
	}),
};
