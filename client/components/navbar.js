import React from 'react';
import PropTypes from 'prop-types';

import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import DocumentTitle from 'react-document-title';

export const NavbarView = function (props) {
	const { project, filename } = props.params;
	let viewLinks;
	if (filename) {
		viewLinks = ['heatmap', 'sparklines', 'cells', 'cellmetadata', 'genes', 'genemetadata'].map(
			(view) => {
				const link = `/dataset/${view}/${project}/${filename}`;
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
		<Navbar>
			<Navbar.Header>
				<LinkContainer to='/'>
					<Navbar.Brand>
						{title}
					</Navbar.Brand>
				</LinkContainer>
			</Navbar.Header>
			<Nav>
				{viewLinks}
			</Nav>
		</Navbar>
	);
	return (
		<DocumentTitle title={title}>
			<div className='view-vertical'>
				{navbarInstance}
				<div className='view'>
					{props.children}
				</div>
			</div>
		</DocumentTitle>
	);
};

NavbarView.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	children: PropTypes.node,
};