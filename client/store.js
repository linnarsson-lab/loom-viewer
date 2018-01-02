import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import { applyMiddleware } from 'redux';
import { createStore } from 'redux';

// import the root reducer
import loomAppReducer from './reducers/reducers';

// Allow access to the store from the console in debug build,
// but not in the production build.
// Using `var _store =` is a dirty hack, but it is the only
// workaround that I know of for conditional exports
if (process.env.NODE_ENV === 'debug') {
	const composeEnhancers = composeWithDevTools({
		// Specify here name, actionsBlacklist,
		// actionsCreators and other options if needed
	});

	var _store = createStore(
		loomAppReducer,
		composeEnhancers(applyMiddleware(thunk))
	);

	// expose store to console
	window.store = store;
} else {
	var _store = createStore(
		loomAppReducer,
		applyMiddleware(thunk)
	);
}

export const store = _store;
