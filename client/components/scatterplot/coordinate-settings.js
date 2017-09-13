import React, { Component } from 'react';
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
} from '../settings/settings';

import { popoverTest } from './popover';

import { merge } from '../../js/util';

import { setViewProps } from '../../actions/set-viewprops';

// Factory to generate functions used in quick-set buttons
function quickSettingsFactory(props, settingsList) {
	const {
		dispatch,
		dataset,
		axis,
		plots,
		plotNr,
	} = props;

	const {
		attrs,
	} = dataset[axis];

	const plot = plots[plotNr];

	let quickSettingsList = [];

	for (let i = 0; i < settingsList.length; i++) {
		const {
			label,
			xAttr,
			yAttr,
		} = settingsList[i];
		if (attrs[xAttr] && attrs[yAttr]) {

			let handleClick = nullFunc;
			if (plot.x.attr !== xAttr || plot.y.attr !== yAttr) {
				const newPlots = plots.slice(0);
				newPlots[plotNr] = merge(plot, {
					x: { attr: xAttr },
					y: { attr: yAttr },
				});
				handleClick = () => {
					return dispatch(setViewProps(dataset, {
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

			quickSettingsList.push(
				<ListGroupItem key={`${plotNr + 1}-set-${xAttr}_${yAttr}`}>
					<OverlayTooltip
						tooltip={`Set attributes to ${xAttr} and ${yAttr}`}
						tooltipId={`${plotNr + 1}-set-${xAttr}_${yAttr}-tltp`}>
						<Button
							bsStyle='link'
							onClick={handleClick}
							disabled={handleClick === nullFunc}>
							{label}
						</Button>
					</OverlayTooltip>
				</ListGroupItem>
			);
		}
	}

	return quickSettingsList.length ? (
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
	) : null;
}

quickSettingsFactory.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plots: PropTypes.array.isRequired,
	plotNr: PropTypes.number.isRequired,
};

function nullFunc() { }

const settingsList = [
	{
		label: 'default X / Y',
		xAttr: '_X',
		yAttr: '_Y',
	},
	{
		label: 'tSNE1 / tSNE2',
		xAttr: '_tSNE1',
		yAttr: '_tSNE2',
	},
	{
		label: 'PCA 1 / PCA 2',
		xAttr: '_PC1',
		yAttr: '_PC2',
	},
	{
		label: 'SFDP X / SFDP Y',
		xAttr: 'SFDP_X',
		yAttr: 'SFDP_Y',
	},
	{
		label: 'Logmean / LogCV',
		xAttr: '_LogMean',
		yAttr: '_LogCV',
	},
];

function attrSettingHandleChangeFactory(props, attrAxis, key) {
	const {
		dispatch,
		dataset,
		axis,
		plots,
		plotNr,
	} = props;

	const value = !plots[plotNr][attrAxis][key];
	const newPlots = plots.slice(0);

	return () => {
		newPlots[plotNr] = merge(newPlots[plotNr], {
			[attrAxis]: { [key]: value },
		});
		return dispatch(setViewProps(dataset, {
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

function attrSettingsFactory(props, attrAxis) {
	const {
		dataset,
		axis,
		plots,
		plotNr,
	} = props;

	const attrData = plots[plotNr][attrAxis];

	const { allKeysNoUniques, dropdownOptions } = dataset[axis];
	const filterOptions = dropdownOptions.allNoUniques;

	const attrHC = attrSettingHandleChangeFactory(props, attrAxis, 'attr'),
		logScaleHC = attrSettingHandleChangeFactory(props, attrAxis, 'logScale'),
		jitterHC = attrSettingHandleChangeFactory(props, attrAxis, 'jitter');

	return (
		<div className={'view'} key={`${attrAxis}-${plotNr + 1}-attr`}>
			<OverlayTooltip
				tooltip={`select attribute for ${attrAxis}-axis`}
				tooltipId={`${attrAxis}-${plotNr + 1}-attr-tltp`}>
				<div style={{ flex: 8 }}>
					<DropdownMenu
						key={plotNr}
						value={attrData.attr}
						options={allKeysNoUniques}
						filterOptions={filterOptions}
						onChange={attrHC}
					/>
				</div>
			</OverlayTooltip>
			<OverlayTooltip
				tooltip={`toggle log2-scaling for ${attrAxis}-axis`}
				tooltipId={`${attrAxis}-${plotNr + 1}-log-tltp`}>
				<Button
					bsStyle='link'
					bsSize='small'
					style={{ flex: 1 }}
					onClick={logScaleHC}>
					<Glyphicon glyph={attrData.logScale ? 'check' : 'unchecked'} /> log
				</Button>
			</OverlayTooltip>
			<OverlayTooltip
				tooltip={`toggle jitter for ${attrAxis}-axis`}
				tooltipId={`${attrAxis}-${plotNr + 1}-jitter-tltp`}>
				<Button
					bsStyle='link'
					bsSize='small'
					style={{ flex: 1 }}
					onClick={jitterHC}>
					<Glyphicon glyph={attrData.jitter ? 'check' : 'unchecked'} /> jitter
				</Button>
			</OverlayTooltip>
		</div >
	);
}

attrSettingsFactory.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plots: PropTypes.array.isRequired,
	plotNr: PropTypes.number.isRequired,
};


export class CoordinateSettings extends Component {

	shouldComponentUpdate(nextProps) {
		const { props } = this;
		return nextProps.plots !== props.plots;
	}

	render() {
		const { props } = this;
		const quickSettings = quickSettingsFactory(props, settingsList);
		const xAttrSettings = attrSettingsFactory(props, 'x');
		const yAttrSettings = attrSettingsFactory(props, 'y');
		return (
			<div>
				<ListGroupItem>
					{quickSettings}
				</ListGroupItem>
				<ListGroupItem>
					<CollapsibleSettings
						label={'X/Y attribute'}
						tooltip={'Select attribute for the X- and Y-axis, with optional logarithmic scaling and jittering'}
						tooltipId={'xyAttrs-tltp'}
						popover={popoverTest}
						popoverTitle={'Test'}
						popoverId={`popover-xy-${props.plotNr}`}
					>
						<div>
							{xAttrSettings}
							{yAttrSettings}
						</div>
					</CollapsibleSettings>
				</ListGroupItem>
			</div>
		);
	}
}

CoordinateSettings.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	plots: PropTypes.array.isRequired,
	plotNr: PropTypes.number.isRequired,
};