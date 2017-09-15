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
		plotSettings,
		selectedPlot,
	} = props;

	let newPlotSettings = plotSettings.slice(0);
	return (value) => {
		newPlotSettings[selectedPlot] = merge(plotSettings[selectedPlot], { colorAttr: value });
		dispatch(setViewProps(dataset, {
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: newPlotSettings,
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
	selectedPlot: PropTypes.number.isRequired,
	plotSettings: PropTypes.array.isRequired,
};

function colorSettingsFactory(props, colorMode) {
	const {
		dispatch,
		dataset,
		axis,
		plotSettings,
		selectedPlot,
	} = props;
	let newPlotSettings = plotSettings.slice(0);
	return () => {
		newPlotSettings[selectedPlot] = merge(plotSettings[selectedPlot], { colorMode });
		dispatch(setViewProps(dataset, {
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: newPlotSettings,
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
	selectedPlot: PropTypes.number.isRequired,
	plotSettings: PropTypes.array.isRequired,
};

// to ensure that selected buttons don't dispatch anything.
function nullFunc() { }

export class ColorSettings extends Component {
	shouldComponentUpdate(nextProps) {
		const { props } = this;
		return nextProps.plotSettings !== props.plotSettings;
	}

	render() {
		const { props } = this;

		const {
			dispatch,
			dataset,
			axis,
			settings,
			plotSettings,
			selectedPlot,
		} = props;

		const {
			colorAttr,
			colorMode,
		} = plotSettings[selectedPlot];

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
				plotSettings={plotSettings}
				selectedPlot={selectedPlot}
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
	selectedPlot: PropTypes.number.isRequired,
	plotSettings: PropTypes.array.isRequired,
};