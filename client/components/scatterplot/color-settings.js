import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroupItem,
	Button,
	ButtonGroup,
} from 'react-bootstrap';

import { popoverTest } from './popover';

import {
	AttrLegend,
	ClipDataSettings,
	CollapsibleSettings,
	DropdownMenu,
} from '../settings/settings';

import { merge } from '../../js/util';

import { setViewProps } from '../../actions/set-viewprops';

function colorAttrFactory(props) {
	const {
		dispatch,
		dataset,
		axis,
		plots,
		plotNr,
	} = props;

	let newPlots = plots.slice(0);
	return (value) => {
		newPlots[plotNr] = merge(plots[plotNr], { colorAttr: value });
		dispatch(setViewProps(dataset, {
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plots: newPlots,
					},
				},
			},
		}));
	};
}

colorAttrFactory.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotNr: PropTypes.number.isRequired,
	plots: PropTypes.array.isRequired,
};

function colorSettingsFactory(props, colorMode) {
	const {
		dispatch,
		dataset,
		axis,
		plots,
		plotNr,
	} = props;
	let newPlots = plots.slice(0);
	return () => {
		newPlots[plotNr] = merge(plots[plotNr], { colorMode });
		dispatch(setViewProps(dataset, {
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plots: newPlots,
					},
				},
			},
		}));
	};
}

colorSettingsFactory.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotNr: PropTypes.number.isRequired,
	plots: PropTypes.array.isRequired,
};

// to ensure that selected buttons don't dispatch anything.
function nullFunc() { }

export class ColorSettings extends Component {
	shouldComponentUpdate(nextProps) {
		const { props } = this;
		return nextProps.plots !== props.plots;
	}

	render() {
		const { props } = this;

		const {
			dispatch,
			dataset,
			axis,
			settings,
			plots,
			plotNr,
		} = props;

		const {
			colorAttr,
			colorMode,
		} = plots[plotNr];

		const {
			attrs,
			allKeysNoUniques,
			dropdownOptions,
		} = dataset[axis];

		const filterOptions = dropdownOptions.allNoUniques;

		const colorAttrHC = colorAttrFactory(props),
			heatmapHC = colorSettingsFactory(props, 'Heatmap'),
			heatmap2HC = colorSettingsFactory(props, 'Heatmap2'),
			categoricalHC = colorSettingsFactory(props, 'Categorical');

		let attrLegend;
		if (attrs[colorAttr]) {
			const filterFunc = (filterVal) => {
				return () => {
					dispatch(setViewProps(dataset, {
						path: dataset.path,
						axis,
						filterAttrName: colorAttr,
						filterVal,
					}));
				};
			};
			attrLegend = (
				<AttrLegend
					mode={colorMode}
					filterFunc={filterFunc}
					filteredAttrs={dataset.viewState[axis].filter}
					attr={attrs[colorAttr]}
					settings={settings}
				/>
			);
		}

		const heatmapSettings = colorMode === 'Heatmap' || colorMode === 'Heatmap2' ? (
			<ClipDataSettings
				dispatch={dispatch}
				dataset={dataset}
				axis={axis}
				plots={plots}
				plotNr={plotNr}
				time={200} />
		) : null;

		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Color'}
					tooltip={'Select attribute for coloring the points'}
					tooltipId={'colorsttngs-tltp'}
					popover={popoverTest}
					popoverTitle={'Test'}
					popoverId={'popoverId4'} >
					<div>
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
									onClick={colorMode === 'Heatmap' ? nullFunc : heatmapHC}>
									Heatmap
								</Button>
							</ButtonGroup>
							<ButtonGroup>
								<Button
									bsStyle={colorMode === 'Heatmap2' ? 'primary' : 'default'}
									onClick={colorMode === 'Heatmap2' ? nullFunc : heatmap2HC}>
									Heatmap2
								</Button>
							</ButtonGroup>
							<ButtonGroup>
								<Button
									bsStyle={colorMode === 'Categorical' ? 'primary' : 'default'}
									onClick={colorMode === 'Categorical' ? nullFunc : categoricalHC}>
									Categorical
								</Button>
							</ButtonGroup>
						</ButtonGroup>
						{heatmapSettings}
					</div>
				</CollapsibleSettings>
				{attrLegend}
			</ListGroupItem>
		);
	}
}

ColorSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotNr: PropTypes.number.isRequired,
	plots: PropTypes.array.isRequired,
};