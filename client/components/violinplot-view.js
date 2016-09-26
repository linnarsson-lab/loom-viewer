import React, { Component, PropTypes } from 'react';

import { ViolinPlot } from './violinplot';

const barData = {
	table: [
		{ 'x': 1, 'y': 28 }, { 'x': 2, 'y': 55 },
		{ 'x': 3, 'y': 43 }, { 'x': 4, 'y': 91 },
		{ 'x': 5, 'y': 81 }, { 'x': 6, 'y': 53 },
	],
};

export function ViolinPlotView(props) {
	return <ViolinPlot violinData={barData} />;
}