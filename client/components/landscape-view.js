import React, { Component, PropTypes } from 'react';
import { LandscapeSidepanel } from './landscape-sidepanel';
import { Scatterplot } from './scatterplot';
import { fetchDataSet } from '../actions/actions';


class LandscapeViewComponent extends Component {
	constructor(props) {
		super(props);
		this.makeData = this.makeData.bind(this);
	}

	makeData(attr, gene) {
		let data = [];
		if (attr === "(gene)") {
			if (this.props.genes.hasOwnProperty(gene)) {
				data = this.props.genes[gene];
			}
		} else {
			data = this.props.dataSet.colAttrs[attr];
		}
		return data;
	}

	render() {
		const { dispatch, landscapeState, dataSet, genes, viewState } = this.props;
		console.log(landscapeState);
		console.log(dataSet);
		const color = this.makeData(landscapeState.colorAttr, landscapeState.colorGene);
		const x = this.makeData(landscapeState.xCoordinate, landscapeState.xGene);
		const y = this.makeData(landscapeState.yCoordinate, landscapeState.yGene);

		return (
			<div className='view'>
				<div className='view-sidepanel'>
					<LandscapeSidepanel
						landscapeState={landscapeState}
						dataSet={dataSet}
						genes={genes}
						dispatch={dispatch}
						/>
				</div>
				<div className='view-main'>
					<Scatterplot
						x={x}
						y={y}
						color={color}
						colorMode={landscapeState.colorMode}
						width={viewState.width - 350}
						height={viewState.height - 40}
						logScaleColor={landscapeState.colorAttr === "(gene)"}
						logScaleX={landscapeState.xCoordinate === "(gene)"}
						logScaleY={landscapeState.yCoordinate === "(gene)"}
						/>
				</div>
			</div>
		);
	}
}

LandscapeViewComponent.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	genes: PropTypes.object.isRequired,
	landscapeState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};


class LandscapeViewContainer extends Component {
	componentDidMount(){
		const { dispatch, data, params } = this.props;
		const { transcriptome, project, dataset } = params;
		const dataSetName = transcriptome + '__' + project + '__' + dataset;
		dispatch(fetchDataSet({ dataSets: data.dataSets, dataSetName: dataSetName}));
	}
	render(){

		const { dispatch, data, landscapeState, viewState, params } = this.props;
		const { transcriptome, project, dataset } = params;
		const fetchDatasetString = transcriptome + '__' + project + '__' + dataset;
		const dataSet = data.dataSets[fetchDatasetString];
		const genes = data.genes;
		return ( dataSet ?
			<LandscapeViewComponent
				dispatch={dispatch}
				landscapeState={landscapeState}
				dataSet={dataSet}
				genes={genes}
				viewState={viewState} />
		:
			<div>Fetching dataset...</div>
		);
	}

}

LandscapeViewContainer.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	// Passed down by react-redux
	viewState: PropTypes.object.isRequired,
	data: PropTypes.object.isRequired,
	landscapeState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

//connect GenescapeViewContainer to store
import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		landscapeState: state.landscapeState,
		data: state.data,
		viewState: state.viewState,
	};
};

export const LandscapeView = connect(mapStateToProps)(LandscapeViewContainer);
