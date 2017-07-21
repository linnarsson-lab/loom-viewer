import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import DocumentTitle from 'react-document-title';

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
		const title = project && filename ?
			`Loom - /${project}/${filename}` : 'Loom';

		const navbarInstance = (
			<Navbar staticTop collapseOnSelect>
				<Navbar.Header>
					<LinkContainer to='/'>
						<Navbar.Brand>
							{title}
						</Navbar.Brand>
					</LinkContainer>
					<Navbar.Toggle />
				</Navbar.Header>
				<Navbar.Collapse>
					<Nav>
						{viewLinks}
					</Nav>
				</Navbar.Collapse>
			</Navbar>
		);
		return (
			<DocumentTitle title={title}>
				<div className='view-vertical'>
					<div>
						{navbarInstance}
					</div>
					<div className='view'>
						{this.props.children}
					</div>
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