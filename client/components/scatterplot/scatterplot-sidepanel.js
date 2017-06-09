import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	Panel,
	ListGroup,
	ListGroupItem,
} from 'react-bootstrap';

import { CoordinateSettings } from './coordinate-settings';
import { ColorSettings } from './color-settings';
import { ScaleFactorSettings } from './scalefactor-settings';
import { popoverTest } from './popover';

import {
	CollapsibleSettings,
	FilteredValues,
} from '../settings/settings';

export class ScatterplotSidepanel extends PureComponent {
	render() {

		const {
			dispatch,
			dataset,
			axis,
		} = this.props;

		const {
			xAttrs,
			yAttrs,
			colorAttr,
			colorMode,
			settings,
		} = this.props.viewState;

		return (
			<Panel
				className='sidepanel'
				key={`${axis}-settings`}
				header='Settings'
				bsStyle='default'>

				<ListGroup fill>
					<CoordinateSettings
						dispatch={dispatch}
						dataset={dataset}
						axis={axis}
						xAttrs={xAttrs}
						yAttrs={yAttrs}
					/>
					<ListGroupItem>
						<CollapsibleSettings
							label={`Radius Scale Factor (x${(settings.scaleFactor / 40).toFixed(1)})`}
							tooltip={'Change the radius of the drawn points'}
							tooltipId={'radiusstngs-tltp'}
							popover={popoverTest}
							popoverTitle={'Test'}
							popoverId={'popoverId5'}

							mountClosed>
							<div>
								<ScaleFactorSettings
									dispatch={dispatch}
									dataset={dataset}
									axis={axis}
									scaleFactor={settings.scaleFactor}
									time={200} />
							</div>
						</CollapsibleSettings>
					</ListGroupItem>
					<ColorSettings
						dispatch={dispatch}
						dataset={dataset}
						axis={axis}
						colorAttr={colorAttr}
						colorMode={colorMode}
						settings={settings}
					/>
					{
						dataset.viewState[axis].filter &&
							dataset.viewState[axis].filter.length ? (
								<ListGroupItem>
									<FilteredValues
										dispatch={dispatch}
										dataset={dataset}
										axis={axis}
										filtered={dataset.viewState[axis].filter} />
								</ListGroupItem>
							) : null
					}
				</ListGroup>
			</Panel >
		);
	}
}

ScatterplotSidepanel.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	viewState: PropTypes.object.isRequired,
};