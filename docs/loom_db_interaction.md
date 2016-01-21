
#### Meeting notes Peter & Sten 20160113

Nightly updates (when there are diffs) of all datasets under loom_repo/public/.
This involves updating data matrix, attributes, clusterings...
Older versions of dataset .loom files are kept, identified by a date.

A dataset is defined in database GUI by include/exclude-criteria for cell properties and cell attributes.
The dataset .json definition can only be edited by its owner and then implicitly rerun at save.

##### Directory structure

The repository is divided into a public section and user-specific sections. The public section contains a number of Projects, 
which represents collections of datasets that belong together. For example, a project may contain mouse and human
data from the same tissue in separate datasets. The user-specific sections contain public (visible to all) and private (visible 
to the user only) folders, each of which contain projects, which contain datasets. 

	loom_repo/
		new_attributes/  # User exported new cell attributes - see below
		public/   # Nightly updates when new data or cell attributes are available
			proj_ALL/
				dataset_ALL/
			proj_midbrain/
				dataset_midbrain_mouse_embryo/
				dataset_midbrain_mouse_adult/
				dataset_midbrain_human_embryo/
			proj_cortex/
			
		gioele/  # A dataset in here is only updated when requested by Gioele
			public/
				proj_midbrain/
					dataset_midbrain_annot_level2/
			private/
				proj_midbrain/
					dataset_midbrain_annot_level2_test/

	Inside a project dir:
		midbrain_mouse_embryo_rev12.loom 	# File in .loom format (revision 12)
		midbrain_mouse_embryo_rev12.json	# Metadata and definition of the dataset
		midbrain_mouse_embryo_rev11.loom 	# File in .loom format (revision 12)
		midbrain_mouse_embryo_rev12.json	# Metadata and definition of the dataset
		...


##### Nightly builds

The public part of the repository is rebuilt nightly. This ensures that attributes that have been added are 
incorporated into the public projects. Users can work with their private datasets, and can submit new
attributes to be saved in the main database (see below). Users can only read/browse the public datasets,
but cannot change them. They can make a private copy to work with.

Public datasets are created by creating a new dataset definition (.json) file and placing it in a public 
folder. 

##### Creating new attributes and saving them in the MySQL database

A user can create a new attribute in the loom browser and decide to export it to the database.
Attributes are never replaced. If exporting with an existing name, a new version number may be attached.

On export, an attribute definition file (.json) is deposited into the 'new_attributes' directory.
This directory is regularly scanned and data imported by the database machinery.
This file should contain descriptions for each class abbrev, and the attribute creator should be included, something like:

	{
	  "attribute" : "midbrain_celltype",
	  "creator" : "gioele",
	  "classes" : { "int1" : "my favorite interneuron type",
	                 ..... },
	  "cellids" : {"1772-099-103_H02": "int1",
	  		...... }
	}

#### Example dataset definition

{
	"dataset": {
		"metadata": {
			"creator": "Peter",
			"created": "2016-01-21",
			"description": "Test dataset"
		},
		"data": {
			"cell": [{
				"step": "add",
				"attribute": "chip",
				"labels": ["1772099-293", "1772099-294"]
			}, {
				"step": "restrict",
				"attribute": "celltype_level2",
				"labels": ["neuro2"]
			}, {
				"step": "exclude",
				"attribute": "green",
				"value": "0"
			}, {
				"step": "exclude",
				"attribute": "area",
				"value": "..10.0"
			}, {
				"step": "add",
				"attribute": "cellid",
				"labels": ["1772099-113_A01", "1772099-114_B02"]
			}],
			"transcript": [{
				"step": "exclude",
				"attribute": "chromsome",
				"labels": ["CTRL"]
			}]
		},
		"attributes": {
			"cell": {
				"include": ["diameter", "area", "chip", "sex"]
			},
			"transcript": {
				"exclude": ["length", "chromosome"]
			}
		}
	}
}
