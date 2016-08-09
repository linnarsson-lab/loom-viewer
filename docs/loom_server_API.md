### API documentation for the Loom server

This page documents the internal API exposed by the Loom server, which serves REST requests to the Loom 
client running in the user's browser. The API is organized by endpoint relative to the root ```/```. All 
these endpoints are defined and handled in ```loom_server.py```.

##### Authorization

Requests can be accompanied by a Basic Auth header (username and password), which
will determine access to some resources (e.g. projects and datasets). If no auth
headers are provided, only public projects and datasets will be returned.

### Endpoints

##### ```GET /```
##### ```GET /datasets/*```
##### ```GET /view/*```

Returns the ```index.html``` file that loads all static assets and launches React client-side. Routing
is handled on the client based on the specific URL.
<hr/>

##### ```GET /static/css/{filename}```, ```GET /static/js/{filename}```, and ```GET /static/img/{filename}```

Static CSS, Javascript and image files, linked from the main ```index.html``` page.
<hr/>

##### ```GET /loom``` (list all datasets)

Returns a list of available datasets in JSON format, each a dictionary with two keys,
`project` and `filename`. 

Example:

```json
[
   {"project": "Midbrain", "filename": "midbrain_20160801.loom"},
   {"project": "Cortex", "filename": "astrocytes_final.loom"},
   {"project": "Cortex", "filename": "oligos_final.loom"}
]
```

The list of datasets returned is determined by the auth headers provided (if any).
<hr/>


##### ```GET /loom/{project}/{filename}``` (metadata for a single dataset)

Returns a JSON object with the following fields:

| Field            | Example values     |Comment |
|------------------|--------------------|--------|
| 'project'        | 'Midbrain'         |Project name (user-defined)|
| 'dataset'        | 'midbrain_23aug.loom'   |Filename|
| 'filename'        | 'midbrain_23aug.loom'   |Filename|
| 'shape'          | [24470,3005]       |Number of rows and columns|
| 'zoomRange'      | [8, 2, 18]         |(middle, min_zoom, max_zoom) for the heatmap|
| 'fullZoomHeight' | 312295             |Height in pixels of the heatmap image at full zoom|
| 'fullZoomWidth'  | 76348              |Width in pixels of the heatmap image at full zoom|
| 'rowAttrs'       | { ... }            |Dictionary of row (gene) attributes|
| 'colAttrs'       | { ... }            |Dictionary of column (cell) attributes|

(the *dataset* field is the same as the *filename*, kept for backwards compatibility)

If the dataset is not found, or is not available based on auth headers, the call
returns 404 Not Found.
<hr/>

##### ```GET /clone/{project}/{filename}``` (download the loom file)

Returns the .loom file in binary form.
</hr>

##### ```GET /loom/{project}/{filename}/row/{row}``` (a single row)

Returns a JSON list of `float32` values for the requested row.

If the dataset is not found, or is not available based on auth headers, the call
returns 404 Not Found.
<hr/>

##### ```GET /loom/{project}/{filename}/col/{col}``` (a single column)

Returns a JSON list of `float32` values for the requested column.

If the dataset is not found, or is not available based on auth headers, the call
returns 404 Not Found.
<hr/>

##### ```GET /loom/{project}/{filename}/tiles/{zoom_level}/{x}_{y}.png``` (a heatmap tile)

Returns a PNG image of 256x256 pixels for the given x, y and zoom level.

If the dataset is not found, or is not available based on auth headers, the call
returns 404 Not Found.
<hr/>
