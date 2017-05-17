import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';

// import the root reducer
import loomAppReducer from './reducers/reducers';

const composeEnhancers = composeWithDevTools({
	// Specify here name, actionsBlacklist,
	// actionsCreators and other options if needed
});

export const store = createStore(
	loomAppReducer,
	composeEnhancers(applyMiddleware(thunk))
);

// Allow access to the store from the console in debug build
if (process.env.NODE_ENV !== 'production') {
	window.store = store;
}