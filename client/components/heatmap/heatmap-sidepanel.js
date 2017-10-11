import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	Panel,
	ListGroup,
	ListGroupItem,
} from 'react-bootstrap';

import { FlexboxContainer } from 'components/flexbox-container.js';

import {
	AttrLegend,
	ClipDataSettings,
	CollapsibleSettings,
	DropdownMenu,
	// PrintSettings,
	boxLegend,
} from 'components/settings';

import { updateAndFetchGenes } from 'actions/update-and-fetch';
import { UPDATE_VIEWSTATE } from 'actions/action-types';

function handleChangeFactory(that, axis, field){
	return (value) => {
		const {
			dataset,
			dispatch,
		} = that.props;
		const action = {
			stateName: axis,
			path: dataset.path,
			viewState: {
				[axis]: {
					scatterPlots: {
						plotSettings: {
							0: {
								[field]: value,
							},
						},
					},
				},
			},
		};
		dispatch(updateAndFetchGenes(dataset, action));
	};
}

const modeNames = [
	'Text',
	'Bars',
	'Box',
	'Categorical',
	'Stacked',
	'Heatmap',
	'Flame',
	'Icicle',
];

export class HeatmapSidepanel extends PureComponent {
	render() {
		const {
			dispatch,
			dataset,
			className,
			style,
		} = this.props;

		const {
			col,
			row,
			path,
			viewState,
		} = dataset;

		const colPlotSetting = viewState.col.scatterPlots.plotSettings[0];
		const rowPlotSetting = viewState.row.scatterPlots.plotSettings[0];

		const colAttrHC = handleChangeFactory(this, 'col', 'colorAttr');
		const colModeHC = handleChangeFactory(this, 'col', 'colorMode');
		const rowAttrHC = handleChangeFactory(this, 'row', 'colorAttr');
		const rowModeHC = handleChangeFactory(this, 'row', 'colorMode');

		let colGradientSettings,
			colLegend;
		if (colPlotSetting.colorAttr) {
			switch (colPlotSetting.colorMode) {
				case 'Heatmap':
				case 'Flame':
				case 'Icicle':
					colGradientSettings = (
						<ClipDataSettings
							dispatch={dispatch}
							dataset={dataset}
							axis={'col'}
							plotSetting={colPlotSetting}
							plotNr={0}
							time={200} />
					);
					break;
				default:
			}

			const colLegendFunc = (filterVal) => {
				return () => {
					dispatch(updateAndFetchGenes(dataset, {
						path,
						axis: 'col',
						filterAttrName: colPlotSetting.colorAttr,
						filterVal,
					}));
				};
			};
			colLegend = (
				<AttrLegend
					mode={colPlotSetting.colorMode}
					attr={col.attrs[colPlotSetting.colorAttr]}
					filterFunc={colLegendFunc}
					filteredAttrs={viewState.col.filter}
				/>
			);
		}

		let rowGradientSettings,
			rowLegend;
		if (rowPlotSetting.colorAttr) {
			switch (rowPlotSetting.colorMode) {
				case 'Heatmap':
				case 'Flame':
				case 'Icicle':
					rowGradientSettings = (
						<ClipDataSettings
							dispatch={dispatch}
							dataset={dataset}
							axis={'row'}
							plotSetting={rowPlotSetting}
							plotNr={0}
							time={200} />
					);
					break;
				default:
			}
			const rowLegendFunc = (filterVal) => {
				return () => {
					dispatch({
						type: UPDATE_VIEWSTATE,
						path,
						axis: 'row',
						filterAttrName: rowPlotSetting.colorAttr,
						filterVal,
					});
				};
			};
			rowLegend = (
				<AttrLegend
					mode={rowPlotSetting.colorMode}
					attr={row.attrs[rowPlotSetting.colorAttr]}
					filterFunc={rowLegendFunc}
					filteredAttrs={viewState.row.filter}
				/>
			);
		}
		return (
			<FlexboxContainer
				className={className}
				style={style} >
				<Panel
					className='sidepanel'
					key='heatmap-settings'
					header='Settings'
					bsStyle='default'>
					<ListGroup fill>
						<ListGroupItem>
							<CollapsibleSettings
								label={'Cell attribute or Gene to show'}>
								<div>
									<DropdownMenu
										value={colPlotSetting.colorAttr}
										options={col.dropdownOptions.allNoUniques}
										onChange={colAttrHC}
									/>
									<label>Show as</label>
									<DropdownMenu
										value={colPlotSetting.colorMode}
										options={modeNames}
										onChange={colModeHC}
									/>
								</div>
							</CollapsibleSettings>
							{colGradientSettings}
							{colPlotSetting.colorMode === 'Box' ?
								boxLegend :
								null
							}
							{colLegend}
						</ListGroupItem>
						<ListGroupItem>
							<CollapsibleSettings
								label={'Gene attribute to show'}>
								<div>
									<DropdownMenu
										value={rowPlotSetting.colorAttr}
										options={row.dropdownOptions.allNoUniques}
										onChange={rowAttrHC}
									/>
									<label>Show as</label>
									<DropdownMenu
										value={rowPlotSetting.colorMode}
										options={modeNames}
										onChange={rowModeHC}
									/>
								</div>
							</CollapsibleSettings>
							{rowGradientSettings}
							{rowLegend}
						</ListGroupItem>
					</ListGroup>
				</Panel>
			</FlexboxContainer>
		);
	}
}

HeatmapSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	className: PropTypes.string,
	style: PropTypes.object,
};