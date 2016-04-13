### API documentation for the Loom server

This page documents the internal API exposed by the Loom server, which serves REST requests to the Loom 
client running in the user's browser. The API is organized by endpoint relative to the root ```/```. All 
these endpoints are defined and handled in ```loom_server.py```.

#### 1. GET requests

##### ```GET /```

Returns the ```index.html``` file that loads all static assets and launches React client-side.
<hr/>

##### ```GET /css/{filename}```, ```GET /js/{filename}```, and ```GET /img/{filename}```

Static CSS, Javascript and image files, linked from the main ```index.html``` page.
<hr/>

##### ```GET /loom``` (list all datasets)

Returns a list of available datasets in JSON format, each with the following fields:

| Field            | Example values     |Comment |
|------------------|--------------------|--------|
| 'transcriptome'  | 'hg19_sUCSC'       |The transcriptome against which the data was analyzed|
| 'project'        | 'Midbrain'         |Project name (user-defined)|
| 'dataset'        | 'midbrain_23aug'   |Dataset name (unique for this dataset and project)|
| 'status'         | 'created', 'creating', 'done', 'unknown' or 'error'|Current state of Loom file creation|
| 'message'        | 'Clustering...'    |Human-readable status message|
| 'n_features'     | 1000               |Number of features (genes) to use for clustering|
| 'cluster_method' | 'AP' or 'BackSPIN' |'AP' is Affinity Propagation|
| 'regression_label'| '_Cluster'        |Label (attribute) to use for regression analysis|

**Note:** transcriptome, project and dataset are restricted to letters, numbers and underscore, but no double underscore.

**Note:** these fields are defined and created in ```loom_cloud.py``` (the ```DatasetConfig``` class).
<hr/>

##### ```GET /loom/{transcriptome}__{project}__{dataset}/fileinfo.json``` (metadata for a single dataset)

Returns a JSON object with the following fields:

| Field            | Example values     |Comment |
|------------------|--------------------|--------|
| 'transcriptome'  | 'hg19_sUCSC'       |The transcriptome against which the data was analyzed|
| 'project'        | 'Midbrain'         |Project name (user-defined)|
| 'dataset'        | 'midbrain_23aug'   |Dataset name (unique for this dataset and project)|
| 'shape'          | [24470,3005]       |Number of rows and columns|
| 'zoomRange'      | [8, 2, 18]         |(middle, min_zoom, max_zoom) for the heatmap|
| 'fullZoomHeight' | 312295             |Height in pixels of the heatmap image at full zoom|
| 'fullZoomWidth'  | 76348              |Width in pixels of the heatmap image at full zoom|
| 'rowAttrs'       | { ... }            |Dictionary of row (gene) attributes|
| 'colAttrs'       | { ... }            |Dictionary of column (cell) attributes|

<hr/>

##### ```GET /loom/{transcriptome}__{project}__{dataset}/row/{row}``` (a single row)

Returns a JSON list of integer datapoints for the requested row.
<hr/>

##### ```GET /loom/{transcriptome}__{project}__{dataset}/col/{col}``` (a single column)

Returns a JSON list of integer datapoints for the requested column.
<hr/>

##### ```GET /loom/{transcriptome}__{project}__{dataset}/tiles/{zoom_level}/{x}_{y}.png``` (a heatmap tile)

Returns a PNG image of 256x256 pixels for the given x, y and zoom level.
<hr/>


#### 2. PUT requests

##### ```PUT /loom/{transcriptome}__{project}__{dataset}```

Create a new dataset. Required ```multipart/form-data``` fields:

| Field            |Comment |
|------------------|--------|
|'col_attrs'       | CSV string of column attributes|
|'row_attrs'       | CSV string of row attributes|
|'config'          | JSON string as above |

**Note:** The config JSON follows the syntax defined above for ```GET /loom```.

**Note:** ```col_attrs``` must contain the attribute ```CellID``` of integer type, and ```row_attrs``` must contain the 
attribute ```TranscriptID``` of type integer. However, in borth cases, if strings are supplied instead of integers, they will
be converted to integers by looking up official gene symbols (row_attrs) or cell identifier based on chip and well
(col_attrs). For example, TranscriptIDs can be 'Actb', 'Bdnf', and CellIDs can be '1772067-089_A01'.

The result of the call will be the creation of a new dataset with status ```'created'```. The config will be stored as
```{transcriptome}__{project}__{dataset}.json``` in Google Cloud Storage, but there will be no Loom file immediately.
Instead, the uploaded row and column attributes will trigger the creation of a Loom file, and once this is 
complete, the status will change to ```'done'```.

If the dataset already exists, it will be overwritten and recreated.


#### 3. DELETE requests (not yet implemented)

##### ```DELETE /loom/{transcriptome}__{project}__{dataset}```

Remove the indicated dataset completely. The action cannot be undone.

