import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { SparklineSidepanel } from './sparkline-sidepanel';
import { Sparkline } from './sparkline';
import * as _ from 'lodash';


export class SparklineView extends Component {
	render() {
		var ss = this.props.sparklineState;
		var ds = this.props.dataState;
		var vs = this.props.viewState;
		var dispatch = this.props.dispatch;

		var colData = ds.currentDataset.colAttrs[ss.colAttr];
		// Figure out the ordering
		var indices = new Array(colData.length);
		for (var i = 0; i < colData.length; ++i) indices[i] = i;
		if (ss.orderByAttr != "(none)") {
			var orderBy = null;
			if (ss.orderByAttr == "(gene)") {
				if (ds.genes.hasOwnProperty(ss.orderByGene)) {
					orderBy = ds.genes[ss.orderByGene];
				}
			} else {
				orderBy = ds.currentDataset.colAttrs[ss.orderByAttr];
			}
			if (orderBy != null) {
				indices.sort(function (a, b) { return orderBy[a] < orderBy[b] ? -1 : orderBy[a] > orderBy[b] ? 1 : 0; });
			}
		}

		// Order the column attribute values
		var temp = new Array(colData.length);
		for (var i = 0; i < colData.length; ++i) temp[i] = colData[indices[i]];
		colData = temp;

		var genes = _.uniq(ss.genes.trim().split(/[ ,\r\n]+/));
		if (genes.length > 0 && genes[0] != "") {
			var geneSparklines = _.map(genes, (gene) => {
				if (ds.genes.hasOwnProperty(gene)) {
					var geneData = new Array(colData.length);
					for (var i = 0; i < geneData.length; ++i) geneData[i] = ds.genes[gene][indices[i]];

					return (
						<div key={gene}>
							<Sparkline
								orientation="horizontal"
								width={vs.width - 450}
								height={20}
								data={geneData}
								dataRange={[0, colData.length]}
								screenRange={[0, vs.width - 450]}
								mode={ss.geneMode}
								/>
							<span className="sparkline-label">{gene}</span>
						</div>
					);
				} else {
					return <div key={gene}></div>;
				}
			});
		} else {
			var geneSparklines = <div></div>;
		}

		return (
			<div className="view">
				<div className="view-sidepanel">
					<SparklineSidepanel
						sparklineState={ss}
						dataState={ds}
						dispatch={dispatch}
						/>
				</div>
				<div className="view-main">
					{/* Borrowing the Leaflet zoom buttons
			  	<div className="leaflet-top leaflet-left">
					<div className="leaflet-control-zoom leaflet-bar leaflet-control">
						<a className="leaflet-control-zoom-in" title="Zoom in">+</a>
						<a className="leaflet-control-zoom-out leaflet-disabled" title="Zoom out">-</a>
					</div>
				</div>				*/}
					<Sparkline
						orientation="horizontal"
						width={vs.width - 450}
						height={20}
						data={colData}
						dataRange={[0, colData.length]}
						screenRange={[0, vs.width - 450]}
						mode={ss.colMode}
						/>
					<span className="sparkline-label">{ss.colAttr}</span>
					<div>
						{geneSparklines}
					</div>
				</div>
			</div>
		)
	}
}

SparklineView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	sparklineState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}
