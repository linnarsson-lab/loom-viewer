import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	Panel,
	ListGroup,
	ListGroupItem,
	Tab,
	Tabs,
} from 'react-bootstrap';

import { CoordinateSettings } from './coordinate-settings';
import { ColorSettings } from './color-settings';
import { ScaleFactorSettings } from './scalefactor-settings';
import { popoverTest } from './popover';

import { setViewProps } from '../../actions/set-viewprops';

import { FlexboxContainer } from '../flexbox-container.js';

import {
	CollapsibleSettings,
	FilteredValues,
} from '../settings/settings';

function filteredValuesComponent(props) {
	const {
		axis,
		dataset,
		dispatch,
	} = props;

	const { filter } = props.dataset.viewState[axis];
	return filter.length ? (
		<ListGroupItem>
			<FilteredValues
				dispatch={dispatch}
				dataset={dataset}
				axis={axis}
				filtered={filter} />
		</ListGroupItem>
	) : null;
}

filteredValuesComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	filter: PropTypes.array,
};

function scaleSettingsComponent(props) {
	const {
		axis,
		dataset,
		dispatch,
	} = props;
	const { selectedPlot, plotSettings } = dataset.viewState[axis].scatterPlots;
	const { scaleFactor } = plotSettings[selectedPlot];
	return (
		<ListGroupItem>
			<CollapsibleSettings
				label={`Point size (x${(scaleFactor / 20).toFixed(1)})`}
				tooltip={'Change the radius of the drawn points'}
				tooltipId={'radiusstngs-tltp'}
				popover={popoverTest}
				popoverTitle={'Test'}
				popoverId={'popoverId5'}
				mountClosed>
				<div>
					<ScaleFactorSettings
						dispatch={dispatch}
						dataset={dataset}
						axis={axis}
						selectedPlot={selectedPlot}
						plotSettings={plotSettings}
						time={200} />
				</div>
			</CollapsibleSettings>
		</ListGroupItem>
	);
}

scaleSettingsComponent.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
};

class PlotSettingsTabContent extends Component {

	shouldComponentUpdate(nextProps) {
		// No need to touch the dom if the contents are hidden anyway
		return nextProps.selected === nextProps.selectedPlot;
	}

	render() {
		const {
			axis,
			dataset,
			dispatch,
			filteredValues,
			plot,
			plotSettings,
			selected,
			selectedPlot,
		} = this.props;
		const { scaleFactor } = plot;
		return (
			<ListGroup>
				<CoordinateSettings
					dispatch={dispatch}
					dataset={dataset}
					axis={axis}
					plotSettings={plotSettings}
					selectedPlot={selected}
				/>
				<ListGroupItem>
					<CollapsibleSettings
						label={`Point size (x${(scaleFactor / 20).toFixed(1)})`}
						tooltip={'Change the radius of the drawn points'}
						tooltipId={'radiusstngs-tltp'}
						popover={popoverTest}
						popoverTitle={'Test'}
						popoverId={`popoverId-scatterplot-scale-${selected}`}
						mountClosed>
						<div>
							<ScaleFactorSettings
								dispatch={dispatch}
								dataset={dataset}
								axis={axis}
								selectedPlot={selectedPlot}
								plotSettings={plotSettings}
								time={200} />
						</div>
					</CollapsibleSettings>
				</ListGroupItem>											<ColorSettings
					dispatch={dispatch}
					dataset={dataset}
					axis={axis}
					plotSettings={plotSettings}
					selectedPlot={selected}
				/>
				{filteredValues}
			</ListGroup>
		);
	}
}

export class ScatterPlotSidepanel extends Component {
	constructor(props) {
		super(props);
		this.selectTab = this.selectTab.bind(this);
	}

	componentWillMount() {
		const { props } = this;
		this.setState({
			filteredValues: filteredValuesComponent(props),
		});
	}

	componentWillUpdate(nextProps) {
		let {
			filteredValues,
		} = this.state;

		const {
			axis,
			dataset,
		} = nextProps;

		if (dataset.viewState[axis].filter !== this.props.dataset.viewState[axis].filter) {
			filteredValues = filteredValuesComponent(nextProps);
			this.setState({
				filteredValues,
			});
		}

	}

	selectTab(key) {
		const { dispatch, dataset, axis } = this.props;
		dispatch(setViewProps(
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

	render() {
		const {
			filteredValues,
		} = this.state;

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
			plotSettings,
		} = scatterPlots;

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
					{
						plotSettings.map((plot, selected) => {
							return (
								<Tab
									key={`${selected}${plot.x.attr}${plot.y.attr}`}
									eventKey={selected}
									title={selected === selectedPlot ? <b>{selected + 1}</b> : selected + 1}>
									<PlotSettingsTabContent
										axis={axis}
										dataset={dataset}
										dispatch={dispatch}
										filteredValues={filteredValues}
										plot={plot}
										plotSettings={plotSettings}
										selected={selected}
										selectedPlot={selectedPlot} />
								</Tab >
							);
						})
					}
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