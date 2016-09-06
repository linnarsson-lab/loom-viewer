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

		this.state = { resizing: true };

		const resize = () => { this.setState({ resizing: true }); };
		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// (unmount, resize, remount)-ing of the canvas.
		this.setResize = _.debounce(resize, 200);

		this.renderOnResize = () => { this.renderHeatmapview(this.props); };
	}

	componentDidMount() {
		window.addEventListener('resize', this.setResize);
		this.setState({ resizing: false });
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.setResize);
	}

	componentDidUpdate(prevProps, prevState) {
		if (!prevState.resizing && this.state.resizing) {
			this.setState({ resizing: false });
		}
	}

	renderHeatmapview() {
		const { dispatch, dataSet, fetchedGenes, heatmapState } = this.props;
		const { dataBounds } = heatmapState;

		const colGeneSelected = (heatmapState.colAttr === '(gene)') &&
			fetchedGenes.hasOwnProperty(heatmapState.colGene);

		const colData = colGeneSelected ?
			fetchedGenes[heatmapState.colGene]
			:
			dataSet.colAttrs[heatmapState.colAttr];

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
		const sparklineHeight = 80 / (window.devicePixelRatio || 1);
		let heatmapWidth = el.clientWidth - sparklineHeight;
		let heatmapHeight = el.clientHeight - sparklineHeight;
		let heatmapSize = {
			display: 'flex',
			flex: '0 0 auto',
			minWidth: `${heatmapWidth}px`,
			maxWidth: `${heatmapWidth}px`,
			minHeight: `${heatmapHeight}px`,
			maxHeight: `${heatmapHeight}px`,
		};
		return (
			<div className='view-vertical'>
				<Sparkline
					orientation='horizontal'
					width={heatmapWidth}
					height={sparklineHeight}
					data={colData}
					dataRange={[dataBounds[0], dataBounds[2]]}
					mode={heatmapState.colMode}
					style={{ marginRight: (sparklineHeight + 'px') }}
					/>
				<div className='view'>
					<div style={heatmapSize}>
						<Heatmap
							transcriptome={dataSet.transcriptome}
							project={dataSet.project}
							dataset={dataSet.dataset}
							shape={dataSet.shape}
							zoomRange={dataSet.zoomRange}
							fullZoomWidth={dataSet.fullZoomWidth}
							fullZoomHeight={dataSet.fullZoomHeight}
							onViewChanged={
								(dataBounds) => {
									dispatch({
										type: 'SET_HEATMAP_PROPS',
										dataBounds,
									});
								}
							} />
					</div>
					<Sparkline
						orientation='vertical'
						width={sparklineHeight}
						height={heatmapHeight}
						data={rowData}
						dataRange={[dataBounds[1], dataBounds[3]]}
						mode={heatmapState.rowAttr === '(gene positions)' ? 'TextAlways' : heatmapState.rowMode}
						/>
				</div>
			</div >
		);
	}

	render() {
		const { dispatch, dataSet, fetchedGenes, heatmapState } = this.props;

		let heatmap = null;
		if (!this.state.resizing) {
			heatmap = this.renderHeatmapview(this.props);
		}
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
					{heatmap}
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

