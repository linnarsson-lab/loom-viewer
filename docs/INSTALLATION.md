## Installation

You can choose between installation through PyPi, or build `loom-viewer` from source.


### Installing through pip

1. Install the Python 3.x version of [Anaconda](https://www.continuum.io/downloads). 

**Note: loompy and loom-viewer only work with Python 3**

2. Open a terminal. 

Windows users: open `Programs > Anaconda 3 > Anaconda Promp`.

3. Install Loom with the following command:

```bash
pip install loompy
pip install loom-viewer
```

Tip: Loom is under development and updated often. To ensure you have the latest version, do this:

```bash
pip install -U loom-viewer
```

### Installing from source

1. Install the Python 3.x version of [Anaconda](https://www.continuum.io/downloads). 

**Note: loompy and loom-viewer only work with Python 3**

2. If you haven't already, install [`loompy`](https://github.com/linnarsson-lab/loompy), either from source or through PyPI:

```bash
pip install loompy
```
3. Install [node.js](https://nodejs.org/en/)

4. Clone this repository with git

```
git clone https://github.com/linnarsson-lab/loom-viewer.git
```

5. Navigate to the newly created `loom-viewer` folder, and install all required node packages:

```bash
npm install
```

6. Run the build script. On Mac/Linux:

```bash
./build
```

On Windows:
```powershell
build
```

To build the production version, type:

```bash
./build prod
```

Tip: when developing, you only modified the Python code, and want to skip building the client side, type:

```bash
./build_egg
```

### The Loom CLI tool

After installation, you should have access to the `loom` CLI from the terminal (*"Anaconda Prompt"* on Windows). Test if everything works correctly by typing:

```bash
loom version
```

To learn more about the loom tool, type:

```bash
loom --help
```

For help with individual commands, just type:

```bash
loom [command] --help
```

### Getting started with the viewer

To open the Loom Viewer locally, type in `loom` without any extra flags:

```bash
loom
```

This will start a local server, and automatically open `localhost:8003` in your default browser. Since this is the first time running the tool, it will fail to find any datasets, showing an empty list and an error message about fetch being broken on Safari (we are working on that one).

Close the server for now (CTRL+C on Linux/Windows, CMD+C on Mac).

To view our Loom files, we have to go through the following steps:

1. Store the Loom files in a directory where the viewer can find it
  a. (optional) To see heatmap tiles, generate them with `loom tile <loom filename>`
  b. (optional) To quickly access gene expression data, pre-expand the rows with `loom expand -r <loom filename>`
2. Start the loom server, or if it is already running, refresh the page

#### Where the server looks for Loom files

The first time you run `loom`, a `loom-datasets` folder will be created in your home folder. This is where the `loom-viewer` server looks for Loom files by default.

You can explicitly point the loom CLI to a different path with `loom --dataset-path <your path here>`

The dataset folder is organised in *projects*. These are sub-folders in the root dataset folder. Folders represent individual projects. The Loom files are stored in these project folders: (all other files are ignored)


```bash
~/
├─ loom-datasets/
.  ├─ # Project 1 (folder)
   │  ├─ # dataset1.loom (loom file)
   │  └─ # dataset2.loom (loom file)
   └─ # Project 2 (folder)
      ├─ # dataset3.loom (loom file)
      └─ # dataset4.loom (loom file)
```

Either create a Loom file with [`loompy`](https://github.com/linnarsson-lab/loompy), or download one from a loom viewer hosted on-line.

For this example, we will use the `Cortex.loom` data set, containing data from [one of our papers](http://science.sciencemag.org/content/347/6226/1138). First, go to Linnarsson Lab's [loom.linnarssonlab.org](http://loom.linnarssonlab.org/), and search for `Cortex.loom`:

![Cortex](Dataset%20List%20Cortex.png)

If you want, you can open it now and browse it on-line!

On the right you can see a cloud icon [that links to the original loom file](http://loom.linnarssonlab.org/clone/Published/Cortex.loom). Right-click and save the file to an appropriately labeled project folder in the `loom-datasets` folder:

```bash
~/
├─ loom-datasets/
.  ├─ Linnarsson Lab
   .  └─ Cortex.loom
```

Once we start a local loom server (see below) and open `localhost:8003`, the resulting view should be a single project, `Linnarsson Lab`, with a single loom file, `Cortex.loom`. Opening it should give the same results as the on-line versoin.

### Generating heatmap tiles with `loom tile`

By default, the server generates and caches the metadata, attributes, and individual rows and columns as they are requested (see below).

However, to view a heat map of the entire data matrix, the associated image tiles must be pre-generated from the Loom file *(the reason we do not do this on-the-fly is that generating tiles requires iterating over all the data in a Loom file. For bigger files is so slow that it would freeze the system if done while running a server)*.

**Note: try to avoid running a server at the same time you generate tiles, as this can lead to unexpected HDF5 behaviour due to multiple programs accessing the same file at once.**

Tile generation is done through the `loom tile` command. For a list of possible flags, type `loom tile --help`:

```
usage: loom tile [-h] [--project [PROJECT [PROJECT ...]]] [-A] [-t]
                 [file [file ...]]

positional arguments:
  file                  Loom file(s) to expand. Expands all files matching the
                        provided file names. To avoid this, use an absolute
                        path to specify a single file.

optional arguments:
  -h, --help            show this help message and exit
  --project [PROJECT [PROJECT ...]]
                        Project(s) for which to expand all files.
  -A, --all             Expand all loom files.
  -t, --truncate        Remove previously expanded tiles if present (False by
                        default)
```

Note that the `loom tile` command will automatically search _all_ projects for _all_ matching file names, and generate tiles for each. Using unique file names is encouraged!

Examples:

```bash
# Generate tiles for all files named `Cortex.loom` or `Cortex_allgenes.loom
loom tile Cortex.loom Cortex_allgenes.loom

# Generate tiles for `/home/me/loom-datasets/Published/Cortex.loom`
# on Windows, this would be something like:
# loom tile C:\Users\Job van der Zwan\loom-datasets\Published\Cortex.loom
loom tile /home/me/loom-datasets/Published/Cortex.loom

# Generate tiles for all files in the `Published` project:
loom tile --project Published
```

**Note: the tiles are _not_ automatically updated when changing data in a loom file, meaning the viewer may show the old data! To fix this, re-do this step with the added -t flag:**

```bash
# -t for "truncate", telling loom to overwrite the old files
loom tile -t [filenames and project folders]
```

Because generation can be slow for larger Loom files, the command checks if the relevant `<filename>.loom.tile` subfolder exists, skipping generation if it does. This means that if the tile command is aborted without finishing, the remaining tiles will not be added when running `loom tile` again! To override this, run: `loom tile -t <filename.loom>`. Alternatively, delete the subfolder in question.

### Pre-generating/updating JSON files for metadata, attributes and rows with `loom expand`

Similar to pre-generating image tiles, is possible to pre-generate all metadata, like attributes and gene rows, for a Loom file. This step used to be mandatory, but now the server generates the required JSOn on the fly.

There are two situations in which this is still relevant.

First, if you change data in a loom file, previously generated JSON files for that data becomes outdated. Currently the loom server cannot detect this change, so the JSON files have to manually be updated.

Second, because opening and closing an HDF5 connection gets slower as file-size increases, this may still be useful when serving very large loom files on-line.

For either of these scenarios we use the `loom expand` command.

```
usage: loom expand [-h] [--project [PROJECT [PROJECT ...]]] [-A] [-C] [-t]
                   [-m] [-a] [-r] [-c]
                   [file [file ...]]

positional arguments:
  file                  Loom file(s) to expand. Expands all files matching the
                        provided file names. To avoid this, use an absolute
                        path to specify a single file. When combined with
                        --clear it clears all expanded files instead.

optional arguments:
  -h, --help            show this help message and exit
  --project [PROJECT [PROJECT ...]]
                        Project(s) for which to expand all files (or clear
                        expansion with --clear).
  -A, --all             Expand all loom files (or clear expansion with
                        --clear).
  -C, --clear           Remove previously expanded files.
  -t, --truncate        Replace previously expanded files if present (False by
                        default). Only does something in combination with
                        expansion (-m, -a, -r or -c).
  -m, --metadata        Expand metadata (False by default)
  -a, --attributes      Expand attributes (False by default)
  -r, --rows            Expand rows (False by default)
  -c, --cols            Expand columns (False by default)
```

It is nearly identical to the `loom tile` command, except that we also need to specify whether we want to generate JSON files for metadata, attributes, rows and/or columns.

Examples:
```bash
# Generate JSON for metadata, attributes and rows
# for all files named `Cortex.loom` or `Cortex_allgenes.loom,
# and overwrite ay previous JSON files encountered
loom expand -mart Cortex.loom Cortex_allgenes.loom

# Generate attributes JSON files for /home/me/loom-datasets/Published/Cortex.loom
# on Windows, this would be something like:
# loom expand -a C:\Users\Job van der Zwan\loom-datasets\Published\Cortex.loom
loom expand -a /home/me/loom-datasets/Published/Cortex.loom

# Generate row JSON files  for all files in the `Published` project:
loom expans -r --project Published
```