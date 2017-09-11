import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import DocumentTitle from 'react-document-title';

import { RemountOnResize } from './remount-on-resize';

export class NavbarView extends PureComponent {
	render() {
		const { project, filename, viewsettings } = this.props.params;
		let viewLinks;
		if (filename) {
			viewLinks = ['heatmap', 'sparklines', 'cells', 'cellmetadata', 'genes', 'genemetadata'].map(
				(view) => {
					const link = `/dataset/${view}/${project}/${filename}/${viewsettings}`;
					return (
						<LinkContainer to={link} key={view}>
							<NavItem eventKey={view}>
								{view.charAt(0).toUpperCase() + view.slice(1)}
							</NavItem>
						</LinkContainer>
					);
				}
			);
		}
		const title = project && filename ? `/${project}/${filename}` : 'Data Sets';

		const navbarInstance = (
			<Navbar fixedTop collapseOnSelect>
				<Navbar.Header>
					<LinkContainer to='/'>
						<Navbar.Brand style={{ cursor: 'pointer' }}>
							Loom
						</Navbar.Brand>
					</LinkContainer>
					<Navbar.Toggle />
				</Navbar.Header>
				<Navbar.Collapse>
					<Nav>
						<NavItem disabled eventKey={title}>
							{title}
						</NavItem>
						{viewLinks}
					</Nav>
				</Navbar.Collapse>
			</Navbar>
		);
		// the dummy Navbar is to ensure the views
		// are displayed below the real Navbar.
		return (
			<DocumentTitle title={title}>
				<div className='view-vertical'>
					<div>
						{navbarInstance}
						<Navbar staticTop>
							<Navbar.Header>
								<Navbar.Brand>
									dummy
								</Navbar.Brand>
							</Navbar.Header>
						</Navbar>
					</div>
					<RemountOnResize>
						{this.props.children}
					</RemountOnResize>
				</div>
			</DocumentTitle>
		);
	}
}

NavbarView.propTypes = {
	// Passed down by react-router
	params: PropTypes.object.isRequired,
	children: PropTypes.node,
};