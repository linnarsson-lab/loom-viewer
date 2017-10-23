# Warning: heavily outdated documentation

# Loom

Loom is

* `.loom`, an efficient file format for large omics datasets
* `loompy`, a Python library for creating and working with data in `.loom` format.
* [deprecated] `loom`, a command-line tool for manipulating `.loom` files.
* `loom-viewer`, a web app for browsing large single-cell RNA-seq datasets

We recently split `loompy` into [a pure python package](https://github.com/linnarsson-lab/loompy) and a viewer.

This repository is the viewer part.

## Installation

1. Install [Anaconda](https://www.continuum.io/downloads). **Note: Loom only works with Python version 3.x.**

From here on out, you can choose to install through `pip`, or build `loom-viewer` from source. 

**Windows users:** for now, the only tested option is to build from source. For that you need a terminal that supports `git` and `bash` - We suggest using [cmdr](http://cmder.net/) to ease this process. You may want also to add Anaconda installation directly to your system PATH variable, so that you can run any Python scripts by simply typing `python`. See [this SO question](https://stackoverflow.com/a/4621277/3211791).

### Installing through pip


2. Install Loom:

```bash
pip install loom-viewer
```

Tip: Loom is updated often. To ensure you have the latest version, do this:

```bash
pip install -U loom-viewer
```

### Installing from source

1. Install [node.js](https://nodejs.org/en/)

2. Clone this repository

3. Open a terminal in the newly created `loom-viewer` folder, and run:

```bash
npm install
./build
```

## Getting started

### The Loom viewer

To open the viewer, run the `loom` tool without any arguments. This will default to starting the local server. It will automatically open `localhost:8003` in your default browser, and likely show a message that our usage of `fetch` is (somehow) broken on Safari (bug #121). The real reason is that the local server looks for loom files in `loom-datasets` and did not find any.

**Mac and Linux:**

After installation, open your terminal, and type:

```bash
loom
```

**Windows:** enter the folder where you cloned the `loom-viewer` repository and type:

```bash
cd python\loom_viewer
python loom
```
(this assumes you added the Anaconda installation directory to your path)

Alternatively, create a shortcut: right click on your desktop -> `New` -> `Shortcut`. On the line, type:

```powershell
<path to Anaconda installation>\python.exe <path to cloned `loom-viewer` repo>\python\loom_viewer\loom
```

Click `Next`, name the shortcut `Loom Viewer`, and finish the wizard. You can now double click this shortcut to start running the server and open the viewer.

### Where the server looks for Loom files

The first time you run `loom`, a `loom-datasets` folder will be created in your home folder. You can also explicitly point the `loom` tool to a different path with the following flag: `--dataset-path <your path here>`

This is where the `loom-viewer` server looks for Loom files by default. The root of `loom-datasets` is reserved for folders (everything else will be ignored), which represent individual projects. The project folders then store the loom files:

```bash
loom-datasets/
├── #Project 1 (folder)
│   ├── # dataset1.loom (loom file)
│   └── # dataset2.loom (loom file)
└── #Project 2 (folder)
    ├── # dataset1.loom (loom file)
    └── # dataset2.loom (loom file)
```

So to get started, either create a Loom file with [`loompy`](https://github.com/linnarsson-lab/loompy), or download it from [somewhere](https://loom.linnarssonlab.org/), then place it in the appropriate project folder.


Say that we have downloaded a `cortex.loom` file containing data about [some paper](http://science.sciencemag.org/content/347/6226/1138), and store it in a `Published` project folder like so:

```bash
loom-datasets/
└── Published
    └── cortex.loom
```

The resulting view should be something like:

![image](https://user-images.githubusercontent.com/259840/31838214-075f1cde-b5dc-11e7-898e-6c7fca4ba8ea.png)

### Viewing the heatmap and genes
Currently, only list and attribute metadata is generated on the fly; extracting data from a loom file through `h5py` was such a bottleneck that it made our loom-viewer server server crash on loads as high as a few dozen genes being requested at once. It also could not cope with multiple people accessing the same loom file.

So instead, this data needs to be pre-generated from the loom file for quick static serving. Heat map tiles, and gene expression values are "expanded" using CLI (we're planning to add this expansion to the web-interface, to be more accessible to people less familiar with the command line - see issue #114). 

After putting a loom file in the appropriate project folder as explained above, you can run the following commands from anywhere:

```bash
loom tile cortex.loom
loom expand -r cortex.loom
```

The output should look similar to this:

```bash
> loom tile cortex.loom

2017-10-20 21:39:31,680 - INFO - Found 1 projects
2017-10-20 21:39:31,680 - INFO - Entering project /home/job/loom-datasets/Published
2017-10-20 21:39:31,680 - INFO -   Connecting to cortex.loom at full path
2017-10-20 21:39:31,714 - INFO -     Precomputing heatmap tiles (stored in cortex.loom.tiles subfolder)

> loom expand -r cortex.loom

2017-10-20 21:15:02,688 - INFO - Found 1 projects
2017-10-20 21:15:02,688 - INFO - Entering project /home/job/loom-datasets/Published
2017-10-20 21:15:02,688 - INFO -   Connecting to cortex.loom at full path
2017-10-20 21:15:03,335 - INFO -     Expanding rows (stored in /home/job/loom-datasets/Published/cortex.loom.rows subfolder)
```

As you might have guessed, the `loom tile` and `loom expand` commands will automatically search all projects for _all_ matching file names, and expand each. Unique file names are therefore encouraged!

Because expansion can be slow for larger Loom files, the command checks if the relevant subfolder already exists and skips expansion if it does. Meaning that if you abort gene expansion halfway, the unexpanded genes will not be added if you try again. To force that, run: `loom expand -rt cortex.loom` (`t` for "truncate"), which generates newly expanded files for _all_ genes. Alternatively, delete the subfolder in question.

### Other uses of the `loom` command-line tool

To learn more about the `loom` tool, open your terminal, and type:

```bash
loom --help
```
