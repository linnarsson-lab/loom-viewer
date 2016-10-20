import React, { Component, PropTypes } from 'react';
import { MetadataComponent } from './metadata';
import { ViewInitialiser } from './view-initialiser';
import { SORT_CELL_METADATA, FILTER_CELL_METADATA } from '../actions/actionTypes';

class CellMDComponent extends Component {
	componentWillMount() {
		const { dispatch, dataSet} = this.props;
		const { dataset } = dataSet;
		const onClickAttrFactory = (key) => {
			return () => {
				dispatch({
					type: SORT_CELL_METADATA,
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
						type: FILTER_CELL_METADATA,
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
				<h1>Cell Metadata of {dataSet.dataset}</h1>
				<MetadataComponent
					attributes={dataSet.colAttrs}
					schema={dataSet.schema.colAttrs}
					dispatch={dispatch}
					onClickAttrFactory={this.state.onClickAttrFactory}
					onClickFilterFactory={this.state.onClickFilterFactory}
					/>
			</div>
		);
	}
}

CellMDComponent.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = {};

const CellMetadataViewInitialiser = function (props) {
	// Initialise cellMetadataState for this dataset
	return (
		<ViewInitialiser
			View={CellMDComponent}
			viewStateName={'cellMetadataState'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			data={props.data} />
	);
};

CellMetadataViewInitialiser.propTypes = {
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

export const CellMetadataView = connect(mapStateToProps)(CellMetadataViewInitialiser);