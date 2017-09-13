import React, { PureComponent } from 'react';
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
	const { scaleFactor } = dataset.viewState[axis].settings;
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
						scaleFactor={scaleFactor}
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

export class ScatterPlotSidepanel extends PureComponent {
	constructor(props) {
		super(props);
		this.selectTab = this.selectTab.bind(this);
	}

	componentWillMount() {
		const { props } = this;
		this.setState({
			filteredValues: filteredValuesComponent(props),
			scaleSettings: scaleSettingsComponent(props),
		});
	}

	componentWillUpdate(nextProps) {
		let {
			filteredValues,
			scaleSettings,
		} = this.state;

		const {
			axis,
			dataset,
		} = nextProps;

		let newState = false;
		if (dataset.viewState[axis].filter !== this.props.dataset.viewState[axis].filter) {
			filteredValues = filteredValuesComponent(nextProps);
			newState = true;
		}

		if (dataset.viewState[axis].settings.scaleFactor !== this.props.dataset.viewState[axis].settings.scaleFactor) {
			scaleSettings = scaleSettingsComponent(nextProps);
			newState = true;
		}

		if (newState) {
			this.setState({
				filteredValues,
				scaleSettings,
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
							selected: key,
						},
					},
				},
			}
		));
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
			selected,
			plots,
		} = scatterPlots;

		const {
			filteredValues,
			scaleSettings,
		} = this.state;

		return (
			<FlexboxContainer
				className={className}
				style={style} >
				<Panel
					className='sidepanel'
					key={`${axis}-settings`}
					header='Settings'
					bsStyle='default'>
					<Tabs
						animation={false}
						activeKey={selected}
						onSelect={this.selectTab}
						id={`scatterPlot-${axis}`}>
						{
							plots.map((plot, plotNr) => {
								return (
									<Tab
										key={`${plotNr}${plot.x.attr}${plot.y.attr}`}
										eventKey={plotNr}
										title={plotNr === selected ? <b>{plotNr+1}</b> : plotNr + 1}>
										<ListGroup fill>
											<CoordinateSettings
												dispatch={dispatch}
												dataset={dataset}
												axis={axis}
												plots={plots}
												plotNr={plotNr}
											/>
											{scaleSettings}
											<ColorSettings
												dispatch={dispatch}
												dataset={dataset}
												axis={axis}
												plots={plots}
												plotNr={plotNr}
											/>
											{filteredValues}
										</ListGroup>
									</Tab >
								);
							})
						}
					</Tabs>
				</Panel >
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