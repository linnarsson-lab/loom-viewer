import React, { PureComponent } from 'react'; import PropTypes from 'prop-types';

import {
	Panel,
	ListGroup,
	ListGroupItem,
} from 'react-bootstrap';

import { LegendSettings } from './legend-settings';
import { AttributeSelection } from './attribute-selection.js';
import { ColorSettings } from './color-settings';

import { FlexboxContainer } from '../flexbox-container.js';

import {
	CollapsibleSettings,
	FilteredValues,
	SortAttributeComponent,
} from 'components/settings';

export class SparklineSidepanel extends PureComponent {

	render() {
		const {
			dispatch,
			dataset,
			className,
			style,
		} = this.props;

		const {
			sparkline,
		} = dataset.viewState;

		const {
			filter,
		} = dataset.viewState.col;

		return (
			<FlexboxContainer
				className={className}
				style={style} >
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
							showLabels={sparkline.showLabels}
						/>
						<LegendSettings
							dataset={dataset}
							dispatch={dispatch}
							colAttr={sparkline.colAttr}
							colMode={sparkline.colMode}
							groupBy={sparkline.groupBy}
							legendData={dataset.col.attrs[sparkline.colAttr]} />
						{
							filter &&
								filter.length ? (
									<ListGroupItem>
										<FilteredValues
											dispatch={dispatch}
											dataset={dataset}
											axis={'col'}
											filtered={filter} />
									</ListGroupItem>
								) : null
						}

						<ListGroupItem>
							<CollapsibleSettings
								label={'Column order'}
								tooltip={'Sort datapoints by attributes, in this order (select same attribute twice to toggle ascending/descending)'}
								tooltipId={'order-tltp'}
								mountClosed>
								<div>
									<SortAttributeComponent
										attributes={dataset.col.attrs}
										attrKeys={dataset.col.allKeysNoUniques}
										axis={'col'}
										path={dataset.path}
										stateName={'sparkline'}
										dataset={dataset}
										dispatch={dispatch} />
								</div>
							</CollapsibleSettings>
						</ListGroupItem>
					</ListGroup >
				</Panel >
			</FlexboxContainer>
		);
	}
}

SparklineSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	className: PropTypes.string,
	style: PropTypes.object,
};