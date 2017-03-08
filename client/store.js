import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import thunk from 'redux-thunk';

// import the root reducer
import loomAppReducer from './reducers/reducers';

export const store = createStore(
	loomAppReducer,
	composeWithDevTools(applyMiddleware(thunk))
);

// Allow access to the store from the console in debug build
if (process.env.NODE_ENV !== 'production') {
	window.store = store;
}