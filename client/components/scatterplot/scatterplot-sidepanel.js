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

import { FlexboxContainer } from '../flexbox-container.js';

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
			className,
			style,
		} = this.props;

		const {
			xAttrs,
			yAttrs,
			colorAttr,
			colorMode,
			settings,
		} = this.props.viewState;

		return (
			<FlexboxContainer
				className={className}
				style={style} >
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
								label={`Point size (x${(settings.scaleFactor / 20).toFixed(1)})`}
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
			</FlexboxContainer>
		);
	}
}

ScatterplotSidepanel.propTypes = {
	dispatch: PropTypes.func.isRequired,
	dataset: PropTypes.object.isRequired,
	axis: PropTypes.string.isRequired,
	viewState: PropTypes.object.isRequired,
	className: PropTypes.string,
	style: PropTypes.object,
};