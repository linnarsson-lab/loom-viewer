import React, { Component, PropTypes } from 'react';
import {
	Panel, ListGroup, ListGroupItem,
	Button, ButtonToolbar, ButtonGroup,
} from 'react-bootstrap';
import Slider from 'rc-slider';

import { AttrLegend } from './legend';
import { DropdownMenu } from './dropdown';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

class CoordinateSettings extends Component {
	componentWillMount() {
		const {
			dispatch, dataset,
			stateName, axis } = this.props;

		const { attrs } = dataset[axis];

		const nullFunc = () => { };

		const setCoordinateFactory = (label, attr1, attr2) => {
			if (attrs[attr1] && attrs[attr2]) {
				return (coordinateAttrs) => {
					const isSet = (coordinateAttrs[0] === attr1) && (coordinateAttrs[1] === attr2);
					const handleClick = () => {
						let newVals = coordinateAttrs.slice(0);
						newVals[0] = attr1;
						newVals[1] = attr2;
						dispatch({
							type: SET_VIEW_PROPS,
							stateName,
							path: dataset.path,
							viewState: { [stateName]: { coordinateAttrs: newVals } },
						});
					};
					return (
						<ButtonGroup>
							<Button
								bsStyle={isSet ? 'success' : 'default'}
								onClick={handleClick}>
								{label}
							</Button>
						</ButtonGroup>
					);
				};
			} else {
				return nullFunc;
			}
		};

		const setTSNE = setCoordinateFactory('tSNE', '_tSNE1', '_tSNE2');
		const setPCA = setCoordinateFactory('PCA', '_PC1', '_PC2');
		const setSFDP = setCoordinateFactory('SFDP', 'SFDP_X', 'SFDP_Y');
		const setLog = setCoordinateFactory('Log', '_LogMean', '_LogCV');

		const coordinateQuickSettings = (
			setTSNE !== nullFunc ||
			setPCA !== nullFunc ||
			setSFDP !== nullFunc ||
			setLog !== nullFunc
		) ? (
				(coordinateAttrs) => {
					return (
						<ButtonGroup justified>
							{setTSNE(coordinateAttrs)}
							{setPCA(coordinateAttrs)}
							{setSFDP(coordinateAttrs)}
							{setLog(coordinateAttrs)}
						</ButtonGroup>
					);
				}
			) : nullFunc;

		const coordAttrHCFactory = (newAttrs, idx) => {
			let newVals = newAttrs.slice(0);
			return (value) => {
				if (value) {
					newVals[idx] = value;
				} else {
					for (let i = idx; i < newVals.length - 1; i++) {
						newVals[i] = newVals[i + 1];
					}
					newVals.pop();
				}
				dispatch({
					type: SET_VIEW_PROPS,
					stateName,
					path: dataset.path,
					viewState: { [stateName]: { coordinateAttrs: newVals } },
				});
			};
		};

		const onClickFactory = (field) => {
			return (value) => {
				dispatch({
					type: SET_VIEW_PROPS,
					stateName,
					path: dataset.path,
					viewState: { [stateName]: { [field]: value } },
				});
			};
		};

		const asMatrixHC = onClickFactory('asMatrix');
		const logscaleHC = onClickFactory('logscale');
		const jitterHC = onClickFactory('jitter');

		this.setState({
			coordinateQuickSettings,
			coordAttrHCFactory,
			asMatrixHC,
			logscaleHC,
			jitterHC,
		});
	}

	shouldComponentUpdate(nextProps) {
		return nextProps.coordinateAttrs !== this.props.coordinateAttrs ||
			nextProps.asMatrix !== this.props.asMatrix ||
			nextProps.logscale !== this.props.logscale ||
			nextProps.jitter !== this.props.jitter;
	}

	render() {
		const { dataset, axis,
			coordinateAttrs, asMatrix,
			logscale, jitter } = this.props;

		const { allKeysNoUniques, dropdownOptions } = dataset[axis];
		const filterOptions = dropdownOptions.allNoUniques;


		const { coordinateQuickSettings, coordAttrHCFactory,
			asMatrixHC, logscaleHC, jitterHC,
		} = this.state;

		// filter out undefined attributes;
		let newAttrs = [];
		for (let i = 0; i < coordinateAttrs.length; i++) {
			let attr = coordinateAttrs[i];
			if (attr) {
				newAttrs.push(attr);
			}
		}

		let i = newAttrs.length + 1, coordinateDropdowns = new Array(i);
		while (i--) {
			const coordHC = coordAttrHCFactory(newAttrs, i);
			coordinateDropdowns[i] = (
				<DropdownMenu
					key={i}
					value={newAttrs[i] ? newAttrs[i] : '<select attribute>'}
					options={allKeysNoUniques}
					filterOptions={filterOptions}
					onChange={coordHC}
				/>
			);
		}
		return (
			<ListGroupItem>
				{coordinateQuickSettings(coordinateAttrs)}
				{coordinateDropdowns}
				<ButtonGroup vertical block>
					<Button
						bsStyle={asMatrix ? 'success' : 'default'}
						onClick={() => { asMatrixHC(!asMatrix); }}>
						Plot Matrix
				</Button>
				</ButtonGroup>
				<label htmlFor={'xAxisButtons'} >X axis:</label>
				<ButtonToolbar id={'xAxisButtons'}>
					<Button
						bsStyle={logscale.x ? 'success' : 'default'}
						onClick={() => { logscaleHC({ x: !logscale.x }); }}>
						log
				</Button>
					<Button
						bsStyle={jitter.x ? 'success' : 'default'}
						onClick={() => { jitterHC({ x: !jitter.x }); }}>
						jitter
				</Button>
				</ButtonToolbar>
				<label htmlFor={'yAxisButtons'} >Y axis:</label>
				<ButtonToolbar id={'yAxisButtons'}>
					<Button
						bsStyle={logscale.y ? 'success' : 'default'}
						onClick={() => { logscaleHC({ y: !logscale.y }); }}>
						log
				</Button>
					<Button
						bsStyle={jitter.y ? 'success' : 'default'}
						onClick={() => { jitterHC({ y: !jitter.y }); }}>
						jitter
				</Button>
				</ButtonToolbar>
			</ListGroupItem>
		);
	}
}

CoordinateSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	stateName: PropTypes.string.isRequired,
	axis: PropTypes.string.isRequired,
	coordinateAttrs: PropTypes.array.isRequired,
	asMatrix: PropTypes.bool.isRequired,
	logscale: PropTypes.object.isRequired,
	jitter: PropTypes.object.isRequired,
};


class ColorSettings extends Component {
	componentWillMount() {
		const { dispatch, dataset, stateName } = this.props;

		const colorAttrHC = (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName,
				path: dataset.path,
				viewState: { [stateName]: { colorAttr: value } },
			});
		};

		const colorSettingsFactory = (colorMode) => {
			return () => {
				dispatch({
					type: SET_VIEW_PROPS,
					stateName,
					path: dataset.path,
					viewState: { [stateName]: { colorMode } },
				});
			};
		};

		const heatmapHC = colorSettingsFactory('Heatmap');
		const heatmap2HC = colorSettingsFactory('Heatmap2');
		const categoricalHC = colorSettingsFactory('Categorical');

		this.setState({
			colorAttrHC,
			heatmapHC,
			heatmap2HC,
			categoricalHC,
		});
	}

	shouldComponentUpdate(nextProps) {

		return nextProps.colorAttr !== this.props.colorAttr ||
			nextProps.colorMode !== this.props.colorMode ||
			nextProps.dataset[nextProps.axis].attrs[nextProps.colorAttr] !== this.props.dataset[this.props.axis].attrs[this.props.colorAttr];
	}

	render() {
		const { dispatch, dataset,
			axis, colorAttr, colorMode,
		} = this.props;

		const { attrs, allKeysNoUniques, dropdownOptions } = dataset[axis];
		const filterOptions = dropdownOptions.allNoUniques;

		const { heatmapHC, heatmap2HC, categoricalHC } = this.state;


		const { colorAttrHC } = this.state;

		return attrs[colorAttr] ? (
			<ListGroupItem>
				<label>Color</label>
				<DropdownMenu
					value={colorAttr}
					options={allKeysNoUniques}
					filterOptions={filterOptions}
					onChange={colorAttrHC}
				/>
				<ButtonGroup justified>
					<ButtonGroup>
						<Button
							bsStyle={colorMode === 'Heatmap' ? 'success' : 'default'}
							onClick={heatmapHC}>
							Heatmap
							</Button>
					</ButtonGroup>
					<ButtonGroup>
						<Button
							bsStyle={colorMode === 'Heatmap2' ? 'success' : 'default'}
							onClick={heatmap2HC}>
							Heatmap2
							</Button>
					</ButtonGroup>
					<ButtonGroup>
						<Button
							bsStyle={colorMode === 'Categorical' ? 'success' : 'default'}
							onClick={categoricalHC}>
							Categorical
							</Button>

					</ButtonGroup>
				</ButtonGroup>
				<AttrLegend
					mode={colorMode}
					filterFunc={(filterVal) => {
						return () => {
							dispatch({
								type: SET_VIEW_PROPS,
								path: dataset.path,
								axis,
								filterAttrName: colorAttr,
								filterVal,
							});
						};
					}}
					attr={attrs[colorAttr]}
				/>
			</ListGroupItem>
		) : (
				<ListGroupItem>
					<label>Color</label>
					<DropdownMenu
						value={colorAttr}
						options={allKeysNoUniques}
						filterOptions={filterOptions}
						onChange={colorAttrHC}
					/>
				</ListGroupItem>
			);
	}
}

ColorSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	stateName: PropTypes.string.isRequired,
	axis: PropTypes.string.isRequired,
	colorAttr: PropTypes.string.isRequired,
	colorMode: PropTypes.string.isRequired,
};

export const ScatterplotSidepanel = (props) => {
	const { dispatch, dataset,
		stateName, axis,
		} = props;
	const { coordinateAttrs, asMatrix,
		colorAttr, colorMode,
		logscale, jitter } = props.viewState;


	return (
		<Panel
			className='sidepanel'
			key={`${stateName}-settings`}
			header='Settings'
			bsStyle='default'>

			<ListGroup fill>
				<CoordinateSettings
					dispatch={dispatch}
					dataset={dataset}
					stateName={stateName}
					axis={axis}
					coordinateAttrs={coordinateAttrs}
					asMatrix={asMatrix}
					logscale={logscale}
					jitter={jitter}
				/>
				<ListGroupItem>
					<div style={{ height: '100px' }}>
						<Slider
							marks={{ 0: '0.1x', 100: '10x' }}
							defaultValue={50} />
					</div>
				</ListGroupItem>
				<ColorSettings
					dispatch={dispatch}
					dataset={dataset}
					stateName={stateName}
					axis={axis}
					colorAttr={colorAttr}
					colorMode={colorMode}
				/>
			</ListGroup>
		</Panel >
	);
};

ScatterplotSidepanel.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	stateName: PropTypes.string.isRequired,
	axis: PropTypes.string.isRequired,
	viewState: PropTypes.object.isRequired,
};