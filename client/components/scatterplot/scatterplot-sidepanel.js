import React, { PureComponent } from 'react';
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

import { UPDATE_VIEWSTATE } from 'actions/action-types';

import { FlexboxContainer } from 'components/flexbox-container.js';

import {
	CollapsibleSettings,
	FilteredValues,
} from 'components/settings';

class PlotSettingsTabContent extends PureComponent {

	render() {
		const {
			axis,
			dataset,
			dispatch,
			plotSetting,
			plotNr,
			selectedPlot,
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
								scaleFactor={scaleFactor} />
						</div>
					</CollapsibleSettings>
				</ListGroupItem>
				<ColorSettings
					dispatch={dispatch}
					dataset={dataset}
					axis={axis}
					plotSetting={plotSetting}
					plotNr={plotNr}
					selectedPlot={selectedPlot}
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

export class ScatterPlotSidepanel extends PureComponent {
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

		let {
			plotSettings,
			totalPlots,
			selectedPlot,
		} = dataset.viewState[axis].scatterPlots;

		let newScatterPlots = {};
		switch(key){
			case '+':
				// new plot, if less than four plots
				if (totalPlots < 4){
					// copy the settings of the currently selected plot
					newScatterPlots.plotSettings =  {
						[totalPlots]: plotSettings[selectedPlot],
					};
					// select new plot
					newScatterPlots.selectedPlot = totalPlots;
					// increase total plots
					newScatterPlots.totalPlots = totalPlots+1;
				}
				break;
			case '-':
				// remove plot if more than one plot
				if (totalPlots > 1){
					newScatterPlots.totalPlots = totalPlots-1;
					// if removed plot was selected, select previous plot
					newScatterPlots.selectedPlot = (selectedPlot > totalPlots-2) ?
						totalPlots-2:
						selectedPlot;
				}
				break;
			default:
				// switch to existing plot
				newScatterPlots.selectedPlot = key;
		}

		// the base action
		let action = {
			type: UPDATE_VIEWSTATE,
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: newScatterPlots,
				},
			},
		};
		dispatch(action);
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

		let settingsTabs = [(
			<Tab
				key={'-'}
				eventKey={'-'}
				title={'-'}
				disabled={totalPlots < 2} />
		)];

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

		settingsTabs.push(
			<Tab
				key={'+'}
				title={'+'}
				eventKey={'+'}
				disabled={totalPlots >= 4} />
		);
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
					{settingsTabs}
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