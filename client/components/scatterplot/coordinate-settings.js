import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroup,
	ListGroupItem,
	Button,
	Glyphicon,
} from 'react-bootstrap';

import {
	CollapsibleSettings,
	DropdownMenu,
	OverlayTooltip,
} from '../settings';

import { popoverTest } from 'components/scatterplot/popover';

import { updateAndFetchGenes } from 'actions/update-and-fetch';

import {
	allMatchingPairsCaseInsensitive,
	nullFunc,
} from 'js/util';

// Factory to generate functions used in quick-set buttons
function quickSettingsFactory(props, pairsList) {
	const {
		dispatch,
		dataset,
		axis,
		plotSetting,
		selectedPlot,
	} = props;

	const {
		attrs,
	} = dataset[axis];

	const matchingPairs = allMatchingPairsCaseInsensitive(attrs, pairsList);

	let quickSettingsList = [];

	for (let i = 0; i < matchingPairs.length; i++) {
		const xAttr = matchingPairs[i][0];
		const yAttr = matchingPairs[i][1];

		let handleClick = nullFunc;
		if (plotSetting.x.attr !== xAttr || plotSetting.y.attr !== yAttr) {
			const action = {
				stateName: axis,
				path: dataset.path,
				viewState: {
					[axis]: {
						scatterPlots: {
							plotSettings: {
								[selectedPlot]:{
									x: { attr: xAttr },
									y: { attr: yAttr },
								},
							},
						},
					},
				},
			};
			handleClick = () => {
				return dispatch(updateAndFetchGenes(dataset, action));
			};
		}

		quickSettingsList.push(
			<ListGroupItem key={`${selectedPlot + 1}-set-${xAttr}_${yAttr}`}>
				<OverlayTooltip
					tooltip={`Set attributes to ${xAttr} and ${yAttr}`}
					tooltipId={`${selectedPlot + 1}-set-${xAttr}_${yAttr}-tltp`}>
					<Button
						bsStyle='link'
						onClick={handleClick}
						disabled={handleClick === nullFunc}>
						{xAttr + ' / ' + yAttr}
					</Button>
				</OverlayTooltip>
			</ListGroupItem>
		);
	}

	return quickSettingsList.length ?
		(
			<CollapsibleSettings
				label={'X/Y Quick Settings'}
				tooltip={'Quickly set X and Y attributes to one of the listed default values'}
				tooltipId={'quickstngs-tltp'}
				popover={popoverTest}
				popoverTitle={'Test'}
				popoverId={'popoverId1'}
				mountClosed >
				<ListGroup>
					{quickSettingsList}
				</ListGroup>
			</CollapsibleSettings>
		) :
		null;
}

quickSettingsFactory.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotSetting: PropTypes.object.isRequired,
	selectedPlot: PropTypes.number.isRequired,
};

const pairsList = [
	['X', 'Y'],
	['X', 'Z'],
	['Y', 'Z'],
	['_X', '_Y'],
	['_X', '_Z'],
	['_Y', '_Z'],
	['SFDP_X', 'SFDP_Y'],
	['tSNE1', 'tSNE2'],
	['tSNE1', 'tSNE3'],
	['tSNE2', 'tSNE3'],
	['tSNE_1', 'tSNE_2'],
	['tSNE_1', 'tSNE_3'],
	['tSNE_2', 'tSNE_3'],
	['_tSNE1', '_tSNE2'],
	['_tSNE1', '_tSNE3'],
	['_tSNE2', '_tSNE3'],
	['_tSNE_1', '_tSNE_2'],
	['_tSNE_1', '_tSNE_3'],
	['_tSNE_2', '_tSNE_3'],
	['PCA1', 'PCA2'],
	['PCA1', 'PCA3'],
	['PCA1', 'PCA4'],
	['PCA2', 'PCA3'],
	['PCA2', 'PCA4'],
	['PCA3', 'PCA4'],
	['PCA_1', 'PCA_2'],
	['PCA_1', 'PCA_3'],
	['PCA_1', 'PCA_4'],
	['PCA_2', 'PCA_3'],
	['PCA_2', 'PCA_4'],
	['PCA_3', 'PCA_4'],
	['_PCA1', '_PCA2'],
	['_PCA1', '_PCA3'],
	['_PCA1', '_PCA4'],
	['_PCA2', '_PCA3'],
	['_PCA2', '_PCA4'],
	['_PCA3', '_PCA4'],
	['_PCA_1', '_PCA_2'],
	['_PCA_1', '_PCA_3'],
	['_PCA_1', '_PCA_4'],
	['_PCA_2', '_PCA_3'],
	['_PCA_2', '_PCA_4'],
	['_PC_3', '_PC_4'],
	['PC1', 'PC2'],
	['PC1', 'PC3'],
	['PC1', 'PC4'],
	['PC2', 'PC3'],
	['PC2', 'PC4'],
	['PC3', 'PC4'],
	['PC_1', 'PC_2'],
	['PC_1', 'PC_3'],
	['PC_1', 'PC_4'],
	['PC_2', 'PC_3'],
	['PC_2', 'PC_4'],
	['PC_3', 'PC_4'],
	['_PC1', '_PC2'],
	['_PC1', '_PC3'],
	['_PC1', '_PC4'],
	['_PC2', '_PC3'],
	['_PC2', '_PC4'],
	['_PC3', '_PC4'],
	['_PC_1', '_PC_2'],
	['_PC_1', '_PC_3'],
	['_PC_1', '_PC_4'],
	['_PC_2', '_PC_3'],
	['_PC_2', '_PC_4'],
	['_PC_3', '_PC_4'],
	['LogMean', 'LogCV'],
	['Log_Mean', 'Log_CV'],
	['_LogMean', '_LogCV'],
	['_Log_Mean', '_Log_CV'],
];

