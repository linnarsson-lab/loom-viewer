import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { SparklineSidepanel } from './sparkline-sidepanel';
import { SparklineList } from './sparklines';

import { ViewInitialiser } from '../view-initialiser';
import { RemountOnResize } from '../remount-on-resize';

import { isEqual } from 'lodash';

import { firstMatch } from '../../js/util';

class SparklineViewComponent extends PureComponent {
	componentWillMount() {
		this.setState({
			indicesChanged: false,
		});
	}

	componentWillReceiveProps(nextProps) {
		const pVS = this.props.dataset.viewState.col,
			nVS = nextProps.dataset.viewState.col;

		const indicesChanged = !isEqual(pVS.order, nVS.order) ||
			!isEqual(pVS.indices, nVS.indices);
		this.setState({
			indicesChanged,
		});

	}

	render() {
		const { dispatch, dataset } = this.props;
		const { col } = dataset;
		const sl = dataset.viewState.sparkline;
		const {
			indices,
			settings,
		} = dataset.viewState.col;
		// The old column attribute values that we displayed in the "legend"
		let legendData = col.attrs[sl.colAttr];
		// if colAttr does not exist (for example, the default values
		// in the Loom interface is not present), pick the first column
		if (legendData === undefined) {
			legendData = col.attrs[col.keys[0]];
		}
		const { indicesChanged } = this.state;

		return (
			<RemountOnResize>
				<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
					<div
						style={{
							width: '300px',
							margin: '10px',
							overflowY: 'scroll',
						}}>
						<SparklineSidepanel
							dispatch={dispatch}
							dataset={dataset}
						/>
					</div>
					<SparklineList
						attrs={dataset.col.attrs}
						selection={sl.genes}
						indicesChanged={indicesChanged}
						groupAttr={sl.groupBy ? sl.colAttr : ''}
						indices={indices}
						geneMode={sl.geneMode}
						col={col}
						colAttr={sl.colAttr}
						colMode={sl.colMode}
						path={dataset.path}
						settings={settings}
						showLabels={sl.showLabels} />
				</div>
			</RemountOnResize>
		);
	}
}


SparklineViewComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const stateInitialiser = (dataset) => {
	// Initialise sparklineState for this dataset
	return {
		sparkline: {
			colAttr: firstMatch(dataset.col.attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
			colMode: 'Stacked',
			geneMode: 'Bars',
			genes: ['Cdk1', 'Top2a', 'Hexb', 'Mrc1', 'Lum', 'Col1a1', 'Cldn5', 'Acta2', 'Tagln', 'Foxj1', 'Ttr', 'Aqp4', 'Meg3', 'Stmn2', 'Gad2', 'Slc32a1', 'Plp1', 'Sox10', 'Mog', 'Mbp', 'Mpz'],
			showLabels: true,
		},
		col: {
			settings: {
				lowerBound: 0,
				upperBound: 100,
				log2Color: true,
				clip: false,
			},
		},
	};
};

export class SparklineViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={SparklineViewComponent}
				stateName={'sparkline'}
				stateInitialiser={stateInitialiser}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

SparklineViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	datasets: PropTypes.object,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		datasets: state.datasets.list,
	};
};

export const SparklineView = connect(mapStateToProps)(SparklineViewInitialiser);
