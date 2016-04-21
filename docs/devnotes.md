
Deploying to the cloud
======================

We want to run several server and daemon processes in the cloud using containers. 
Here's what I've learned so far:

To set up gcloud for containers (especially: set gcloud defaults) 

	https://cloud.google.com/container-engine/docs/before-you-begin
	
To set gcloud defaults

	gcloud config set project linnarsson-lab
	gcloud config set compute/zone us-east1-c
	gcloud config set container/cluster container-cluster-2
	gcloud container clusters get-credentials container-cluster-2
	
To build a docker image

	cd python
	docker build -t gcr.io/linnarsson-lab/loom-server:v1 -f loom-server.dockerfile .
	
To add required Python libraries, edit requirements.txt

To push the image to Google Container Registry

	gcloud docker push gcr.io/linnarsson-lab/loom-server:v1
	
	# The parts are as follows:
	#	gcr.io			Hostname for the registry (don't change)
	#   linnarsson-lab	Cloud project name (no need to change)
	#	loom-server		The image name
	#	v1				The image tag (change when you make a new version)

To create a deployment

	kubectl run loom-server --image=gcr.io/linnarsson-lab/loom-server:v1 --port=5000

To list deployments and pods

	kubectl get deployments
	kubectl get pods
	

We need to attach a persistent disk, read-only so all containers can access it:

	http://kubernetes.io/docs/user-guide/volumes/#gcepersistentdisk



Development stack
=================

```
As of Dec 2015, this is the technology stack used for developing Loom


Editor
------

Sublime Text 3
Babel package for JS and JSX files


Server (Python)
---------------

Anaconda Python distribution, using at least the following packages
	Scipy
	Numpy
	Flask web server
	h5py, HDF5 file I/O
	click					conda install click


Client (JavaScript)
-------------------

The client is built as a single-page app with React (UI) and Redux (state manegement). 
We use a build system to automatically compile JSX (and ES2015 syntax) to standard javascript, as well as
to resolve module dependencies, and package and minify everything.

The UI is built as a collection of React components, written as ES6 classes, one per file.

The UI uses Bootstrap for basic layout, Leaflet for the heatmap, and D3 for other visualizations.
Since D3 and React both take control of the DOM, we use approach #2 from here: http://ahmadchatha.com/writings/article1.html
Leaflet has the same issue, and is solved in the same way (see heatmap.js)


	Build system
	------------
	Node package manager (npm)						
	Browserify 										sudo npm install -g browserify
	Uglify JS 2 									sudo npm install -g uglify-js		[NOT the same as uglifyjs, note the hyphen!]
	Uglify CSS										sudo npm install -g uglifycss
	Babelify (https://github.com/babel/babelify)	npm install babelify
	Babel presets, es2015 and react 				npm install babel-preset-es2015 babel-preset-react


	Helper libraries
	----------------
	whatwg-fetch									npm install whatwg-fetch
	lodash											npm install lodash


	User interface
	--------------
	React 											npm install react
	Redux 											npm install redux
													npm install react-redux
													npm install redux-thunk
	Bootstrap										npm install bootstrap 				[Also get the CSS separately]
	Leaflet											npm install leaflet 				[Also get the CSS separately]
	Autoscale-canvas (for high-DPI screens)			npm install autoscale-canvas

```