function attrSettingHandleChangeFactory(props, attrAxis, key) {
	const {
		dispatch,
		dataset,
		axis,
		plotSetting,
		selectedPlot,
	} = props;

	const action = {
		stateName: axis,
		path: dataset.path,
		viewState: {
			[axis]: {
				scatterPlots: {
					plotSettings: {
						[selectedPlot]: {
							[attrAxis]: {
								[key]: !plotSetting[attrAxis][key],
							},
						},
					},
				},
			},
		},
	};

	return () => {
		return dispatch(updateAndFetchGenes(dataset, action));
	};
}

function selectAttrFactory(props, attrAxis){
	const {
		dispatch,
		dataset,
		axis,
		selectedPlot,
	} = props;
	return (attr) => {
		const action = {
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: {
							[selectedPlot]: {
								[attrAxis]: {
									attr,
								},
							},
						},
					},
				},
			},
		};
		return dispatch(updateAndFetchGenes(dataset, action));
	};
}

function attrSettingsFactory(props, attrAxis) {
	const {
		dataset,
		axis,
		plotSetting,
		selectedPlot,
	} = props;

	const attrData = plotSetting[attrAxis];

	const {
		dropdownOptions,
	} = dataset[axis];

	const attrHC = selectAttrFactory(props, attrAxis),
		logScaleHC = attrSettingHandleChangeFactory(props, attrAxis, 'logScale'),
		jitterHC = attrSettingHandleChangeFactory(props, attrAxis, 'jitter');

	return (
		<div className={'view'} key={`${attrAxis}-${selectedPlot + 1}-attr`}>
			<OverlayTooltip
				tooltip={`select attribute for ${attrAxis}-axis`}
				tooltipId={`${attrAxis}-${selectedPlot + 1}-attr-tltp`}>
				<div style={{ flex: 8 }}>
					<DropdownMenu
						key={selectedPlot}
						value={attrData.attr}
						options={dropdownOptions.allNoUniques}
						onChange={attrHC}
					/>
				</div>
			</OverlayTooltip>
			<OverlayTooltip
				tooltip={`toggle log2-scaling for ${attrAxis}-axis`}
				tooltipId={`${attrAxis}-${selectedPlot + 1}-log-tltp`}>
				<Button
					bsStyle='link'
					bsSize='small'
					style={{ flex: 1 }}
					onClick={logScaleHC}>
					<Glyphicon
						glyph={attrData.logScale ?
							'check' :
							'unchecked'}
					/> log
				</Button>
			</OverlayTooltip>
			<OverlayTooltip
				tooltip={`toggle jitter for ${attrAxis}-axis`}
				tooltipId={`${attrAxis}-${selectedPlot + 1}-jitter-tltp`}>
				<Button
					bsStyle='link'
					bsSize='small'
					style={{ flex: 1 }}
					onClick={jitterHC}>
					<Glyphicon glyph={attrData.jitter ?
						'check' :
						'unchecked'}
					/> jitter
				</Button>
			</OverlayTooltip>
		</div >
	);
}

attrSettingsFactory.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotSetting: PropTypes.object.isRequired,
	selectedPlot: PropTypes.number.isRequired,
};


export class CoordinateSettings extends PureComponent {

	render() {
		const { props } = this;
		const quickSettings = quickSettingsFactory(props, pairsList);
		const xAttrSettings = attrSettingsFactory(props, 'x');
		const yAttrSettings = attrSettingsFactory(props, 'y');
		return (
			<React.Fragment>
				<ListGroupItem>
					<CollapsibleSettings
						label={'X/Y attribute'}
						tooltip={'Select attribute for the X- and Y-axis, with optional logarithmic scaling and jittering'}
						tooltipId={'xyAttrs-tltp'}
						popover={popoverTest}
						popoverTitle={'Test'}
						popoverId={`popover-xy-${props.selectedPlot}`}
					>
						<div>
							{xAttrSettings}
							{yAttrSettings}
							{quickSettings}
						</div>
					</CollapsibleSettings>
				</ListGroupItem>
			</React.Fragment>
		);
	}
}

CoordinateSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plotSetting: PropTypes.object.isRequired,
	selectedPlot: PropTypes.number.isRequired,
};