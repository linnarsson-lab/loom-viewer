import { render } from 'react-dom';

// ===================================================
//  Initiate any custom polyfills that we might have
// ===================================================

import 'js/polyfills';

// =====================================================
//  CSS Imports - import all CSS once, at the top level
// =====================================================

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

// ========================================================
//  LocalForage - set up off-line cache for datasets/genes
// ========================================================

import localforage from 'localforage';

// Set up configuration once, at start of app
localforage.config({
	name: 'Loom',
	storeName: 'datasets',
	driver: [
		localforage.INDEXEDDB,
		localforage.WEBSQL,
		localforage.LOCALSTORAGE,
	],
});

const dataSchemaVersion = '0.0.1 # first semver';
// Check for schema version, wipe localForage cache if outdated
localforage.getItem('dataSchemaVersion')
	.then((storedSchemaVersion) => {
		console.log({
			dataSchemaVersion,
			storedSchemaVersion,
		});
		if (storedSchemaVersion) {
			const schemas = [dataSchemaVersion, storedSchemaVersion]
				.map((schemaString) => {
					return schemaString
						.split('.')
						.map((str) => { return str | 0; });
				});
			return schemas[0][0] > schemas[1][0]; // breaking major update
			// schemas[0][1] > schemas[1][1] == non-breaking update
			// schemas[0][2] > schemas[1][2] == non-breaking minor update
		} else {
			// no storedSchemaVersion in cache means the schema is
			// from before versioning it, so by definition outdated
			return true;
		}
	})
	.then((wipeCache) => {
		if (wipeCache) {
			console.log('Major update to data schema, wiping localForage cache');
			return localforage.clear();
		}
		return null;
	})
	.then(() => {
		return localforage.setItem('dataSchemaVersion', dataSchemaVersion);
	});

// ===========================
//  Instantiate OfflinePlugin
// ===========================

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

// =================
//  Start React app
// =================

import Routes from './components/routes';
render(Routes, document.getElementById('react-root'));