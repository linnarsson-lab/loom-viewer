import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	Panel,
	ListGroup,
	ListGroupItem,
} from 'react-bootstrap';

import {
	AttrLegend,
	CollapsibleSettings,
	DropdownMenu,
	//PrintSettings,
} from '../settings/settings';

import { fetchGene } from '../../actions/fetch-genes';
import { SET_VIEW_PROPS } from '../../actions/actionTypes';

export class HeatmapSidepanel extends PureComponent {
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
		const modeNames = ['Text', 'Bars', 'Categorical', 'Stacked', 'Heatmap', 'Heatmap2', 'Flame', 'Flame2'];

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
			dataset.col.geneToRow[gene] !== undefined &&
			!dataset.fetchedGenes[gene] &&
			!dataset.fetchingGenes[gene]) {
			dispatch(fetchGene(dataset, [gene]));
		}
	}

	render() {
		const { dispatch, dataset } = this.props;
		const { col, row, path } = dataset;
		const hms = dataset.viewState.heatmap;
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
								filteredAttrs={dataset.viewState.col.filter}
							/>
						) : null
						}
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
									filteredAttrs={dataset.viewState.row.filter}
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