### Linnarsson Lab cloud architecture

This document summarizes the architecture, naming conventions etc. for Linnarsson Lab Cloud infrastructure. It's intended for 
developers, as well as for users of it (i.e. people analyzing data).

#### Overview

The Linnarsson Lab Cloud serves the following purposes:

* Primary long-term safe data storage (e.g. fastq files)
* Analysis pipelines:
  * For single-cell RNA-seq, converting fastq reads to expression matrices
  * Preparing .loom files from raw expression matrices
  * BackSPIN clustering on demand
  * Bayesian regression on demand
* Fast ad-hoc querying of the entire annotated (and growing) dataset
* Visual browsing of annotated subsets of the data (.loom files)
* Uploading custom annotations
* Delivering data from the core facility to customers

#### What's being stored?

* Sample management information such as chips, samples, tissues, animals, etc.
* Raw sequence data in ```fastq``` format
* Aligned read profiles (per cell) as wiggles 
* Expression data as molecule counts and read counts
* Standard cell annotations and gene annotations
* User-defined cell and gene annotations (known as datasets)

A user-defined **dataset** is a set of cells and a set of genes, together with custom annotations.

Datasets are organized in **projects**, and a project may contain datasets from different species (or transcriptomes).

#### Where is it stored?

##### [...in Cloud Storage bucket ```linnarsson-lab-fastq```](https://console.cloud.google.com/storage/browser/linnarsson-lab-fastq/?project=linnarsson-lab)
Gzip-compressed .fastq files are stored in Cloud Storage with key equal to the fastq filename. For example, ```Run00125_L1_1_160303_D00415_0125_AC810UANXX.fq.gz```.

##### [...in Cloud SQL](https://console.cloud.google.com/sql/instances/linnarsson-mysql/overview?project=linnarsson-lab&duration=PT1H)

All sample metadata, raw expression data, transcriptomes etc. is stored in MySQL. This is the single point of truth (SPOT)
from which all other data can be (re)derived. Currently, this is the MySQL instance at Sanger, but may be migrated to
Google Cloud SQL in the future.

##### [...in BigQuery](https://bigquery.cloud.google.com/queries/linnarsson-lab)
Queryable expression data is stored in our BigQuery project ```linnarsson-lab```, split by transcriptome build. For example, 
**mm10_sUCSC** holds all expression data that's been analyzed against the mm10 mouse genome with single UCSC gene models. 
These tables are regenerated as needed when new data arrives. There are four main tables:

  * Cells (cell annotations)
  * Genes (gene annotations)
  * Matrix (expression counts)
  * Wiggle (alignment counts per chromosome position, exlcuding zeros)
  
User-defined **datasets** are also stored in BigQuery. Each dataset is defined by two tables:

  * ```Cells:project@dataset.loom```
  * ```Genes:project@dataset.loom```

...where *project* and *dataset* are names selected by the user. The ```Cells:...``` table must have column ```CellID``` and 
the ```Genes:...``` table must have a column ```TranscriptID```. The dataset can be materialized by joining these tables
to the main tables (**Cells**, **Genes** and **Matrix**) for the transcriptome. 

##### [...in Cloud Storage bucket ```linnarsson-lab-loom```](https://console.cloud.google.com/storage/browser/linnarsson-lab-loom/?project=linnarsson-lab)
Loom files prepared for browsing are stored in Cloud Storage with key equal to the fully qualified dataset name, e.g. ```myProject@my_dataset.loom``` 
(note that the name includes the project name ```myProject``` and the dataset name ```my_dataset.loom```).

