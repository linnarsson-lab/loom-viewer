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
			viewLinks = [
				{ link: 'heatmap', label: 'Heatmap'},
				{ link: 'sparklines', label: 'Sparklines'},
				{ link: 'cells', label: 'Cell Scatterplot'},
				{ link: 'cellmetadata', label: 'Cell Metadata'},
				{ link: 'genes', label: 'Gene Scatterplot'},
				{ link: 'genemetadata', label: 'Gene Metadata'},
			].map(
				(view) => {
					const link = `/dataset/${view.link}/${project}/${filename}/${viewsettings}`;
					return (
						<LinkContainer to={link} key={view.link}>
							<NavItem eventKey={view.link}>
								{view.label}
							</NavItem>
						</LinkContainer>
					);
				}
			);
		}
		const title = project && filename ? `/${project}/${filename}` : 'Data Sets';

		const navbarInstance = (
			<Navbar
				collapseOnSelect
				fixedTop
				fluid >
				<Navbar.Collapse>
					<Nav>
						<LinkContainer to='/'>
							<NavItem eventKey={'datasets'}>
							Loom
							</NavItem>
						</LinkContainer>
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
			<DocumentTitle title={'Loom - ' + title}>
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