import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { scatterPlot } from '../../plotters/scatterplot';
import { GenescapeSidepanel } from './genescape-sidepanel';

import { ViewInitialiser } from '../view-initialiser';
import { Canvas } from '../canvas';

import {  firstMatchingKey } from '../../js/util';

class GenescapeMatrix extends PureComponent {
	componentWillMount() {
		const { xAttrs, yAttrs } = this.props.dataset.viewState.row;
		// filter out undefined attributes;
		let newXattrs = [];
		for (let i = 0; i < xAttrs.length; i++) {
			let attr = xAttrs[i];
			if (attr) {
				newXattrs.push(attr);
			}
		}
		let newYattrs = [];
		for (let i = 0; i < yAttrs.length; i++) {
			let attr = yAttrs[i];
			if (attr) {
				newYattrs.push(attr);
			}
		}

		let matrixChangedArr = [];
		for (let i = 0; i < xAttrs.length; i++) {
			matrixChangedArr.push(xAttrs[i].attr);
		}
		for (let i = 0; i < yAttrs.length; i++) {
			matrixChangedArr.push(yAttrs[i].attr);
		}
		const matrixChanged = matrixChangedArr.join('');

		this.setState({
			mounted: false,
			xAttrs: newXattrs,
			yAttrs: newYattrs,
			matrixChanged,
		});
	}

	componentDidMount() {
		this.setState({ mounted: true });
	}

	componentWillReceiveProps(nextProps) {
		const { xAttrs, yAttrs } = nextProps.dataset.viewState.row;
		// filter out undefined attributes;
		let newXattrs = [];
		for (let i = 0; i < xAttrs.length; i++) {
			let attr = xAttrs[i];
			if (attr) {
				newXattrs.push(attr);
			}
		}
		let newYattrs = [];
		for (let i = 0; i < yAttrs.length; i++) {
			let attr = yAttrs[i];
			if (attr) {
				newYattrs.push(attr);
			}
		}

		let matrixChangedArr = [];
		for (let i = 0; i < xAttrs.length; i++) {
			matrixChangedArr.push(xAttrs[i].attr);
		}
		for (let i = 0; i < yAttrs.length; i++) {
			matrixChangedArr.push(yAttrs[i].attr);
		}

		const matrixChanged = matrixChangedArr.join(''),
			mounted = matrixChanged === this.state.matrixChanged;

		this.setState({
			mounted,
			matrixChanged,
			xAttrs: newXattrs,
			yAttrs: newYattrs,
		});
	}

	componentDidUpdate() {
		if (!this.state.mounted) {
			this.setState({ mounted: true });
		}
	}

	render() {
		const { mounted, xAttrs, yAttrs } = this.state;
		if (mounted) {
			const { dataset } = this.props;
			const {
				colorAttr,
				colorMode,
				ascendingIndices,
				settings,
			} = dataset.viewState.row;

			const el = this.refs.genescapeContainer;
			// Avoid triggering scrollbars
			const containerW = el.clientWidth - 20;
			const containerH = el.clientHeight - 20;

			const { row } = dataset;
			const color = row.attrs[colorAttr];
			let matrix = [];
			for (let j = 0; j < yAttrs.length; j++) {
				const rowW = containerW;
				const rowH = ((containerH * (j + 1) / yAttrs.length) | 0) -
					((containerH * j / yAttrs.length) | 0);
				let _row = [];
				for (let i = 0; i < xAttrs.length; i++) {
					const canvasW = ((containerW * (i + 1) / xAttrs.length) | 0) -
						((containerW * i / xAttrs.length) | 0) - 2;
					const canvasH = rowH - 2;
					const xAttr = xAttrs[i],
						yAttr = yAttrs[j],
						x = row.attrs[xAttr.attr],
						y = row.attrs[yAttr.attr],
						scatterPlotSettings = {
							colorMode,
							logX: xAttr.logScale,
							logY: yAttr.logScale,
							jitter: {
								x: xAttr.jitter,
								y: yAttr.jitter,
							},
						};
					_row.push(
						<Canvas
							key={`${j}_${yAttrs[j].attr}_${i}_${xAttrs[i].attr}`}
							style={{
								border: '1px solid lightgrey',
								flex: '0 0 auto',
								margin: '1px',
							}}
							width={canvasW}
							height={canvasH}
							paint={scatterPlot(x, y, color, ascendingIndices, settings, scatterPlotSettings)}
							redraw
							clear
						/>
					);

				}
				matrix.push(
					<div
						key={'row_' + j}
						className={'view'}
						style={{
							flex: '0 0 auto',
							minWidth: `${rowW}px`,
							maxWidth: `${rowW}px`,
							minHeight: `${rowH}px`,
							maxHeight: `${rowH}px`,
						}}>
						{_row}
					</div>
				);
			}

			return (
				<div className='view-vertical' ref='genescapeContainer'>
					{matrix}
				</div>
			);
		} else {
			return (
				<div className='view centred' ref='genescapeContainer'>
					Initialising Genescape
				</div>
			);
		}
	}
}

GenescapeMatrix.propTypes = {
	// Passed down by ViewInitialiser
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class GenescapeComponent extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;

		return (
			<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
				<GenescapeSidepanel
					dataset={dataset}
					dispatch={dispatch}
					style={{
						overflowX: 'hidden',
						overFlowY: 'hidden',
						minHeight: 0,
						width: '300px',
						margin: '10px',
					}}
				/>
				<GenescapeMatrix
					dataset={dataset}
					dispatch={dispatch}
				/>
			</div>
		);
	}
}

GenescapeComponent.propTypes = {
	// Passed down by ViewInitialiser
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const stateInitialiser = (dataset) => {
	const attrs = dataset.row.attrs;
	return {
		genescapeInitialized: true,
		row: {
			// Initialise genescape state for this dataset
			xAttrs: [{
				attr: firstMatchingKey(attrs, ['_X', 'X', '_LogMean', '_tSNE1', '_PCA1']),
				jitter: false,
				logScale: false,
			}],
			yAttrs: [{
				attr: firstMatchingKey(attrs, ['_Y', 'Y', '_LogCV', '_tSNE2', '_PCA2']),
				jitter: false,
				logScale: false,
			}],
			colorAttr: firstMatchingKey(attrs, ['_Selected', '_Excluded']),
			colorMode: 'Categorical',
			settings: {
				scaleFactor: 40,
				lowerBound: 0,
				upperBound: 100,
				logScale: true,
				clip: false,
			},
		},
	};
};

export class GenescapeViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={GenescapeComponent}
				stateName={'genescapeInitialized'}
				stateInitialiser={stateInitialiser}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

GenescapeViewInitialiser.propTypes = {
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

export const GenescapeView = connect(mapStateToProps)(GenescapeViewInitialiser);