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

import { updateAndFetchGenes } from 'actions/update-and-fetch';

// to ensure that selected buttons don't dispatch anything.
import { nullFunc } from 'js/util';

function colorModeButton(mode, dataset, dispatch, colorMode, axis, path, plotNr){
	const selected = mode === colorMode;
	const onClick = selected ?
		nullFunc :
		(
			() => {
				const action = {
					stateName: axis,
					path,
					viewState: {
						[axis]: {
							scatterPlots: {
								plotSettings: {
									[plotNr]: {
										colorMode: mode,
									},
								},
							},
						},
					},
				};
				dispatch(updateAndFetchGenes(dataset, action));
			}
		);

	return (
		<ButtonGroup key={mode}>
			<Button
				bsStyle={selected ?
					'primary' :
					'default'}
				onClick={onClick}>
				{mode}
			</Button>
		</ButtonGroup>
	);
}

export class ColorSettings extends Component {
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
			path,
		} = dataset;
		const {
			attrs,
			allKeysNoUniques,
			dropdownOptions,
		} = dataset[axis];

		const filterOptions = dropdownOptions.allNoUniques;

		const colorAttrHC = (newAttr) => {
			const action = {
				stateName: axis,
				path,
				viewState: {
					[axis]: {
						scatterPlots: {
							plotSettings: {
								[plotNr]: {
									colorAttr: newAttr,
								},
							},
						},
					},
				},
			};
			dispatch(updateAndFetchGenes(dataset, action));
		};

		const modeButtons = ['Heatmap', 'Categorical'].map((mode) => {
			return colorModeButton(mode, dataset, dispatch, colorMode, axis, path, plotNr);
		});

		let attrLegend;
		if (attrs[colorAttr]) {
			const filterFunc = (filterVal) => {
				return () => {
					dispatch(updateAndFetchGenes(dataset, {
						path,
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

		const heatmapSettings = colorMode !== 'Categorical' ?
			(
				<ClipDataSettings
					dispatch={dispatch}
					dataset={dataset}
					axis={axis}
					plotSetting={plotSetting}
					plotNr={plotNr}
					time={200} />
			) :
			null;

		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Attribute Legend'}
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
							{modeButtons}
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