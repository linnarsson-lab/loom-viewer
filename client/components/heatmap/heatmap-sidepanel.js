import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	Panel,
	ListGroup,
	ListGroupItem,
} from 'react-bootstrap';

import { FlexboxContainer } from '../flexbox-container.js';

import {
	AttrLegend,
	ClipDataSettings,
	CollapsibleSettings,
	DropdownMenu,
	//PrintSettings,
} from '../settings/settings';

import { setViewProps } from '../../actions/set-viewprops';
import { SET_VIEW_PROPS } from '../../actions/actionTypes';

export class HeatmapSidepanel extends Component {
	constructor(props) {
		super(props);
	}

	componentWillMount() {
		const { dispatch, dataset } = this.props;

		const handleChangeFactory = (field) => {
			return (value) => {
				dispatch(setViewProps(dataset, {
					stateName: 'heatmap',
					path: dataset.path,
					viewState: { heatmap: { [field]: value } },
				}));
			};
		};

		const colAttrHC = handleChangeFactory('colAttr');
		const colModeHC = handleChangeFactory('colMode');
		const rowAttrHC = handleChangeFactory('rowAttr');
		const rowModeHC = handleChangeFactory('rowMode');
		const modeNames = ['Text', 'Bars', 'Box', 'Categorical', 'Stacked', 'Heatmap', 'Heatmap2', 'Flame', 'Flame2'];

		this.setState({
			colAttrHC, colModeHC,
			rowAttrHC, rowModeHC,
			modeNames,
		});
	}

	shouldComponentUpdate(nextProps) {
		const ds = this.props.dataset,
			nds = nextProps.dataset,
			vs = ds.viewState,
			nvs = nds.viewState,
			hms = vs.heatmap,
			nextHMS = nvs.heatmap;
		return hms.colAttr !== nextHMS.colAttr ||
			hms.colMode !== nextHMS.colMode ||
			hms.rowMode !== nextHMS.rowMode ||
			hms.rowMode !== nextHMS.rowMode ||
			vs.col.settings !== nvs.col.settings ||
			vs.row.settings !== nvs.row.settings ||
			ds.col.attrs[hms.colAttr] !== nds.col.attrs[nextHMS.colAttr] ||
			ds.row.attrs[hms.rowAttr] !== nds.row.attrs[nextHMS.rowAttr];
	}

	render() {
		const {
			dispatch,
			dataset,
			className,
			style,
		} = this.props;
		const { col, row, path, viewState } = dataset;
		const hms = viewState.heatmap;
		const { colAttrHC, colModeHC, rowAttrHC, rowModeHC, modeNames } = this.state;

		const colAttr = col.attrs[hms.colAttr];
		let colGradientSettings, colLegend;
		if (colAttr) {
			switch (hms.colMode) {
				case 'Heatmap':
				case 'Heatmap2':
				case 'Flame':
				case 'Flame2':
					colGradientSettings = (
						<ClipDataSettings
							dispatch={dispatch}
							dataset={dataset}
							axis={'col'}
							settings={viewState.col.settings}
							time={200} />
					);
				default:
			}
			colLegend = (
				<AttrLegend
					mode={hms.colMode}
					attr={colAttr}
					filterFunc={(filterVal) => {
						return () => {
							dispatch(setViewProps(dataset, {
								path,
								axis: 'col',
								filterAttrName: hms.colAttr,
								filterVal,
							}));
						};
					}}
					filteredAttrs={viewState.col.filter}
				/>
			);
		}

		const rowAttr = row.attrs[hms.rowAttr];
		let rowGradientSettings, rowLegend;
		if (rowAttr) {
			switch (hms.rowMode) {
				case 'Heatmap':
				case 'Heatmap2':
				case 'Flame':
				case 'Flame2':
					rowGradientSettings = (
						<ClipDataSettings
							dispatch={dispatch}
							dataset={dataset}
							axis={'row'}
							settings={viewState.row.settings}
							time={200} />
					);
				default:
			}
			rowLegend = (
				<AttrLegend
					mode={hms.rowMode}
					attr={rowAttr}
					filterFunc={(filterVal) => {
						return () => {
							dispatch({
								type: SET_VIEW_PROPS,
								path,
								axis: 'row',
								filterAttrName: hms.rowAttr,
								filterVal,
							});
						};
					}}
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
										value={hms.colAttr}
										options={col.allKeysNoUniques}
										filterOptions={col.dropdownOptions.allNoUniques}
										onChange={colAttrHC}
									/>
									<label>Show as</label>
									<DropdownMenu
										value={hms.colMode}
										options={modeNames}
										onChange={colModeHC}
									/>
								</div>
							</CollapsibleSettings>
							{colGradientSettings}
							{colLegend}
						</ListGroupItem>
						<ListGroupItem>
							<CollapsibleSettings
								label={'Gene attribute to show'}>
								<div>
									<DropdownMenu
										value={hms.rowAttr}
										options={row.allKeysNoUniques}
										filterOptions={row.dropdownOptions.allNoUniques}
										onChange={rowAttrHC}
									/>
									<label>Show as</label>
									<DropdownMenu
										value={hms.rowMode}
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