import React, { Component, PropTypes } from 'react';
import { FormControl, Glyphicon } from 'react-bootstrap';
import { MetadataComponent } from './metadata';
import { ViewInitialiser } from './view-initialiser';
import { SET_VIEW_PROPS, SORT_GENE_METADATA, FILTER_METADATA } from '../actions/actionTypes';

class GeneMDComponent extends Component {
	componentWillMount() {
		const { dispatch, dataSet} = this.props;
		const datasetName = dataSet.dataset;

		const onClickAttrFactory = (key) => {
			return () => {
				dispatch({
					type: SORT_GENE_METADATA,
					datasetName,
					key,
					stateName: 'geneMD',
				});
			};
		};

		const onClickFilterFactory = (key, val) => {
			return () => {
				dispatch({
					type: FILTER_METADATA,
					datasetName,
					stateName: 'geneMD',
					attr: 'rowAttrs',
					key,
					val,
				});
			};
		};

		const searchMetadata = (event) => {
			let searchVal = event.target.value ? event.target.value : '';
			dispatch({
				type: SET_VIEW_PROPS,
				datasetName,
				stateName: 'geneMD',
				viewState: { geneMD: { searchVal } },
			});
		};

		this.setState({ onClickAttrFactory, onClickFilterFactory, searchMetadata });
	}

	render() {
		const { dataSet, dispatch } = this.props;
		const { onClickAttrFactory, onClickFilterFactory, searchMetadata } = this.state;
		let { searchVal } = dataSet.viewState.geneMD;
		const searchField = (
			<FormControl
				type='text'
				onChange={searchMetadata}
				value={searchVal}
				/>
		);

		const { rowOrder } = dataSet;
		let sortOrderList = [<span key={-1} style={{ fontWeight: 'bold' }}>{'Order by:'}&nbsp;&nbsp;&nbsp;</span>];
		for (let i = 0; i < Math.min(rowOrder.length, 4); i++){
			const val = rowOrder[i];
			sortOrderList.push(
				<span key={i}>
					{val.key}
					<Glyphicon
						glyph={ val.ascending ?
						'sort-by-attributes' : 'sort-by-attributes-alt' } />
					&nbsp;,&nbsp;&nbsp;&nbsp;
				</span>
			);
		}
		sortOrderList.push('...');

		return (
			<div className='view-vertical' style={{ margin: '1em 3em 1em 3em' }}>
				<h1>Gene Metadata of {dataSet.dataset}</h1>
				<MetadataComponent
					attributes={dataSet.rowAttrs}
					attrKeys={dataSet.rowKeys}
					indices={dataSet.rowIndicesFiltered}
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

GeneMDComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { searchVal : '' };

const GeneMetadataViewInitialiser = function (props) {
	// Initialise geneMetadata state for this dataset
	return (
		<ViewInitialiser
			View={GeneMDComponent}
			stateName={'geneMD'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			data={props.data} />
	);
};

GeneMetadataViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	data: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		data: state.data,
	};
};

export const GeneMetadataView = connect(mapStateToProps)(GeneMetadataViewInitialiser);