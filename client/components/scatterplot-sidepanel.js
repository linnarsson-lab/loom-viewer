import React, { Component, PropTypes } from 'react';
import {
	Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup,
} from 'react-bootstrap';
import Slider from 'rc-slider';

import { AttrLegend } from './legend';
import { DropdownMenu } from './dropdown';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

import { debounce } from 'lodash';

import { merge } from '../js/util';

class CoordinateSettings extends Component {
	componentWillMount() {
		const {
			dispatch, dataset,
			stateName, axis } = this.props;

		const { attrs } = dataset[axis];

		const nullFunc = () => { };

		// function to generate functions used in buttons
		const setCoordinateFactory = (label, xAttr, yAttr) => {
			if (attrs[xAttr] && attrs[yAttr]) {
				return (xAttrs, yAttrs) => {
					const resetAttrs = {
						type: SET_VIEW_PROPS,
						stateName,
						path: dataset.path,
						viewState: {
							[stateName]: {
								xAttrs: [{
									attr: xAttr,
									jitter: false,
									logscale: false,
								}],
								yAttrs: [{
									attr: yAttr,
									jitter: false,
									logscale: false,
								}],
							},
						},
					};
					const handleClick = () => {
						dispatch(resetAttrs);
					};

					// default to previous jitter and logscale settings
					// note that this will return `undefined` for empty
					// attributes, which is equivalent to false, but
					// we set it to false anyway for type consistency
					let newXattrs = xAttrs.slice(0),
						newYattrs = yAttrs.slice(0);
					// check if xAtt is already selected,
					// don't  append if it is.
					let i = newXattrs.length;
					while (i--) {
						if (newXattrs[i].attr === xAttr) { break; }
					}
					if (i === -1) {
						const xSettings = newXattrs[length - 1];
						const xJitter = xSettings ? xSettings.jitter : false;
						const xLogscale = xSettings ? xSettings.logscale : false;
						newXattrs.push({
							attr: xAttr,
							jitter: xJitter,
							logscale: xLogscale,
						});
					}
					let j = newYattrs.length;
					while (j--) {
						if (newYattrs[j].attr === yAttr) { break; }
					}
					if (j === -1) {
						const ySettings = newYattrs[length - 1];
						const yJitter = ySettings ? ySettings.jitter : false;
						const yLogscale = ySettings ? ySettings.logscale : false;
						newYattrs.push({
							attr: yAttr,
							jitter: yJitter,
							logscale: yLogscale,
						});
					}
					let handleClickAppend;
					if (i === -1 || j === -1) {
						const newAttrs = {};
						if (i === -1) {
							newAttrs.xAttrs = newXattrs;
						}
						if (j === -1) {
							newAttrs.yAttrs = newYattrs;
						}
						const appendAttrs = {
							type: SET_VIEW_PROPS,
							stateName,
							path: dataset.path,
							viewState: { [stateName]: newAttrs },
						};
						handleClickAppend = () => { dispatch(appendAttrs); };
					}
					return (
						<ListGroupItem>
							<a onClick={handleClick}>{label}</a>
							<a onClick={handleClickAppend}><abbr title='append after current selection'><b>+</b></abbr></a>
						</ListGroupItem>
					);
				};
			} else {
				return nullFunc;
			}
		};

		const TSNE_label = (<span> tSNE1 / tSNE2 </span>);
		const PCA_label = (
			<span> <abbr title='Principle Component Analysys'>PCA</abbr> 1 / <abbr title='Principle Component Analysis'>PCA</abbr> 2 </span>
		);
		const SFDP_label = (<span> SFDP X / SFDP Y </span>);
		const Log_label = (<span> LogMean / LogCV </span>);

		const setTSNE = setCoordinateFactory(TSNE_label, '_tSNE1', '_tSNE2');
		const setPCA = setCoordinateFactory(PCA_label, '_PC1', '_PC2');
		const setSFDP = setCoordinateFactory(SFDP_label, 'SFDP_X', 'SFDP_Y');
		const setLog = setCoordinateFactory(Log_label, '_LogMean', '_LogCV');

		const quickSettings = (
			setTSNE !== nullFunc ||
			setPCA !== nullFunc ||
			setSFDP !== nullFunc ||
			setLog !== nullFunc
		) ? (
				(xAttrs, yAttrs) => {
					return (
						<ListGroup>
							<label><abbr title='Quickly set to default X and Y attributes'>X/Y Quick Settings</abbr></label>
							{setTSNE(xAttrs, yAttrs)}
							{setPCA(xAttrs, yAttrs)}
							{setSFDP(xAttrs, yAttrs)}
							{setLog(xAttrs, yAttrs)}
						</ListGroup>
					);
				}
			) : nullFunc;

		const attrSelectFactory = (attrName, attrs, idx) => {
			let newAttrs = attrs.slice(0);
			return (value) => {
				if (value) {
					let oldVal = (idx === newAttrs.length) ? newAttrs[newAttrs.length - 1] : newAttrs[idx],
						newVal = {
							attr: value,
							jitter: oldVal.jitter,
							logscale: oldVal.logscale,
						};
					newAttrs[idx] = newVal;
				} else if (idx < newAttrs.length && newAttrs.length > 1) {
					for (let i = idx; i < newAttrs.length - 1; i++) {
						newAttrs[i] = newAttrs[i + 1];
					}
					newAttrs.pop();
				}
				dispatch({
					type: SET_VIEW_PROPS,
					stateName,
					path: dataset.path,
					viewState: { [stateName]: { [attrName]: newAttrs } },
				});
			};
		};

		const attrJitterFactory = (attrName, attrs, idx) => {
			let newAttrs = attrs.slice(0),
				jitter = !newAttrs[idx].jitter;
			newAttrs[idx] = merge(newAttrs[idx], { jitter });
			const newState = {
				type: SET_VIEW_PROPS,
				stateName,
				path: dataset.path,
				viewState: { [stateName]: { [attrName]: newAttrs } },
			};
			return () => {
				dispatch(newState);
			};
		};

		const attrLogscaleFactory = (attrName, attrs, idx) => {
			let newAttrs = attrs.slice(0),
				logscale = !newAttrs[idx].logscale;
			newAttrs[idx] = merge(newAttrs[idx], { logscale });
			const newState = {
				type: SET_VIEW_PROPS,
				stateName,
				path: dataset.path,
				viewState: { [stateName]: { [attrName]: newAttrs } },
			};
			return () => {
				dispatch(newState);
			};
		};
		this.setState({
			quickSettings,
			attrSelectFactory,
			attrJitterFactory,
			attrLogscaleFactory,
		});
	}

