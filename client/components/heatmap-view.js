import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline';
import * as _ from 'lodash';
import { fetchDataSet } from '../actions/actions';

class HeatmapViewComponent extends Component {
	render() {
		const { dispatch, dataSet, genes, heatmapState, viewState } = this.props;

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
		let heatmapWidth = viewState.width - 350;
		let heatmapHeight = viewState.height - 40;
		let verticalSparklineWidth = 20;
		if (heatmapState.rowMode === 'Text' || heatmapState.rowMode === 'TexAlways') {
			heatmapWidth = viewState.width - 450;
			verticalSparklineWidth = 120;
		}
		let horizontalSparklineHeight = 20;
		if (heatmapState.colMode === 'Text') {
			horizontalSparklineHeight = 120;
			heatmapHeight = viewState.height - 140;
		}
		return (
			<div className='view'>
				<div className='view-sidepanel'>
					<HeatmapSidepanel
						heatmapState={heatmapState}
						dataSet={dataSet}
						genes={genes}
						dispatch={dispatch}
						/>
				</div>
				<div className='view-main'>
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
			</div>
		);
	}
}

HeatmapViewComponent.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	genes: PropTypes.object.isRequired,
	heatmapState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class HeatmapViewContainer extends Component {

	componentDidMount() {
		const { dispatch, data, params } = this.props;
		const { transcriptome, project, dataset } = params;
		const dataSetName = transcriptome + '__' + project + '__' + dataset;
		dispatch(fetchDataSet({ dataSets: data.dataSets, dataSetName: dataSetName }));
	}

	render() {
		const { dispatch, data, heatmapState, params } = this.props;
		const { transcriptome, project, dataset } = params;
		const fetchDatasetString = transcriptome + '__' + project + '__' + dataset;
		const dataSet = data.dataSets[fetchDatasetString];
		return (dataSet ?
			<HeatmapViewComponent
				dispatch={dispatch}
				heatmapState={heatmapState}
				dataSet={dataSet}
				genes={data.genes} />
			:
			<div className='container' >Fetching dataset...</div>
		);
	}
}

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

