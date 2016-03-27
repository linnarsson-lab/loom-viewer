#
# Functions to manage .loom files in the cloud
#
# 	- upload dataset definition tables to BigQuery
#	- schedule .loom file for (re)creation
#	- when scheduled, create .loom file in Cloud Storage 
#		- collect standard and custom attributes (deal with duplicates; check for required attrs)
#		- create the main matrix
#		- cluster by BackSPIN V2 (unless already in the annotation)
#		- perform PCA and tSNE (unless already in the annotation)
#		- calculate standard properties (unless already in the annotation)
#			_Total_RNA, _Total_Genes, _Total_MT, _Fraction_MT, 
#		- infer cellular states
#			_CellCyclePhase, _Female, _Class, _IEG, ...
#

from __future__ import division
import numpy as np
import os.path
import os
import __builtin__
import time
import loom
import tempfile
import re
import uuid
from gcloud import bigquery

_dataset_pattern = "^[A-Za-z0-9_-]+@[A-Za-z0-9_-]+.loom$"
_cloud_project = "linnarsson-lab"
_bucket = "linnarsson-lab-loom"

def upload(genome, dataset, cell_attrs = None, gene_attrs = None):
	"""
	Upload a custom dataset annotation to BigQuery.

	Args:
		genome (str):		Name of the genome build (e.g. 'mm10' or 'hg19' or 'vega64')
		dataset (str):		A full loom dataset name (e.g. 'Myproject@somedataset.loom')
		cell_attrs (dict):	Optional dictionary of cell annotations
		gene_attrs (dict): 	Optional dictionary of gene annotations

	Returns:
		Nothing

	At least one of cell_attrs or gene_attrs must be given. Both are dictionaries where the keys are attribute 
	names and the values are numpy arrays (of the same length). The 'CellID' (integer) field is required for
	cell_attrs, and the 'TranscriptID' (integer) is required for gene_attrs.

	"""
	# Check that the input is valid
	if not re.match(_valid_pattern, name):
		raise ValueError, ("Invalid dataset name '%s' (should match '%s')." % (name, _dataset_pattern))
	if cell_attrs != None:
		if not cell_attrs.__contains__("CellID"):
			raise ValueError, "'CellID' attribute is missing from cell_attrs."
		if cell_attrs["CellID"].dtype.kind != 'i':
			raise ValueError, "'CellID' attribute is not of type INTEGER."
	if gene_attrs != None:
		if not gene_attrs.__contains__("TranscriptID"):
			raise ValueError, "'TranscriptID' attribute is missing from gene_attrs."
		if gene_attrs["TranscriptID"].dtype.kind != 'i':
			raise ValueError, "'TranscriptID' attribute is not of type INTEGER."

	# Send the dataset to BigQuery
	if cell_attrs != None:
		print "Uploading cell annotations"
		self._export_attrs_via_csv(cell_attrs, "Cells:" + dataset)
	if gene_attrs != None:
		print "Uploading gene annotations"
		self._export_attrs_via_csv(gene_attrs, "Cells:" + dataset)

def _export_attrs_via_csv(attrs, genome, tablename):
	"""
	Export a set of attributes to a table in BigQuery.

	Args:
		attrs (dict): 		A dictionary of attributes. Keys are attribute names. Values are numpy arrays, all the same length.
		genome (str):		Name of the genome build (e.g. 'mm10' or 'hg19' or 'vega64')
		tablename (str): 	Name of the BigQuery table (e.g. 'Cells:Myproject@somedataset.loom')

	Returns:
		Nothing
	"""
	fields = attrs.keys()
	formats = []
	schema = []
	for ix in xrange(len(fields)):
		kind = attrs[fields[ix]].dtype.kind
		if kind == "S" or kind == "U":
			formats.append("%s")
			schema.append(SchemaField(fields[ix], 'STRING', mode='required'))
		elif kind == "b":
			formats.append("%s")
			schema.append(SchemaField(fields[ix], 'BOOLEAN', mode='required'))
		elif kind == "f":
			formats.append("%f")
			schema.append(SchemaField(fields[ix], 'FLOAT', mode='required'))
		elif kind == "i" or kind == "u":
			formats.append("%d")
			schema.append(SchemaField(fields[ix], 'INTEGER', mode='required'))

	(csvfile, fname) = tempfile.mkstemp(".csv")
	csvwriter = csv.writer(csvfile, delimiter=',', quoting=csv.QUOTE_MINIMAL)
	n = attrs[attrs.keys()[0]].shape[0]
	for ix in xrange(n):
		row = []
		for a in xrange(len(fields)):
			row.append(formats[a] % (attrs[fields[a]][ix]))
		csvwriter.writerow(row)
	csvfile.close()
	schema = ",".join(bqtypes)

	client = bigquery.Client(project=_cloud_project)
	bq_dataset = client.dataset(genome)
	table = bq_dataset.table(name=tablename)
	table.schema = schema
	with open(fname, 'rb') as csv_file:
		table.upload_from_file(csv_file, CSV, create_disposition='CREATE_IF_NEEDED')
	os.remove(fname)

class LoomPipeline(object):
	def __init__():
		pass

	# Check for work, then sleep a little, for ever
	def run():
		time.sleep(60*10)

	# dataset is a fully-qualified name like "MyProject@some_dataset.loom"
	def assemble_loom(dataset):
		# 1. SQL join the custom attributes with the standard attributes
		# 1.1. For cells
		# 1.2. For genes
		# 1.3. For the main matrix
		ra = {}
		ca = {}
		m = {}
		(f, fname) = tempfile.mkstemp(".loom")
		f.close() 
		loom = loom.create(fname, m, ra, ca)

		print "Creating landscape view:"
		if not self.col_attrs.has_key("_tSNE1"):
			self.feature_selection(10000)
			self.project_to_2d()
		print "Creating heatmap."
		if not self.file.__contains__('tiles'):
			self.dz_get_zoom_image(0,0,8)
		print "Done."

	# Set the status of analysis for this dataset
	# status is a dict {"Message": "...", "Failes": True/False, "Details": "..."}
	def set_status(dataset, status):
		# Set this by placing a json in the bucket
		pass

if __name__ == '__main__':
	print "Starting the Loom pipeline..."
	lp = LoomPipeline()
	lp.run()
