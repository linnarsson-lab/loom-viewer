import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ListGroup, ListGroupItem } from 'react-bootstrap';

import { CollapsibleSettings } from './collapsible';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

export class FilteredValues extends PureComponent {
	render() {
		const { filtered, dispatch, dataset, axis } = this.props;
		const { attrs } = dataset[axis];
		if (filtered && filtered.length) {
			let filteredVals = [], attrNames = [], i = filtered.length;
			while (i--) {
				let { attr, val } = filtered[i];
				let j = attrNames.indexOf(attr);
				if (j === -1) {
					j = attrNames.length;
					attrNames.push(attr);
					filteredVals.push([]);
				}
				filteredVals[j].push(val);
			}

			let filteredList = new Array(filteredVals.length);
			i = filteredVals.length;
			while (i--) {
				let filterAttrName = attrNames[i],
					attr = attrs[filterAttrName],
					label = `${attrNames[i]}: (${filteredVals[i].length})`;

				filteredList[i] = (
					<ListGroupItem key={i + attr}>
						<CollapsibleSettings
							label={label}
							mountClosed>
							<ListGroup>
								{
									filteredVals[i].map((filterVal) => {
										return (
											<ListGroupItem
												key={filterAttrName + '_' + filterVal}
												style={{
													cursor: 'pointer',
													fontWeight: 'bold',
												}}
												onClick={
													() => {
														dispatch({
															type: SET_VIEW_PROPS,
															path: dataset.path,
															axis,
															filterAttrName,
															filterVal,
														});
													}
												}>
												{attr.indexedVal ?
													attr.indexedVal[filterVal] :
													filterVal}
											</ListGroupItem>
										);
									})
								}
							</ListGroup>
						</CollapsibleSettings>
					</ListGroupItem>
				);
			}

			return (
				<CollapsibleSettings
					label={'Filtered Values'}
					tooltip={'All values currently being filtered out. Click a value to stop filtering it'}
					tooltipId={'filter-tltp'}>
					<ListGroup>
						{filteredList}
					</ListGroup>
				</CollapsibleSettings>
			);
		} else {
			return null;
		}
	}
}

FilteredValues.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	filtered: PropTypes.arrayOf(PropTypes.shape({
		attr: PropTypes.string,
		val: PropTypes.any,
	})),
};