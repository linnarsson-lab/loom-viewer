
#### Meeting notes Peter & Sten 20160113

Nightly updates (when there are diffs) of all projects + the whole data set in central repo.
This involves updating data matrix, attributes, clusterings...
Older versions of project folders are kept, identified by a date.

A project is defined in database GUI by include-criteria for cells and exclude-criteria for cell-attributes.
The project definition can be edited by its owner and then implicitly rerun at save.

File structure:

	loom_repo/
		new_attributes/  # User exported new cell attributes - see below
		public/   # Nightly updates when new data or cell attributes are available
			proj_ALL/
			proj_midbrain/
			proj_cortex/
			
		gioele/  # A project is only updated when requested by Gioele
			public/
				proj_midbrain/
			private/
			
	Inside a project dir:
				proj_def.xml  # Current definition, only needed in common public directory
				20160113/
					proj_def.xml  # Definition used for this build
					col_attrs/  # One attribute has to be cell-id  (1772-099-183_A01)
					row_attrs/
					h5 and images...

Or maybe like this (Sten):

	loom_repo/
		new_attributes/  # User exported new cell attributes - see below
		public/   # Nightly updates when new data or cell attributes are available
			proj_ALL/
			proj_midbrain/
			proj_cortex/
			
		gioele/  # A project is only updated when requested by Gioele
			public/
				proj_midbrain/
			private/
			
	Inside a project dir:
				proj_def.xml  		# Current definition, only needed in common public directory
				20160113.loom 		# File in HDF5 format with the following content:
					/matrix		# The main data matrix with genes in rows and cells in columns
					/proj_def.xml  	# Definition used for this build
					/col_attrs/	# Column attributes as either float32 or string
						CellID	# One attribute has to be cell-id ("1772-099-183_A01")
					/row_attrs/
					/tiles/
						Precomputed images...
				20160111.loom 		# Previous file version
				20160102.loom 		# Even older file version
					
A user can create a new attribute in the loom browser and decide to export it to the database.
Attributes are never replaced. If exporting with an existing name, a new version number may be attached.

On export, an attribute definition file (JSON?) is deposited into the 'new_attributes' directory.
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
