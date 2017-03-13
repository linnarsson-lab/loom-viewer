import React, { Component, PropTypes } from 'react';
import { Glyphicon } from 'react-bootstrap';
import { fetchGene } from '../actions/actions';
import { DropdownMenu } from './dropdown';

export class SortAttributeComponent extends Component {
	constructor(props) {
		super(props);
		const { dispatch, dataset, stateName, actionType, axis } = props;
		const path = dataset.path;
		const { keys } = dataset[axis]

		this.onChange = (value) => {
			if (keys.indexOf(value) === -1 && !dataset.fetchedGenes[value]) {
				dispatch(fetchGene(dataset, [value]));
			}
			dispatch({
				type: actionType,
				path,
				axis,
				attrName: value,
				stateName,
			});
		};
	}

	shouldComponentUpdate(nextProps) {
		return nextProps.dataset[nextProps.axis].order !==
			this.props.dataset[this.props.axis].order;
	}

	render() {
		const { dataset, axis } = this.props;
		const { col } = dataset;

		// Show first four attributes to use as sort keys
		const { order } = dataset[axis];
		let sortOrderList = [(
			<span key={'front'}>
				<span style={{ fontWeight: 'bold' }}>
					Order by: &nbsp;&nbsp;&nbsp;
				</span>
				<span style={{ fontStyle: 'italic' }}>
					(select twice to togle ascending)
				</span>
			</span>
		), (
			<DropdownMenu
				value={order[0].key}
				options={col.allKeysNoUniques}
				filterOptions={col.dropdownOptions.allNoUniques}
				onChange={this.onChange} />
		)];
		for (let i = 0; i < Math.min(order.length, 4); i++) {
			const val = order[i];
			sortOrderList.push(
				<span key={i + 1}>
					&nbsp;&nbsp;&nbsp;
					{val.key}
					<Glyphicon
						glyph={val.ascending ?
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
	stateName: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	actionType: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};