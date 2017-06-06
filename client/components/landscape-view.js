import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { LandscapeSidepanel } from './landscape-sidepanel';
import { ViewInitialiser } from './view-initialiser';
import { Canvas } from './canvas';
import { RemountOnResize } from './remount-on-resize';
import { scatterplot } from './scatterplot';

class LandscapeMatrix extends PureComponent {
	componentWillMount() {
		const { xAttrs, yAttrs } = this.props.dataset.viewState.col;
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
		const { xAttrs, yAttrs } = nextProps.dataset.viewState.col;
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
				scaleFactor,
				indices,
			} = dataset.viewState.col;

			const el = this.refs.landscapeContainer;
			const containerWidth = el.clientWidth - 20;
			const containerHeight = el.clientHeight - 20;

			const { col } = dataset;
			const color = col.attrs[colorAttr];
			let matrix = [];
			for (let j = 0; j < yAttrs.length; j++) {
				const rowWidth = containerWidth;
				const rowHeight = (((containerHeight * (j + 1) / yAttrs.length) | 0) - ((containerHeight * j / yAttrs.length) | 0) | 0);
				let _row = [];
				for (let i = 0; i < xAttrs.length; i++) {
					const canvasWidth = (((containerWidth * (i + 1) / xAttrs.length) | 0) - ((containerWidth * i / xAttrs.length) | 0) | 0) - 2;
					const canvasHeight = rowHeight - 2;
					let paint;
					const xAttr = xAttrs[i], yAttr = yAttrs[j];
					const logscale = { x: xAttr.logscale, y: yAttr.logscale };
					const jitter = { x: xAttr.jitter, y: yAttr.jitter };
					const x = col.attrs[xAttr.attr];
					const y = col.attrs[yAttr.attr];
					paint = scatterplot(x, y, color, indices, colorMode, logscale, jitter, scaleFactor);
					_row.push(
						<Canvas
							key={`${j}_${yAttrs[j].attr}_${i}_${xAttrs[i].attr}`}
							style={{
								border: '1px solid lightgrey',
								flex: '0 0 auto',
								margin: '1px',
							}}
							width={canvasWidth}
							height={canvasHeight}
							paint={paint}
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
							minWidth: `${rowWidth}px`,
							maxWidth: `${rowWidth}px`,
							minHeight: `${rowHeight}px`,
							maxHeight: `${rowHeight}px`,
						}}>
						{_row}
					</div>
				);
			}

			return (
				<div className='view-vertical' ref='landscapeContainer'>
					{matrix}
				</div>
			);
		} else {
			return (
				<div className='view centered' ref='landscapeContainer'>
					Initialising Landscape
				</div>
			);
		}
	}
}

LandscapeMatrix.propTypes = {
	// Passed down by ViewInitialiser
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class LandscapeComponent extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;

		return (
			<RemountOnResize>
				<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
					<div
						style={{
							width: '300px',
							margin: '10px',
							overflowY: 'scroll',
						}}>
						<LandscapeSidepanel
							dataset={dataset}
							dispatch={dispatch}
						/>
					</div>
					<LandscapeMatrix
						dataset={dataset}
						dispatch={dispatch}
					/>
				</div>
			</RemountOnResize>
		);
	}
}

LandscapeComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { // Initialise landscapeState for this dataset
	xAttrs: [{ attr: '_X', jitter: false, logscale: false }],
	yAttrs: [{ attr: '_Y', jitter: false, logscale: false }],
	scaleFactor: 40,
	lowerBound: 0,
	upperBound: 100,
	colorAttr: 'Clusters',
	colorMode: 'Categorical',
};

export class LandscapeViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={LandscapeComponent}
				stateName={'col'}
				initialState={initialState}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

LandscapeViewInitialiser.propTypes = {
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

export const LandscapeView = connect(mapStateToProps)(LandscapeViewInitialiser);