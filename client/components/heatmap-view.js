import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline';
import * as _ from 'lodash';
import { FetchDatasetComponent } from './fetch-dataset';

class HeatmapViewComponent extends Component {
	render() {
		const { dispatch, dataSet, genes, heatmapState } = this.props;

		let colData = [];
		if (heatmapState.colAttr === "(gene)") {
			if (genes.hasOwnProperty(heatmapState.colGene)) {
				colData = genes[heatmapState.colGene];
			}
		} else {
			colData = dataSet.colAttrs[heatmapState.colAttr];
		}

		let rowData = dataSet.rowAttrs[heatmapState.rowAttr];
		if (heatmapState.rowAttr === '(gene positions)') {
			const genes = heatmapState.rowGenes.trim().split(/[ ,\r\n]+/);
			rowData = _.map(
				dataSet.rowAttrs["Gene"],
				(x) => { return _.indexOf(genes, x) !== -1 ? x : ''; }
			);
		}

		// Calculate the layout of everything
		let el = this.refs.heatmapContainer;
		let heatmap = null;
		if (el) {
			let heatmapWidth = el.parentNode.clientWidth; //viewState.width - 350;
			let heatmapHeight = el.parentNode.clientHeight; //viewState.height - 40;
			let verticalSparklineWidth = 20;
			if (heatmapState.rowMode === 'Text' || heatmapState.rowMode === 'TexAlways') {
				heatmapWidth -= 100;
				verticalSparklineWidth = 120;
			}
			let horizontalSparklineHeight = 20;
			if (heatmapState.colMode === 'Text') {
				horizontalSparklineHeight = 120;
				heatmapHeight -= 100;
			}
			heatmap = (
				<div style={{ display: 'flex', flex: '1 1 auto'}}>
					<Sparkline
						orientation='horizontal'
						width={heatmapWidth}
						height={horizontalSparklineHeight}
						data={colData}
						dataRange={[heatmapState.dataBounds[0], heatmapState.dataBounds[2]]}
						screenRange={[heatmapState.screenBounds[0], heatmapState.screenBounds[2]]}
						mode={heatmapState.colMode}
						/>
					<Heatmap
						transcriptome={dataSet.transcriptome}
						project={dataSet.project}
						dataset={dataSet.dataset}
						width={heatmapWidth}
						height={heatmapHeight}
						zoom={heatmapState.zoom}
						center={heatmapState.center}
						shape={dataSet.shape}
						zoomRange={dataSet.zoomRange}
						fullZoomWidth={dataSet.fullZoomWidth}
						fullZoomHeight={dataSet.fullZoomHeight}
						onViewChanged={
							(bounds) => {
								dispatch({
									type: 'SET_HEATMAP_PROPS',
									screenBounds: bounds.screenBounds,
									dataBounds: bounds.dataBounds,
									center: bounds.center,
									zoom: bounds.zoom,
								});
							}
						} />
					<Sparkline
						orientation='vertical'
						width={verticalSparklineWidth}
						height={heatmapHeight}
						data={rowData}
						dataRange={[heatmapState.dataBounds[1], heatmapState.dataBounds[3]]}
						screenRange={[heatmapState.screenBounds[1], heatmapState.screenBounds[3]]}
						mode={heatmapState.rowAttr === '(gene positions)' ? 'TextAlways' : heatmapState.rowMode}
						/>
				</div>
			);
		}
		return (
			<div style={{ display: 'flex', flex: '1 1 auto' }}>
				<div className='view-sidepanel'>
					<HeatmapSidepanel
						heatmapState={heatmapState}
						dataSet={dataSet}
						genes={genes}
						dispatch={dispatch}
						/>
				</div>
				<div style={{display: 'flex', flex: '1 1 auto'}} ref='heatmapContainer'>
					{heatmap}
				</div>
			</div>
		);
	}
}

HeatmapViewComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	genes: PropTypes.object.isRequired,
	heatmapState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const HeatmapViewContainer = function (props) {
	const { dispatch, data, heatmapState, params } = props;
	const { project, dataset } = params;
	const dataSet = data.dataSets[dataset];
	return (dataSet === undefined ?
		<FetchDatasetComponent
			dispatch={dispatch}
			dataSets={data.dataSets}
			dataset={dataset}
			project={project} />
		:
		<HeatmapViewComponent
			dispatch={dispatch}
			heatmapState={heatmapState}
			dataSet={dataSet}
			genes={data.genes} />
	);
};

HeatmapViewContainer.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	data: PropTypes.object.isRequired,
	heatmapState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect HeatmapViewContainer to store
import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		heatmapState: state.heatmapState,
		data: state.data,
	};
};

export const HeatmapView = connect(mapStateToProps)(HeatmapViewContainer);

