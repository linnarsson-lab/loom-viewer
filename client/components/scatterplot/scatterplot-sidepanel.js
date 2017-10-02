import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroup,
	ListGroupItem,
	Tab,
	Tabs,
} from 'react-bootstrap';

import { CoordinateSettings } from 'components/scatterplot/coordinate-settings';
import { ColorSettings } from 'components/scatterplot/color-settings';
import { ScaleFactorSettings } from 'components/scatterplot/scalefactor-settings';
import { popoverTest } from 'components/scatterplot/popover';

import { updateAndFetchGenes } from 'actions/update-and-fetch';

import { FlexboxContainer } from 'components/flexbox-container.js';

import {
	CollapsibleSettings,
	FilteredValues,
} from 'components/settings/settings';

class PlotSettingsTabContent extends Component {

	shouldComponentUpdate(nextProps) {
		// No need to touch the dom if the contents are hidden anyway
		return nextProps.plotNr === nextProps.selectedPlot;
	}

	render() {
		const {
			axis,
			dataset,
			dispatch,
			plotSetting,
			plotNr,
		} = this.props;
		const { scaleFactor } = plotSetting;

		const { filter } = this.props.dataset.viewState[axis];
		const filteredValues = 	filter.length ?
			(
				<ListGroupItem>
					<FilteredValues
						dispatch={dispatch}
						dataset={dataset}
						axis={axis}
						filtered={filter} />
				</ListGroupItem>
			) :
			null;

		return (
			<ListGroup>
				<CoordinateSettings
					dispatch={dispatch}
					dataset={dataset}
					axis={axis}
					plotSetting={plotSetting}
					selectedPlot={plotNr}
				/>
				<ListGroupItem>
					<CollapsibleSettings
						label={`Point size (x${(scaleFactor / 20).toFixed(1)})`}
						tooltip={'Change the radius of the drawn points'}
						tooltipId={'radiusstngs-tltp'}
						popover={popoverTest}
						popoverTitle={'Test'}
						popoverId={`popoverId-scatterplot-scale-${plotNr}`}
						mountClosed>
						<div>
							<ScaleFactorSettings
								dispatch={dispatch}
								dataset={dataset}
								axis={axis}
								plotNr={plotNr}
								scaleFactor={scaleFactor}
								time={200} />
						</div>
					</CollapsibleSettings>
				</ListGroupItem>
				<ColorSettings
					dispatch={dispatch}
					dataset={dataset}
					axis={axis}
					plotSetting={plotSetting}
					plotNr={plotNr}
				/>
				{filteredValues}
			</ListGroup>
		);
	}
}

PlotSettingsTabContent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	filteredValues: PropTypes.array.isRequired,
	plotSetting: PropTypes.object.isRequired,
	plotNr: PropTypes.number.isRequired,
	selectedPlot: PropTypes.number.isRequired,
};

export class ScatterPlotSidepanel extends Component {
	constructor(...args) {
		super(...args);
		this.selectTab = this.selectTab.bind(this);
	}

	selectTab(key) {
		const {
			dispatch,
			dataset,
			axis,
		} = this.props;

		if (key === '+') {
			// new tab
		} else {
			// switch to existing tab
			dispatch(updateAndFetchGenes(
				dataset,
				{
					stateName: axis,
					path: dataset.path,
					viewState: {
						[axis]: {
							scatterPlots: {
								selectedPlot: key,
							},
						},
					},
				}
			));
		}
	}

	render() {
		const {
			dispatch,
			dataset,
			axis,
			className,
			style,
		} = this.props;

		const {
			scatterPlots,
		} = this.props.viewState;

		const {
			selectedPlot,
			totalPlots,
			plotSettings,
		} = scatterPlots;

		const newPlotTab = plotSettings.length < 4 ?
			(
				<Tab key={'+'} title={'+'} />
			) :
			null;

		const settingsTabs = [];
		for (let i = 0; i < totalPlots; i++) {
			let plotSetting = plotSettings[i];
			settingsTabs.push(
				<Tab
					key={`${i}${plotSetting.x.attr}${plotSetting.y.attr}`}
					eventKey={i}
					title={i === selectedPlot ?
						<b>{i + 1}</b> :
						i + 1
					} >
					<PlotSettingsTabContent
						axis={axis}
						dataset={dataset}
						dispatch={dispatch}
						plotSetting={plotSetting}
						plotNr={i}
						selectedPlot={selectedPlot} />
				</Tab >
			);
		}
		return (
			<FlexboxContainer
				className={className}
				style={style} >
				<Tabs
					className='sidepanel'
					key={`${axis}-settings`}
					animation={false}
					activeKey={selectedPlot}
					onSelect={this.selectTab}
					id={`scatterPlot-${axis}`}>
					<Tab title={'Settings'} disabled />
					{settingsTabs}
					{newPlotTab}
				</Tabs>
			</FlexboxContainer>
		);
	}
}

ScatterPlotSidepanel.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	viewState: PropTypes.object.isRequired,
	className: PropTypes.string,
	style: PropTypes.object,
};