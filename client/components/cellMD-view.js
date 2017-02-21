import React, { Component, PropTypes } from 'react';
import { Glyphicon } from 'react-bootstrap';
import { DebouncedFormcontrol } from './debounced-formcontrol';
import { MetadataComponent } from './metadata';
import { ViewInitialiser } from './view-initialiser';
import { SET_VIEW_PROPS, SORT_CELL_METADATA, FILTER_METADATA } from '../actions/actionTypes';

class CellMDComponent extends Component {
	componentWillMount() {
		const { dispatch, dataset} = this.props;
		const path = dataset.path;

		const onClickAttrFactory = (key) => {
			return () => {
				dispatch({
					type: SORT_CELL_METADATA,
					path,
					key,
					stateName: 'cellMD',
				});
			};
		};

		const onClickFilterFactory = (key, val) => {
			return () => {
				dispatch({
					type: FILTER_METADATA,
					path,
					stateName: 'cellMD',
					attr: 'colAttrs',
					key,
					val,
				});
			};
		};

		const searchMetadata = (event) => {
			let searchVal = event.target.value ? event.target.value : '';
			dispatch({
				type: SET_VIEW_PROPS,
				path,
				stateName: 'cellMD',
				viewState: { cellMD: { searchVal } },

			});
		};

		this.setState({ onClickAttrFactory, onClickFilterFactory, searchMetadata });
	}

	render() {
		const { onClickAttrFactory, onClickFilterFactory, searchMetadata } = this.state;
		const { dataset, dispatch } = this.props;

		let { searchVal } = dataset.viewState.cellMD;
		const searchField = (
			<DebouncedFormcontrol
				type='text'
				onChange={searchMetadata}
				value={searchVal}
				time={500}
				/>
		);

		// Show first four attributes to use as sort keys
		const { col } = dataset;
		const { attrs, keys, order } = col;
		let sortOrderList = [<span key={-1} style={{ fontWeight: 'bold' }}>{'Order by:'}</span>];
		for (let i = 0; i < Math.min(order.length, 4); i++){
			const val = order[i];
			sortOrderList.push(
				<span key={i}>
					&nbsp;&nbsp;&nbsp;
					{val.key}
					<Glyphicon
						glyph={ val.ascending ?
						'sort-by-attributes' : 'sort-by-attributes-alt' } />
				</span>
			);
		}

		return (
			<div className='view-vertical' style={{ margin: '1em 3em 1em 3em' }}>
				<h1>Cell Metadata: {dataset.project}/{dataset.title}</h1>
				<MetadataComponent
					attributes={attrs}
					attrKeys={keys}
					dispatch={dispatch}
					onClickAttrFactory={onClickAttrFactory}
					onClickFilterFactory={onClickFilterFactory}
					searchField={searchField}
					searchVal={searchVal}
					sortOrderList={sortOrderList}
					/>
			</div>
		);
	}
}

CellMDComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { searchVal : '' };

const CellMetadataViewInitialiser = function (props) {
	// Initialise cellMetadataState for this dataset
	return (
		<ViewInitialiser
			View={CellMDComponent}
			stateName={'cellMD'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			datasets={props.datasets} />
	);
};

CellMetadataViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	datasets: PropTypes.object,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		datasets: state.datasets.list,
	};
};

export const CellMetadataView = connect(mapStateToProps)(CellMetadataViewInitialiser);