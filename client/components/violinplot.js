import React, { PropTypes } from 'react';
import { RemountOnResize } from './remount-on-resize';
import { Vega } from './vega';

function makeViolinPlotSpec(width, height) {
	return {
		width: (width - 60),
		height: (height - 60),
		padding: { top: 10, left: 30, bottom: 30, right: 10 },
		data: [{ name: 'table' }],
		signals: [
			{
				name: 'hover', 'init': null,
				streams: [
					{ type: '@bar:mouseover', expr: 'datum' },
					{ type: '@bar:mouseout', expr: 'null' },
				],
			},
		],
		scales: [
			{
				name: 'x',
				type: 'ordinal',
				range: 'width',
				domain: { data: 'table', field: 'x' },
			},
			{
				name: 'y',
				type: 'linear',
				range: 'height',
				domain: { data: 'table', field: 'y' },
				nice: true,
			},
		],
		axes: [
			{ type: 'x', scale: 'x' },
			{ type: 'y', scale: 'y' },
		],
		marks: [
			{
				type: 'rect',
				name: 'bar',
				from: { data: 'table' },
				properties: {
					enter: {
						x: { scale: 'x', field: 'x' },
						width: { scale: 'x', band: true, offset: -1 },
						y: { scale: 'y', field: 'y' },
						y2: { scale: 'y', value: 0 },
					},
					update: {
						fill:{ value: 'steelblue' },
					},
					hover: {
						fill:{ value: 'red' },
					},
				},
			},
		],
	};
}

class ViolinPlotComponent extends React.Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		const view = this.refs.view;
		const width = (view.clientWidth) | 0;
		const height = (view.clientHeight) | 0;
		const spec = makeViolinPlotSpec(width, height);
		this.setState({ spec });
	}

	render() {
		// Vega uses a canvas to render its graphics.
		// The way canvas interacts with CSS layouting is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we only render it after
		// mounting, after CSS layouting is done.
		const { className, style, violinData } = this.props;
		const plot = this.state ? (<Vega spec={this.state.spec} data={violinData} />) : null;
		return (
			<div
				ref='view'
				className={className ? className : 'view'}
				style={style}>
				{plot}
			</div>
		);
	}
}

ViolinPlotComponent.propTypes = {
	violinData: PropTypes.object.isRequired,
	className: PropTypes.string,
	style: PropTypes.object,
};

export function ViolinPlot(props) {
	let style = props.style ? props.style : {};
	if (props.width) {
		style['minWidth'] = (props.width | 0) + 'px';
		style['maxWidth'] = (props.width | 0) + 'px';
	}
	if (props.height) {
		style['minHeight'] = (props.height | 0) + 'px';
		style['maxHeight'] = (props.height | 0) + 'px';
	}
	return (
		<RemountOnResize>
			<ViolinPlotComponent
				className={props.className}
				style={style}
				violinData={props.violinData}
				/>
		</RemountOnResize>
	);
}

ViolinPlot.propTypes = {
	violinData: PropTypes.object.isRequired,
	width: PropTypes.number,
	height: PropTypes.number,
	className: PropTypes.string,
	style: PropTypes.object,
};

/*
// Mental note: you *can* use vega to generate only a legend quite easily.
// All that is required is "scales" and "legends"
{
  "width": 0,
  "height": 0,
  "data": [
    {
      "name": "iris",
      "url": "data/iris.json"
    },
    {
      "name": "fields",
      "values": ["petalWidth", "petalLength", "sepalWidth", "sepalLength"]
    }
  ],
  "scales": [
    {
      "name": "c",
      "type": "ordinal",
      "domain": {"data": "iris", "field": "species"},
      "range": "category10"
    }
  ],
  "legends": [
    {
      "fill": "c",
      "title": "Species",
      "offset": 0,
      "properties": {
        "symbols": {
          "fillOpacity": {"value": 0.5},
          "stroke": {"value": "transparent"}
        }
      }
    }
  ],
  "marks": [
  ]
}

*/