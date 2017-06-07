import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { DropdownMenu } from './dropdown';
import { SortAttributeComponent } from './sort-attributes';
import { FetchGeneComponent } from './fetch-gene';
import { CollapsibleSettings } from './collapsible';
import { AttrLegend } from './legend';
import { FilteredValues } from './filtered';

import { fetchGene } from '../actions/fetch-genes';

import {
	Panel, Button,
	ListGroup, ListGroupItem,
} from 'react-bootstrap';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

class LegendSettings extends PureComponent {
	componentWillMount() {
		const { dispatch, dataset } = this.props;
		const { geneToRow } = dataset.col;

		const colAttrsHC = (val) => {
			if (geneToRow[val] !== undefined && !dataset.fetchedGenes[val]) {
				dispatch(fetchGene(dataset, [val]));
			}
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'sparkline',
				path: dataset.path,
				viewState: { sparkline: { colAttr: val } },
			});
		};

		const colModeHC = (val) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'sparkline',
				path: dataset.path,
				viewState: { sparkline: { colMode: val } },
			});
		};

		const colModeOptions = ['Bars', 'Categorical', 'Stacked', 'Heatmap', 'Heatmap2', 'Flame', 'Flame2'];

		this.setState({ colAttrsHC, colModeHC, colModeOptions });
	}

	shouldComponentUpdate(nextProps) {
		return nextProps.colAttr !== this.props.colAttr ||
			nextProps.colMode !== this.props.colMode ||
			nextProps.dataset.viewState.col.filter !== this.props.dataset.viewState.col.filter;
		nextProps.dataset.col.attrs[this.props.colAttr] !== this.props.dataset.col.attrs[this.props.colAttr];
	}

	render() {
		const { colAttrsHC, colModeOptions, colModeHC } = this.state;
		const { dispatch, dataset, colAttr, colMode } = this.props;
		const { col } = dataset;

		const { path } = dataset;
		const filterFunc = colAttr ? (val) => {
			return () => {
				dispatch({
					type: SET_VIEW_PROPS,
					path,
					axis: 'col',
					filterAttrName: colAttr,
					filterVal: val,
				});
			};
		} : () => { };
		const legendData = col.attrs[colAttr];
		let legend;
		if (legendData) {
			legend = (
				<AttrLegend
					mode={colMode}
					filterFunc={filterFunc}
					filteredAttrs={dataset.viewState.col.filter}
					attr={legendData} />
			);
		}


		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Attribute legend'}
					tooltip={'Metadata attribute to identify the sparklines. Click a value to filter it out'}
					tooltipId={'attrlgnd-tltp'}>
					<div>
						<DropdownMenu
							value={colAttr}
							options={col.keysNoUniques}
							filterOptions={col.dropdownOptions.attrsNoUniques}
							onChange={colAttrsHC}
						/>
						<DropdownMenu
							value={colMode}
							options={colModeOptions}
							onChange={colModeHC}
						/>
					</div>
				</CollapsibleSettings>
				{legend}
			</ListGroupItem>
		);
	}
}

LegendSettings.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
};

class AttributeSelection extends PureComponent {
	componentWillMount() {
		const { dispatch, dataset } = this.props;
		const genesHC = (val) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'sparkline',
				path: dataset.path,
				viewState: { sparkline: { genes: val } },
			});
		};
		this.setState({ genesHC });
	}

	shouldComponentUpdate(nextProps) {
		return nextProps.genes !== this.props.genes;
	}

	render() {
		const { dispatch, dataset, genes } = this.props;

		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Genes'}
					tooltip={'Select genes to display as sparkline or heatmap plots'}
					tooltipId={'gene-tltp'}>
					<div>
						<FetchGeneComponent
							dataset={dataset}
							dispatch={dispatch}
							onChange={this.state.genesHC}
							selectedGenes={genes}
						/>
					</div>
				</CollapsibleSettings>
			</ListGroupItem>
		);
	}
}

AttributeSelection.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	genes: PropTypes.arrayOf(PropTypes.string).isRequired,
};

class ColorSettings extends PureComponent {

	componentWillMount() {
		const { dispatch, dataset } = this.props;
		const handleChangeFactory = (field) => {
			return (val) => {
				dispatch({
					type: SET_VIEW_PROPS,
					stateName: 'sparkline',
					path: dataset.path,
					viewState: { sparkline: { [field]: val } },
				});
			};
		};

		const geneModeOptions = ['Bars', 'Heatmap', 'Heatmap2', 'Flame', 'Flame2'];
		const geneModeHC = handleChangeFactory('geneMode');
		const showLabelsHC = handleChangeFactory('showLabels');
		this.setState({ geneModeOptions, geneModeHC, showLabelsHC });
	}

	shouldComponentUpdate(nextProps) {
		return (
			this.props.showLabels !== nextProps.showLabels ||
			this.props.geneMode !== nextProps.geneMode
		);
	}

	render() {
		const { geneModeOptions, geneModeHC, showLabelsHC } = this.state;
		const { showLabels, geneMode } = this.props;
		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Mode'}
					tooltip={'Show sparklines as bar or heatmap plot'}
					tooltipId={'sparklinemode-tltp'}>
					<div>
						<div className={'view'}>
							<div style={{ flex: 5 }}>
								<DropdownMenu
									value={geneMode}
									options={geneModeOptions}
									onChange={geneModeHC}
								/>
							</div>
							<Button bsStyle={showLabels ? 'primary' : 'default'}
								style={{ flex: 1 }}
								onClick={() => { showLabelsHC(!showLabels); }} >
								labels
						</Button>
						</div>
					</div>
				</CollapsibleSettings>
			</ListGroupItem>
		);
	}
}

ColorSettings.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	geneMode: PropTypes.string.isRequired,
	showLabels: PropTypes.bool.isRequired,
};

export const SparklineSidepanel = function (props) {
	const { dispatch, dataset } = props;
	const { sparkline } = dataset.viewState;

	return (
		<Panel
			className='sidepanel'
			key='sparkline-settings'
			header='Settings'
			bsStyle='default'>
			<ListGroup fill>
				<AttributeSelection
					dataset={dataset}
					dispatch={dispatch}
					genes={sparkline.genes} />
				<ColorSettings
					dataset={dataset}
					dispatch={dispatch}
					geneMode={sparkline.geneMode}
					showLabels={sparkline.showLabels} />
				<LegendSettings
					dataset={dataset}
					dispatch={dispatch}
					colAttr={sparkline.colAttr}
					colMode={sparkline.colMode} />
				{
					dataset.viewState.col.filter &&
						dataset.viewState.col.filter.length ? (
							<ListGroupItem>
								<FilteredValues
									dispatch={dispatch}
									dataset={dataset}
									axis={'col'}
									filtered={dataset.viewState.col.filter} />
							</ListGroupItem>
						) : null
				}
				<ListGroupItem>
					<CollapsibleSettings
						label={'Order'}
						tooltip={'Keys to sort datapoints by (select same value twice to toggle ascending/descending)'}
						tooltipId={'order-tltp'}
						mountClosed>
						<div>
							<SortAttributeComponent
								attributes={dataset.col.attrs}
								attrKeys={dataset.col.allKeysNoUniques}
								axis={'col'}
								stateName={'sparkline'}
								dataset={dataset}
								dispatch={dispatch} />
						</div>
					</CollapsibleSettings>
				</ListGroupItem>
			</ListGroup >
		</Panel >
	);
};

SparklineSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};