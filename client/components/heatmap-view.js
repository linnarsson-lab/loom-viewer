import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { HeatmapSidepanel } from './heatmap-sidepanel';
import { Sparkline } from './sparkline';
import * as _ from 'lodash';
import { FetchDatasetComponent } from './fetch-dataset';

class HeatmapViewComponent extends Component {

	constructor(props) {
		super(props);
		this.renderHeatmapview = this.renderHeatmapview.bind(this);
		this.state = {};
	}

	componentDidMount() {
		this.renderHeatmapview(this.props);
	}

	componentWillUpdate(nextProps) {
		if (!_.isEqual(nextProps.heatmapState, this.props.heatmapState)){
			this.renderHeatmapview(nextProps);
		}
	}

	renderHeatmapview(props) {
		const { dispatch, dataSet, fetchedGenes, heatmapState } = props;

		const colGeneSelected = (heatmapState.colAttr === '(gene)') && fetchedGenes.hasOwnProperty(heatmapState.colGene);
		const colData = colGeneSelected ? fetchedGenes[heatmapState.colGene] : dataSet.colAttrs[heatmapState.colAttr];

		let rowData = dataSet.rowAttrs[heatmapState.rowAttr];
		if (heatmapState.rowAttr === '(gene positions)') {
			const shownGenes = heatmapState.rowGenes.trim().split(/[ ,\r\n]+/);
			const allGenes = dataSet.rowAttrs['Gene'];
			rowData = new Array(allGenes.length);
			for (let i = 0; i < allGenes.length; i++) {
				rowData[i] = _.indexOf(allGenes, shownGenes[i]) === -1 ? '' : `${allGenes[i]}`;
			}
		}
		// Calculate the layout of everything
		const el = this.refs.heatmapContainer;
		let heatmapWidth = el.clientWidth - 20;
		let heatmapHeight = el.clientHeight - 20;
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
		const heatmap = (
			<div className='view-vertical'>
				<div className='view'>
					<Sparkline
						orientation='horizontal'
						width={heatmapWidth}
						height={horizontalSparklineHeight}
						data={colData}
						dataRange={[heatmapState.dataBounds[0], heatmapState.dataBounds[2]]}
						screenRange={[heatmapState.screenBounds[0], heatmapState.screenBounds[2]]}
						mode={heatmapState.colMode}
						style={{ marginRight: (verticalSparklineWidth + 'px') }}
						/>
				</div>
				<div className='view'>
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
		this.setState({ heatmap });
	}

	render() {
		const { dispatch, dataSet, fetchedGenes, heatmapState } = this.props;

		return (
			<div className='view'>
				<div className='sidepanel'>
					<HeatmapSidepanel
						heatmapState={heatmapState}
						dataSet={dataSet}
						fetchedGenes={fetchedGenes}
						dispatch={dispatch}
						/>
				</div>
				<div className='view' ref='heatmapContainer'>
					{this.state.heatmap}
				</div>
			</div>
		);
	}
}

HeatmapViewComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	fetchedGenes: PropTypes.object.isRequired,
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
			fetchedGenes={data.fetchedGenes} />
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

