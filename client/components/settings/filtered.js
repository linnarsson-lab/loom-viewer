import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroup,
	ListGroupItem,
	Button,
} from 'react-bootstrap';

import { CollapsibleSettings, OverlayTooltip } from './collapsible';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

export class FilteredValues extends Component {
	render() {

		const {
			filtered,
			dispatch,
			dataset,
			axis,
		} = this.props;

		const { attrs } = dataset[axis];
		if (filtered && filtered.length) {

			let filteredVals = [],
				attrNames = [],
				i = filtered.length;

			while (i--) {

				let {
					attr,
					val,
				} = filtered[i];

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

				const listGroupElements = attr ? filteredVals[i].map(
					(filterVal) => {
						const onFilterClick = () => {
							dispatch({
								type: SET_VIEW_PROPS,
								path: dataset.path,
								axis,
								filterAttrName,
								filterVal,
							});
						};
						return (
							<OverlayTooltip
								key={filterAttrName + '_' + filterVal}
								tooltip={`Click to remove "${filterVal}" from filter`}
								tooltipId={`filter-${filterAttrName}_${filterVal}-tltp`}>
								<ListGroupItem>
									<Button
										bsStyle='link'
										style={{
											fontWeight: 'bold',
											whiteSpace: 'normal',
											textAlign: 'left',
											width: '100%',
										}}
										onClick={onFilterClick}>

										{attr.indexedVal ?
											attr.indexedVal[filterVal] :
											filterVal}
									</Button>
								</ListGroupItem>
							</OverlayTooltip>
						);
					}
				) : null;


				filteredList[i] = (
					<ListGroupItem key={i + filterAttrName}>
						<CollapsibleSettings
							label={label}
							mountClosed>
							<ListGroup>
								{listGroupElements}
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