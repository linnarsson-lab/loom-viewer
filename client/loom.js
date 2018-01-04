import { render } from 'react-dom';

// initiate any custom polyfills that we might have
import 'js/polyfills';

// Import all CSS once, at the top level

// react-virtualized-select
import 'react-select/dist/react-select.css';
import 'react-virtualized/styles.css';
import 'react-virtualized-select/styles.css';

// rc-slider
import 'rc-slider/assets/index.css';

// Modified leaflet.css that does not include the images
// for layer controls, which we don't use anyway
import 'css/leaflet.css';

// Required for react-bootstrap
import './css/bootstrap.css';
import './css/bootstrap-theme.css';

// Custom loom CSS, includes crispness override for leaflet
import './css/loom.css';

// Set up localforage configuration once
import localforage from 'localforage';
localforage.config({
	name: 'Loom',
	storeName: 'datasets',
	driver: [
		localforage.INDEXEDDB,
		localforage.WEBSQL,
		localforage.LOCALSTORAGE,
	],
});

// Instantiate OfflinePlugin
import * as OfflinePluginRuntime from 'offline-plugin/runtime';
OfflinePluginRuntime.install({
	onUpdating: () => {
		console.log('SW Event:', 'onUpdating');
	},
	onUpdateReady: () => {
		console.log('SW Event:', 'onUpdateReady');
		// Tells to new SW to take control immediately
		OfflinePluginRuntime.applyUpdate();
	},
	onUpdated: () => {
		console.log('SW Event:', 'onUpdated');
		// Reload the webpage to load into the new version
		window.location.reload();
	},

	onUpdateFailed: () => {
		console.log('SW Event:', 'onUpdateFailed');
	},
});

import Routes from './components/routes';
render(Routes, document.getElementById('react-root'));