import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroupItem,
	Button,
	ButtonGroup,
} from 'react-bootstrap';

import { Canvas } from 'components/canvas';

import { popoverTest } from 'components/scatterplot/popover';

import {
	AttrLegend,
	ClipDataSettings,
	CollapsibleSettings,
	DropdownMenu,
} from 'components/settings';

import { updateAndFetchGenes } from 'actions/update-and-fetch';

import {
	// To ensure that selected buttons don't dispatch anything.
	nullFunc,
} from 'js/util';

import {
	// To generate gradients for buttons
	getPalette,
} from 'js/colors';

function palettePainter(palette){
	return (context) => {
		const {
			width,
			height,
		} = context;
		const l = palette.length;
		const factor = width / l;
		for(let i = 0; i < l; i++){
			const x0 = i * factor | 0;
			const x1 = (i+1) * factor | 0;
			context.fillStyle = palette[i];
			context.fillRect(x0, 0, x1-x0, height);
		}
		return false;
	};
}

const categoriesPainter = palettePainter(getPalette('Categorical'));
const heatmapPainter = palettePainter(getPalette('Heatmap'));

function colorModeButton(mode, dataset, dispatch, colorMode, axis, path, plotNr, selectedPlot){
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

	const buttonPainter = (mode === 'Categorical' || mode === 'Stacked') ?
		categoriesPainter :
		heatmapPainter;

	return (
		<ButtonGroup key={`${plotNr}-${mode}`}>
			<Button
				bsStyle={selected ?
					'primary' :
					'default'}
				onClick={onClick}>
				<Canvas
					paint={buttonPainter}
					height={30}
					watchedVal={plotNr === selectedPlot} />
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
			selectedPlot,
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
			return colorModeButton(mode, dataset, dispatch, colorMode, axis, path, plotNr, selectedPlot);
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
							options={dropdownOptions.allNoUniques}
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
	selectedPlot: PropTypes.number.isRequired,
};