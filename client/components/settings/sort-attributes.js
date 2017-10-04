import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Glyphicon } from 'react-bootstrap';
import { DropdownMenu } from './dropdown';

import { updateAndFetchGenes } from '../../actions/update-and-fetch';

export class SortAttributeComponent extends Component {
	constructor(...args) {
		super(...args);
		this.onChange = this.onChange.bind(this);
	}

	onChange(value){
		const { props } = this;

		const action = {
			path: props.path,
			axis: props.axis,
			sortAttrName: value,
			stateName: props.stateName,
		};

		const {
			dispatch,
			dataset,
		} = props;

		dispatch(updateAndFetchGenes(dataset, action));
	}

	render() {
		const {
			dataset,
			axis,
		} = this.props;
		const {
			allKeysNoUniques,
			dropdownOptions,
		} = dataset[axis];
		// Show first four attributes to use as sort keys
		const { order } = dataset.viewState[axis];
		let sortOrderList = [(
			<DropdownMenu
				key={'dropdown'}
				value={order[0].key}
				options={dropdownOptions.allNoUniques}
				onChange={this.onChange} />
		)];
		for (let i = 0; i < Math.min(order.length, 5); i++) {
			const val = order[i];
			sortOrderList.push(
				<span key={i + 1}>
					&nbsp;&nbsp;&nbsp;
					{val.key}
					&nbsp;
					<Glyphicon
						glyph={val.asc ?
							'sort-by-attributes' : 'sort-by-attributes-alt'} />
				</span>
			);
		}

		return (
			<div className={'view-vertical'} >
				{sortOrderList}
			</div >
		);
	}
}

SortAttributeComponent.propTypes = {
	attributes: PropTypes.object.isRequired,
	attrKeys: PropTypes.array.isRequired,
	axis: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired,
	stateName: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};