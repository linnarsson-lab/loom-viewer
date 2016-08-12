
## The `loom` command-line tool

```
usage: loom [-h] [--debug] [--dataset-path DATASET_PATH]
            {server,list,put,clone,project,tile,stats,backspin,from-cef,from-cellranger,from-sql}
            ...

Loom command-line tool.

optional arguments:
  -h, --help            show this help message and exit
  --debug
  --dataset-path DATASET_PATH
                        Path to datasets directory (default: /Users/Sten/loom-
                        datasets)

subcommands:
  {server,list,put,clone,project,tile,stats,backspin,from-cef,from-cellranger,from-sql}
    server              Launch loom server (default command)
    list                List datasets
    put                 Submit dataset to remote server
    clone               Clone a remote dataset
    project             Compute non-linear projection to 2D
    tile                Precompute heatmap tiles
    stats               Compute standard aggregate statistics
    backspin            Perform clustering using BackSPIN
    from-cef            Create loom file from data in CEF format
    from-cellranger     Create loom file from data in cellranger format
```

There are three global arguments, `--help`, `--debug` and `--dataset-path`. Note that global arguments
must precede the subcommand, e.g. `loom --debug list ...`. The exception is `--help` which can also be
placed after a subcommand, to get help on that command: `loom list --help`.

### Common settings

#### Dataset folder

The Loom browser assumes that your `.loom` files are placed in a standard folder. By default, this 
folder is `loom-datasets` in your home directory. To use a different location, you must provide 
the full path using the `--dataset-path` argument. Alternatively, you can set the `LOOM_PATH` environment
variable.

Your datasets folder must be organized into subfolders that represent projects. For example:

```
~/loom-datasets/
   cortex-zeisel-science-2015/
      cortex.loom
   midbrain-lamanno/
      Midbrain_ES_differentiation.loom
      Midbrain_Human_embryo.loom
      Midbrain_iPSC.loom
      Midbrain_Mouse_embryo.loom
```

#### Authorization

When working with a remote server, some operations require authorization using `--username` and `--password`. 

#### Debugging

The `--debug` flag causes `loom` to print more verbose status information during processing. This can be useful
to understand what is happening when things go wrong.  

### `loom`

Invoking `loom` without arguments is equivalent to:

```
loom server --show-browser --port 8803
``` 

This starts the server listening on port 8003, launches the standard web browser and loads the Loom browser. 

### `loom server`

Launch a Loom web server and start listening for incoming connections.

```
usage: loom server [-h] [--show-browser] [-p PORT]

optional arguments:
  -h, --help            show this help message and exit
  --show-browser        Automatically launch browser
  -p PORT, --port PORT  Port (default: 80)
```

Note: if you want to bind to a privileged port (<1024), you may need to invoke `loom` as root or using `sudo`.

### `loom list`

List all datasets available locally, or on a remote server. If you do not provide authorization (`--username` and 
`--password`), only public projects will be shown.

```
usage: loom list [-h] [--server SERVER] [-u USERNAME] [-p PASSWORD]

optional arguments:
  -h, --help            show this help message and exit
  --server SERVER       Remote server hostname
  -u USERNAME, --username USERNAME
                        Username
  -p PASSWORD, --password PASSWORD
                        Password
```

Example:

```bash
$ loom list --server myserver.org
cortex-zeisel-science-2015:
   cortex.loom
midbrain-lamanno:
   Midbrain_ES_differentiation.loom
   Midbrain_Human_embryo.loom
   Midbrain_iPSC.loom
   Midbrain_Mouse_embryo.loom
```

### `loom put` (**not yet implemented**)

Submit a dataset to a remote server. This requires authorization for the specific project on
the remote server.

```
usage: loom put [-h] --project PROJECT --server SERVER [-u USERNAME]
                [-p PASSWORD]
                file

positional arguments:
  file                  Loom file to upload

optional arguments:
  -h, --help            show this help message and exit
  --project PROJECT     Project name
  --server SERVER       Remote server hostname
  -u USERNAME, --username USERNAME
                        Username
  -p PASSWORD, --password PASSWORD
                        Password
```