	shouldComponentUpdate(nextProps) {
		return nextProps.xAttrs !== this.props.xAttrs ||
			nextProps.yAttrs !== this.props.yAttrs;
	}

	render() {
		const { dataset, axis,
			xAttrs, yAttrs } = this.props;

		const { allKeysNoUniques, dropdownOptions } = dataset[axis];
		const filterOptions = dropdownOptions.allNoUniques;


		const {
			quickSettings,
			attrSelectFactory,
			attrJitterFactory,
			attrLogscaleFactory,
		} = this.state;

		// filter out undefined attributes;
		let newXattrs = [];
		for (let i = 0; i < xAttrs.length; i++) {
			let attr = xAttrs[i];
			if (attr) {
				newXattrs.push(attr);
			}
		}
		// generate dropdowns for x attribute
		let i = newXattrs.length,
			attrName = 'xAttrs',
			xAttrDropdowns = new Array(i + 1);
		// dropdown for appending a new value
		xAttrDropdowns[i] = (
			<div className={'view'}>
				<div style={{ flex: 8 }}>
					<DropdownMenu
						key={i}
						value={'<select attribute>'}
						options={allKeysNoUniques}
						filterOptions={filterOptions}
						onChange={attrSelectFactory(attrName, newXattrs, i)}
					/>
				</div>
				<Button
					bsStyle={'default'}
					style={{ flex: 1 }}
					disabled>
					log
				</Button>
				<Button
					bsStyle={'default'}
					style={{ flex: 1 }}
					disabled>
					jitter
				</Button>
			</div>
		);
		// set attribute values
		while (i--) {
			const attrData = newXattrs[i],
				xAttrHC = attrSelectFactory(attrName, newXattrs, i);
			const xJitterHC = attrJitterFactory(attrName, newXattrs, i),
				xLogscaleHC = attrLogscaleFactory(attrName, newXattrs, i);
			xAttrDropdowns[i] = (
				<div className={'view'}>
					<div style={{ flex: 8 }}>
						<DropdownMenu
							key={i}
							value={attrData.attr}
							options={allKeysNoUniques}
							filterOptions={filterOptions}
							onChange={xAttrHC}
						/>
					</div>
					<Button
						bsStyle={attrData.logscale ? 'primary' : 'default'}
						style={{ flex: 1 }}
						onClick={xLogscaleHC}>
						log
						</Button>
					<Button
						bsStyle={attrData.jitter ? 'primary' : 'default'}
						style={{ flex: 1 }}
						onClick={xJitterHC}>
						jitter
						</Button>
				</div >);
		}

		let newYattrs = [];
		for (let i = 0; i < yAttrs.length; i++) {
			let attr = yAttrs[i];
			if (attr) {
				newYattrs.push(attr);
			}
		}
		i = newYattrs.length;
		attrName = 'yAttrs';
		let yAttrDropdowns = new Array(i + 1);
		yAttrDropdowns[i] = (
			<div className={'view'}>
				<div style={{ flex: 8 }}>
					<DropdownMenu
						key={i}
						value={'<select attribute>'}
						options={allKeysNoUniques}
						filterOptions={filterOptions}
						onChange={attrSelectFactory(attrName, newYattrs, i)}
					/>
				</div>
				<Button
					bsStyle={'default'}
					style={{ flex: 1 }}
					disabled>
					log
				</Button>
				<Button
					bsStyle={'default'}
					style={{ flex: 1 }}
					disabled>
					jitter
				</Button>
			</div>
		);
		while (i--) {
			const attrData = newYattrs[i],
				yAttrHC = attrSelectFactory(attrName, newYattrs, i);
			const yJitterHC = attrJitterFactory(attrName, newYattrs, i),
				yLogscaleHC = attrLogscaleFactory(attrName, newYattrs, i);
			yAttrDropdowns[i] = (
				<div className={'view'}>
					<div style={{ flex: 8 }}>
						<DropdownMenu
							key={i}
							value={attrData.attr}
							options={allKeysNoUniques}
							filterOptions={filterOptions}
							onChange={yAttrHC}
						/>
					</div>
					<Button
						bsStyle={attrData.logscale ? 'primary' : 'default'}
						style={{ flex: 1 }}
						onClick={yLogscaleHC}>
						log
					</Button>
					<Button
						bsStyle={attrData.jitter ? 'primary' : 'default'}
						style={{ flex: 1 }}
						onClick={yJitterHC}>
						jitter
					</Button>
				</div>);
		}

		return (
			<div>
				<ListGroupItem>
					{quickSettings(newXattrs, newYattrs)}
				</ListGroupItem>
				<ListGroupItem>
					<label><abbr title='Select attributes for the X axis, with optional logaritmic scaling and jittering'>X attributes</abbr></label>
					{xAttrDropdowns}
				</ListGroupItem>
				<ListGroupItem>
					<label><abbr title='Select attributes for the Y axis, with optional logaritmic scaling and jittering'>Y attributes</abbr></label>
					{yAttrDropdowns}
				</ListGroupItem>
			</div>
		);
	}
}

CoordinateSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	stateName: PropTypes.string.isRequired,
	axis: PropTypes.string.isRequired,
	xAttrs: PropTypes.array.isRequired,
	yAttrs: PropTypes.array.isRequired,
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
		if (attrs[colorAttr]) {
			return (
				<ListGroupItem>
					<label><abbr title='Select attribute for coloring the points'>Color</abbr></label>
					<DropdownMenu
						value={colorAttr}
						options={allKeysNoUniques}
						filterOptions={filterOptions}
						onChange={colorAttrHC}
					/>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={colorMode === 'Heatmap' ? 'primary' : 'default'}
								onClick={heatmapHC}>
								Heatmap
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={colorMode === 'Heatmap2' ? 'primary' : 'default'}
								onClick={heatmap2HC}>
								Heatmap2
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={colorMode === 'Categorical' ? 'primary' : 'default'}
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
			);
		} else {
			return (
				<ListGroupItem>
					<label><abbr title='Select attribute for coloring the points'>Color</abbr></label>
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
}

ColorSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	stateName: PropTypes.string.isRequired,
	axis: PropTypes.string.isRequired,
	colorAttr: PropTypes.string.isRequired,
	colorMode: PropTypes.string.isRequired,
};

class ScaleFactorSettings extends Component {
	componentWillMount() {
		const { stateName, dataset, dispatch } = this.props;

		const scaleFactorHC = (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName,
				path: dataset.path,
				viewState: { [stateName]: { scaleFactor: value } },
			});
		};

		this.setState({
			scaleFactorHC,
			scaleFactorDebounced: debounce(scaleFactorHC, this.props.time || 0),
		});
	}

	componentWillReceiveProps(nextProps) {
		const newDebounce = this.state.time !== nextProps.time;

		const scaleFactorDebounced = newDebounce ?
			debounce(this.state.scaleFactorHC, nextProps.time || 0)
			:
			this.state.scaleFactorDebounced;

		this.setState({
			scaleFactorDebounced,
		});
	}

	render() {
		return (
			<div style={{ height: '50px' }}>
				<Slider
					marks={{ 1: '0x', 50: '1x', 100: '2x' }}
					min={1}
					max={100}
					defaultValue={this.props.scaleFactor}
					onChange={this.state.scaleFactorDebounced}
					onAfterChange={this.state.scaleFactorDebounced} />
			</div>
		);
	}
}


ScaleFactorSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	stateName: PropTypes.string.isRequired,
	scaleFactor: PropTypes.number,
	time: PropTypes.number,
};
export const ScatterplotSidepanel = (props) => {
	const { dispatch, dataset, stateName, axis } = props;
	const { xAttrs, yAttrs, colorAttr, colorMode, scaleFactor } = props.viewState;

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
					xAttrs={xAttrs}
					yAttrs={yAttrs}
				/>
				<ListGroupItem>
					<label><abbr title='Change the radius of the drawn points'>Radius Scale Factor</abbr></label>
					<ScaleFactorSettings
						dispatch={dispatch}
						dataset={dataset}
						stateName={stateName}
						scaleFactor={scaleFactor}
						time={200} />
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