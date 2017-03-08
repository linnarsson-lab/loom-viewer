import React, { Component, PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
//import { PrintSettings } from './print-settings';
import { AttrLegend } from './legend';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';

import { fetchGene } from '../actions/actions';
import { SET_VIEW_PROPS, FILTER_METADATA } from '../actions/actionTypes';

export class HeatmapSidepanel extends Component {

	componentWillMount() {
		const { dispatch, dataset } = this.props;
		const { keys } = dataset.col;

		const { colAttr } = dataset.viewState.heatmap;
		if (colAttr &&
			keys.indexOf(colAttr) === -1 &&
			!dataset.fetchedGenes[colAttr]) {
			dispatch(fetchGene(dataset, [colAttr]));
		}

		const handleChangeFactory = (field) => {
			return (value) => {
				dispatch({
					type: SET_VIEW_PROPS,
					stateName: 'heatmap',
					path: dataset.path,
					viewState: { heatmap: { [field]: value } },
				});
			};
		};

		const colAttrHC = handleChangeFactory('colAttr');
		const colModeHC = handleChangeFactory('colMode');
		const rowAttrHC = handleChangeFactory('rowAttr');
		const rowModeHC = handleChangeFactory('rowMode');
		const modeNames = ['Text', 'Bars', 'Categorical', 'Heatmap', 'Heatmap2'];

		this.setState({
			colAttrHC, colModeHC,
			rowAttrHC, rowModeHC,
			modeNames,
		});
	}

	shouldComponentUpdate(nextProps) {
		const ds = this.props.dataset,
			nextds = nextProps.dataset,
			hms = ds.viewState.heatmap,
			nextHMS = nextds.viewState.heatmap;
		return hms.colAttr !== nextHMS.colAttr ||
			hms.colMode !== nextHMS.colMode ||
			hms.rowMode !== nextHMS.rowMode ||
			hms.rowMode !== nextHMS.rowMode ||
			ds.col.attrs[hms.colAttr] !== nextds.col.attrs[nextHMS.colAttr] ||
			ds.row.attrs[hms.rowAttr] !== nextds.row.attrs[nextHMS.rowAttr];
	}

	componentWillUpdate(nextProps) {
		const { dispatch, dataset } = nextProps;
		const { colAttr } = dataset.viewState.heatmap;
		if (colAttr && dataset.col.keys.indexOf(colAttr) === -1 && !dataset.fetchedGenes[colAttr]) {
			dispatch(fetchGene(dataset, [colAttr]));
		}
	}

	render() {
		const { dispatch } = this.props;
		const { col, row, path } = this.props.dataset;
		const hms = this.props.dataset.viewState.heatmap;
		const { colAttrHC, colModeHC, rowAttrHC, rowModeHC, modeNames } = this.state;

		const colAttr = col.attrs[hms.colAttr];
		const rowAttr = row.attrs[hms.rowAttr];
		return (
			<Panel
				className='sidepanel'
				key='heatmap-settings'
				header='Settings'
				bsStyle='default'>
				<ListGroup fill>
					<ListGroupItem>
						<label>Cell attribute or Gene to show</label>
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
						{colAttr ? (
							<AttrLegend
								mode={hms.colMode}
								attr={colAttr}
								filterFunc={(val) => {
									return () => {
										dispatch({
											type: FILTER_METADATA,
											path,
											axis: 'col',
											attrName: hms.colAttr,
											val,
										});
									};
								}}
							/>
						) : null
						}
					</ListGroupItem>
					<ListGroupItem>
						<label>Gene attribute to show</label>
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
						{
							rowAttr ? (
								<AttrLegend
									mode={hms.rowMode}
									attr={rowAttr}
									filterFunc={(val) => {
										return () => {
											dispatch({
												type: FILTER_METADATA,
												path,
												axis: 'row',
												attrName: hms.rowAttr,
												val,
											});
										};
									}}
								/>
							) : null
						}
					</ListGroupItem>
				</ListGroup>
			</Panel>
		);
	}
}

HeatmapSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};