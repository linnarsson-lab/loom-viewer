import React, { Component, PropTypes } from 'react';
import { MetadataComponent } from './metadata';
import { ViewInitialiser } from './view-initialiser';
import { SORT_GENE_METADATA, FILTER_GENE_METADATA } from '../actions/actionTypes';

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
		const onClickFilterFactory = (key) => {
			return (value) => {
				return () => {
					dispatch({
						type: FILTER_GENE_METADATA,
						dataset,
						key,
						value,
					});
				};
			};
		};

		this.setState({ onClickAttrFactory, onClickFilterFactory});
	}

	render() {
		const { dataSet, dispatch } = this.props;
		return (
			<div className='view-vertical' style={{ margin: '1em 3em 1em 3em' }}>
				<h1>Gene Metadata of {dataSet.dataset}</h1>
				<MetadataComponent
					attributes={dataSet.rowAttrs}
					schema={dataSet.schema.rowAttrs}
					dispatch={dispatch}
					onClickAttrFactory={this.state.onClickAttrFactory}
					onClickFilterFactory={this.state.onClickFilterFactory}
					/>
			</div>
		);
	}
}

GeneMDComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = {};

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