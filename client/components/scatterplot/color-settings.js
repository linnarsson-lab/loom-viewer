import React, { PureComponent } from 'react';
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

import { setViewProps } from '../../actions/set-viewprops';
import { SET_VIEW_PROPS } from '../../actions/actionTypes';

function nullFunc() { }

export class ColorSettings extends PureComponent {
	componentWillMount() {
		const { dispatch, dataset, axis } = this.props;

		const colorAttrHC = (value) => {
			dispatch(setViewProps(dataset, {
				type: SET_VIEW_PROPS,
				stateName: axis,
				path: dataset.path,
				viewState: { [axis]: { colorAttr: value } },
			}));
		};

		const colorSettingsFactory = (colorMode) => {
			return () => {
				dispatch({
					type: SET_VIEW_PROPS,
					stateName: axis,
					path: dataset.path,
					viewState: { [axis]: { colorMode } },
				});
			};
		};

		const heatmapHC = colorSettingsFactory('Heatmap');
		const heatmap2HC = colorSettingsFactory('Heatmap2');
		const categoricalHC = colorSettingsFactory('Categorical');

		this.setState({
			colorAttrHC,
			heatmapHC,
			heatmap2HC,
			categoricalHC,
		});
	}

	shouldComponentUpdate(nextProps) {
		const { axis } = nextProps;
		const vs = this.props.dataset.viewState[axis];
		const nvs = nextProps.dataset.viewState[axis];
		return nextProps.colorAttr !== this.props.colorAttr ||
			nextProps.colorMode !== this.props.colorMode ||
			nvs.filter !== vs.filter ||
			nvs.settings !== vs.settings ||
			nextProps.dataset[axis].attrs[nextProps.colorAttr] !== this.props.dataset[this.props.axis].attrs[this.props.colorAttr];
	}

	render() {
		const {
			dispatch,
			dataset,
			axis,
			colorAttr,
			colorMode,
			settings,
		} = this.props;

		const {
			attrs,
			allKeysNoUniques,
			dropdownOptions,
		} = dataset[axis];

		const filterOptions = dropdownOptions.allNoUniques;

		const {
			heatmapHC,
			heatmap2HC,
			categoricalHC,
		} = this.state;

		const { colorAttrHC } = this.state;

		const attrLegend = attrs[colorAttr] ? (
			<AttrLegend
				mode={colorMode}
				filterFunc={(filterVal) => {
					return () => {
						dispatch(setViewProps(dataset, {
							type: SET_VIEW_PROPS,
							path: dataset.path,
							axis,
							filterAttrName: colorAttr,
							filterVal,
						}));
					};
				}}
				filteredAttrs={dataset.viewState[axis].filter}
				attr={attrs[colorAttr]}
				settings={settings}

			/>
		) : null;

		const heatmapSettings = colorMode === 'Heatmap' || colorMode === 'Heatmap2' ? (
			<ClipDataSettings
				dispatch={dispatch}
				dataset={dataset}
				axis={axis}
				settings={settings}
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
					popoverId={'popoverId4'}
				>
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
	colorAttr: PropTypes.string.isRequired,
	colorMode: PropTypes.string.isRequired,
	settings: PropTypes.object.isRequired,
};