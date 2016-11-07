import React, { Component, PropTypes } from 'react';
import { FormControl } from 'react-bootstrap';
import { MetadataComponent } from './metadata';
import { ViewInitialiser } from './view-initialiser';
import { SEARCH_METADATA, SORT_GENE_METADATA, FILTER_METADATA } from '../actions/actionTypes';

class GeneMDComponent extends Component {
	componentWillMount() {
		const { dispatch, dataSet} = this.props;
		const { dataset } = dataSet;
		const onClickAttrFactory = (key) => {
			return () => {
				dispatch({
					type: SORT_GENE_METADATA,
					dataset,
					key,
				});
			};
		};
		// Yeah, I know...
		const onClickFilterFactory = (key, val) => {
			return () => {
				dispatch({
					type: FILTER_METADATA,
					dataset,
					attr: 'rowAttrs',
					key,
					val,
				});
			};
		};


		const searchMetadata = (event) => {
			let searchVal = event.target.value ? event.target.value : '';
			dispatch({
				type: SEARCH_METADATA,
				state: {
					dataSets: {
						[dataset]: {
							geneMetadataState: { searchVal },
						},
					},
				},
			});
		};


		this.setState({ onClickAttrFactory, onClickFilterFactory, searchMetadata });
	}

	render() {
		const { dataSet, dispatch } = this.props;
		const { onClickAttrFactory, onClickFilterFactory, searchMetadata } = this.state;
		let { searchVal } = dataSet.geneMetadataState;
		const searchField = (
			<FormControl
				type='text'
				onChange={searchMetadata}
				value={searchVal}
				/>
		);

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
	// Initialise geneMetadataState for this dataset
	return (
		<ViewInitialiser
			View={GeneMDComponent}
			viewStateName={'geneMetadataState'}
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