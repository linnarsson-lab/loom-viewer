## FAQ

### The website is stuck with the message that fetch is broken on Safari, but I am not using Safari

The loom server cannot find any loom files, but the website mistakenly thinks it failed to fetch the list of loom files (which (for now) is guaranteed to happen on Safari anyway, hence the warning message).

See above for where and how to store your loom files so that the server can find them.

If this did not solve your problem, open an issue.

### There are no heatmap tiles in the viewer

If you have not done so yet, generate the tiles for the heatmap first with `loom tile <filename.loom>`. See above for more details.

If you _have_ done so but something went wrong, you can try again with `loom tile -t <filename.loom>`.

### Generating tiles fails with `ERROR - module 'scipy.misc' has no attribute 'toimage'`

It is likely that you are missing the required image library. This can happen if you use MiniConda, which has fewer default packages. Try installing it with `conda install pillow`.

### Why is pre-generation required for serving the metadata or viewing heatmap tiles data

There are two reasons for this:

First, h5py can not safely cope with multiple people accessing the same Loom file simultanously. This is not a problem when exploring loom files locally (unless you open the same loom file in multiple tabs), but when using the `loom-viewer` as a server to set up a website for sharing loom-files, two or more people opening the same loom files will cause the server to crash.

Second, loading the genes from the loom file and converting it to either JSON or a PNG is a fairly slow process. The viewer is mainly intended to explore and share finished loom files that do not change, making it wasteful to do this work multiple times. Serving pre-generated static files is thousands of times faster.

This limits the usefulness as an off-line viewer somewhat for now, but we have plans to make the server capable of detecting when you changed something in a loom file, and automatically update the data in question. This would make this process easier, but for now you have to manually trigger an update to the generated JSON files and image tiles when changing data in the a loom file.
