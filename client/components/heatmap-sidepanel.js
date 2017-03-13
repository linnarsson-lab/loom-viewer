import React, { Component, PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
//import { PrintSettings } from './print-settings';
import { AttrLegend } from './legend';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';

import { fetchGene } from '../actions/actions';
import { SET_VIEW_PROPS } from '../actions/actionTypes';

export class HeatmapSidepanel extends Component {
	constructor(props) {
		super(props);
		this.maybeFetch = this.maybeFetch.bind(this);
	}

	componentWillMount() {
		const { dispatch, dataset } = this.props;
		this.maybeFetch(dataset.viewState.heatmap.colAttr, dataset, dispatch);

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
		this.maybeFetch(colAttr, dataset, dispatch);
	}

	maybeFetch(gene, dataset, dispatch) {
		if (gene &&
			dataset.col.keys.indexOf(gene) === -1 &&
			!dataset.fetchedGenes[gene]) {
			dispatch(fetchGene(dataset, [gene]));
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
								filterFunc={(filterVal) => {
									return () => {
										dispatch({
											type: SET_VIEW_PROPS,
											path,
											axis: 'col',
											filterAttrName: hms.colAttr,
											filterVal,
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