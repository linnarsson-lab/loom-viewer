import React, { PropTypes } from 'react';
import { Glyphicon } from 'react-bootstrap';

export const SortableTable = function (props) {
	const { data, columns, dispatch, sortKey } = props;
	const headerCells = [];
	for (let i = 0; i < columns.length; i++) {
		const column = columns[i];
		const { key, onDispatch } = column;
		const handleClick = onDispatch ? () => {
			dispatch(onDispatch);
		} : undefined;
		const sortIcon = sortKey && key === sortKey.key ? (
			<Glyphicon
				glyph={column.sortIcon + (sortKey.ascending ? '' : '-alt')} />
		) : undefined;
		headerCells.push(
			<th
				key={key}
				style={column.headerStyle}
				onClick={handleClick} >
				{sortIcon}{column.header}
			</th>
		);
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
				<tr>
					{headerCells}
				</tr>
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
