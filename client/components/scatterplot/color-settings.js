import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroupItem,
	Button,
	ButtonGroup,
} from 'react-bootstrap';

import { popoverTest } from 'components/scatterplot/popover';

import {
	AttrLegend,
	ClipDataSettings,
	CollapsibleSettings,
	DropdownMenu,
} from 'components/settings/settings';

import { setViewProps } from 'actions/set-viewprops';

// to ensure that selected buttons don't dispatch anything.
import { nullFunc } from 'js/util';


function colorAttrFactory(props) {
	const {
		dispatch,
		dataset,
		axis,
		plotNr,
	} = props;

	return (value) => {
		let action = {
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: {
							[plotNr]: { colorAttr: value },
						},
					},
				},
			},
		};
		dispatch(setViewProps(dataset, action));
	};
}

colorAttrFactory.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotNr: PropTypes.number.isRequired,
};

function colorSettingsFactory(props, colorMode) {
	const {
		dispatch,
		dataset,
		axis,
		plotNr,
	} = props;
	return () => {
		const action = {
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: {
							[plotNr]: { colorMode },
						},
					},
				},
			},
		};
		dispatch(setViewProps(dataset, action));
	};
}

colorSettingsFactory.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotNr: PropTypes.number.isRequired,
};

export class ColorSettings extends Component {
	shouldComponentUpdate(nextProps) {
		const {
			axis,
			dataset,
			plotSetting,
		} = this.props;
		const nDataset = nextProps.dataset,
			nAxis = nextProps.axis,
			nSettings = nextProps.plotSetting;

		// Only update if the relevant data has changed
		return(
			plotSetting.colorAttr !== nSettings.colorAttr ||
			plotSetting.colorMode !== nSettings.colorMode ||
			plotSetting.logScale !== nSettings.logScale ||
			plotSetting.clip !== nSettings.clip ||
			plotSetting.lowerBound !== nSettings.lowerBound ||
			plotSetting.upperBound !== nSettings.upperBound ||
			dataset.viewState[axis].filter !== nDataset.viewState[nAxis].filter
		);
	}

	render() {
		const { props } = this;

		const {
			dispatch,
			dataset,
			axis,
			settings,
			plotNr,
			plotSetting,
		} = props;

		const {
			colorAttr,
			colorMode,
		} = plotSetting;

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
				plotSetting={plotSetting}
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
	plotSetting: PropTypes.object.isRequired,
	plotNr: PropTypes.number.isRequired,
};