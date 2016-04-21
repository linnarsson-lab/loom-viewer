# Copyright (c) 2016 Sten Linnarsson
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# * Redistributions of source code must retain the above copyright notice, this
#   list of conditions and the following disclaimer.
#
# * Redistributions in binary form must reproduce the above copyright notice,
#   this list of conditions and the following disclaimer in the documentation
#   and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.



from __future__ import division
import numpy as np
import os.path
import os
import __builtin__
import time
import loom
from loom_backspin import BackSPIN
from loom_cloud import DatasetConfig
import tempfile
import re
import uuid
from gcloud import bigquery
from gcloud import storage
import pymysql
import pymysql.cursors
import csv
import pandas as pd
from sklearn.cluster.affinity_propagation_ import affinity_propagation

_dataset_pattern = "^[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$"
_cloud_project = "linnarsson-lab"
_bucket = "linnarsson-lab-loom"


class MySQLToBigQueryPipeline(object):
	"""
	Pipeline to load cell expression data from MySQL into BigQuery, organized by transcriptome.
	"""
	def __init__(self):
		self.mysql_connection = pymysql.connect(
			host=os.environ['MYSQL_HOST'], 
			port=os.environ['MYSQL_PORT'], 
			user=os.environ['MYSQL_USERNAME'], 
			password=os.environ['MYSQL_PASSWORD'], 
			db='joomla', 
			charset='utf8mb4')

	def _make_std_numpy_type(self, array, sql_type):
		field_type = {
			  0: "float",
			  1: "int",
			  2: "int",
			  3: "int",
			  4: "float",
			  5: "float",
			  6: "string",
			  7: "string",
			  8: "string",
			  9: "int",
			 10: "string",
			 11: "string",
			 12: "string",
			 13: "int32",
			 14: "string",
			 15: "string",
			 16: "int",
			246: "int",
			247: "string",
			248: "string",
			249: "string",
			250: "string",
			251: "string",
			252: "string",
			253: "string",
			254: "string",
			255: "string" 
		}
		try:
			return np.array(array).astype(field_type[sql_type])
		except:
			# So there might be some Nones, we need to fix that
			temp = np.array(array)
			temp[temp == np.array(None)] = 0
			return temp.astype(field_type[sql_type])

	def rebuild_bigquery(self, transcriptome):
		"""
		Rebuild the main BigQuery tables (Cells, Genes and Counts) for the given transcriptome.

		Args:
			transcriptome (str): 	The transcriptome to rebuild (e.g. 'mm10a_aUCSC')

		Returns:
			Nothing.

		This function downloads all raw data from MySQL, and uploads it to BigQuery. 
		"""
		connection = self.mysql_connection

		# Connect to BigQuery
		client = bigquery.Client(project=_cloud_project)
		bq_dataset = client.dataset(transcriptome)
		if not bq_dataset.exists():
			bq_dataset.create()

		# Get the transcriptome ID
		try:
			cursor = connection.cursor()
			cursor.execute('SELECT ID from jos_aaatranscriptome WHERE name = %s', transcriptome)
			transcriptome_id = cursor.fetchone()[0]
		except:
			raise ValueError, ("Could not find transcriptome ID for '%s'" % transcriptome)
		cursor.close()

		# Download gene annotations
		cursor = connection.cursor()
		cursor.execute("""
			SELECT * FROM cells10k.Transcript
			WHERE TranscriptomeID = %s
			AND Type <> "repeat"
			ORDER BY ExprBlobIdx
		""", transcriptome_id)
		transcriptome_headers = map(lambda x: x[0],cursor.description)
		rows = cursor.fetchall()
		row_attrs = {}
		for i in xrange(len(transcriptome_headers)):
			row_attrs[transcriptome_headers[i]] = []
			for j in xrange(len(rows)):
				row_attrs[transcriptome_headers[i]].append(rows[j][i])
		cursor.close()

		# Convert to standard numpy types
		for ix in xrange(len(cursor.description)):
			row_attrs[cursor.description[ix][0]] = self._make_std_numpy_type(row_attrs[cursor.description[ix][0]], cursor.description[ix][1])
		gene_ids = row_attrs["TranscriptID"]

		# Remove any previous gene annotations
		table = bq_dataset.table(name="Genes")
		if table.exists():
			table.delete()

		# Upload the gene annotations
		self._export_attrs_to_bigquery(row_attrs, transcriptome, "Genes")

		# Remove any previous cell annotations
		table = bq_dataset.table(name="Cells")
		if table.exists():
			table.delete()

		# Prepare to upload counts
		table = bq_dataset.table(name="Counts")
		if table.exists():
			table.delete()
		table.create()
		table.schema = [
			bigquery.table.SchemaField("TranscriptID", 'INTEGER', mode='required'),
			bigquery.table.SchemaField("CellID", 'INTEGER', mode='required'),
			bigquery.table.SchemaField("Count", 'INTEGER', mode='required')
		]
		table.update()

		nrows = 0
		while True:
			cursor = connection.cursor()
			cursor.execute("""
			SELECT  
				CellID,
				TranscriptomeID,
				ChipWell,
				PlateWell,
				Diameter,
				Area,
				Red,
				Green,
				Blue,
				c.Valid,
				ChipID,
				StrtProtocol,
				DateDissected,
				DateCollected,
				h.Species,
				Strain,
				DonorID,
				Age,
				Sex,
				Weight,
				h.Tissue,
				Treatment,
				h.SpikeMolecules,
				Comments,
				h.User,
				"Time",
				Title,
				ProductionDate,
				PlateID,
				PlateReference,
				SampleType,
				CollectionMethod,
				FragmentLength,
				MolarConcentration,
				WeightConcentration,
				Protocol,
				BarcodeSet,
				"Status",
				"Comment",
				Aligner,
				Data
			FROM jos_aaacell c 
			LEFT JOIN jos_aaachip h 
				ON c.jos_aaachipid=h.id 
			LEFT JOIN jos_aaaproject p 
				ON h.jos_aaaprojectid=p.id
			RIGHT JOIN cells10k.ExprBlob e
				ON e.CellID=c.id 
			WHERE c.valid=1 AND e.TranscriptomeID = %s
			LIMIT 1000 OFFSET %s
			""", (transcriptome_id, nrows))
			if cursor.rowcount <= 0:
				if nrows == 0:
					print "No data available for this transcriptome: %d " % transcriptome_id
				break
			nrows += cursor.rowcount
			matrix = []
			headers = map(lambda x: x[0], cursor.description)
			col_attrs = {}
			for i in xrange(len(headers) - 1):	# -1 because the last column is "Data", the expression blob
				col_attrs[headers[i]] = []
			dt = np.dtype('int32')  # datatype for unpacking the Data blob
			dt = dt.newbyteorder('>')
			for row in cursor:
				data = np.frombuffer(row[-1], dt)
				matrix.append(data)
				for i in xrange(len(headers) - 1):
					col_attrs[headers[i]].append(row[i])
			cursor.close()

			# Convert to the appropriate numpy datatype
			for ix in xrange(len(cursor.description) - 1):	# -1 because we need to treat the Data column differently
				col_attrs[cursor.description[ix][0]] = self._make_std_numpy_type(col_attrs[cursor.description[ix][0]], cursor.description[ix][1])
			cell_ids = col_attrs["CellID"]

			self._export_attrs_to_bigquery(col_attrs, transcriptome, "Cells")

			# Save to a CSV file with three columns, TranscriptID, CellID, Count
			counts = np.array(matrix).transpose().reshape(-1).astype("int64")
			gene_ids_rept = np.repeat(gene_ids, len(cell_ids))
			cell_ids_rept = np.tile(cell_ids, len(gene_ids))
			data = np.array([gene_ids_rept, cell_ids_rept, counts]).T

			with tempfile.TemporaryFile(suffix=".csv") as tf:
				np.savetxt(tf, data, delimiter=",",fmt="%d")
				table.upload_from_file(tf, "CSV", rewind=True, write_disposition='WRITE_APPEND')

	def upload(self, config, cell_attrs = None, gene_attrs = None):
		"""
		Upload a custom dataset annotation to BigQuery.

		Args:
			config (DatasetConfig):	Configuration for the dataset
			cell_attrs (dict):		Optional dictionary of cell annotations (numpy arrays)
			gene_attrs (dict): 		Optional dictionary of gene annotations (numpy arrays)

		Returns:
			Nothing.

		At least one of cell_attrs or gene_attrs must be given. Both are dictionaries where the keys are attribute 
		names and the values are numpy arrays (of the same length). The 'CellID' (integer) field is required for
		cell_attrs, and the 'TranscriptID' (integer) is required for gene_attrs. However, if TranscriptID is a string
		array, integer TranscriptIDs will be created for you using the given transcriptome. Similarly, if CellID
		is not an integer array but a string array, it will be interpreted as a cell identifier based on the ChipID and
		PlateWell fields in the database (separated by an underscore). For example if CellID contains strings like
		"1772067-089_A01", these will be converted to integer CellIDs for you.
		"""
		connection = self.mysql_connection

		# Check the ID attributes, and convert as needed from string identifiers
		if cell_attrs == None and gene_attrs == None:
			raise ValueError, "Both cell_attrs and gene_attrs cannot be None."
		if cell_attrs != None:
			if not cell_attrs.__contains__("CellID"):
				raise ValueError, "'CellID' attribute is missing from cell_attrs."
			if cell_attrs["CellID"].dtype.kind != 'i' and cell_attrs["CellID"].dtype.kind != 'S':
				raise ValueError, "'CellID' attribute is not of type INTEGER or STRING."
			if cell_attrs["CellID"].dtype.kind == 'S':
				cell_id_mapping = self.get_cell_id_mapping(config.transcriptome)
				cell_attrs["CellID"] = np.array([cell_id_mapping[cell] for cell in cell_attrs["CellID"]])
		if gene_attrs != None:
			if not gene_attrs.__contains__("TranscriptID"):
				raise ValueError, "'TranscriptID' attribute is missing from gene_attrs."
			if gene_attrs["TranscriptID"].dtype.kind != 'i' and gene_attrs["TranscriptID"].dtype.kind != 'S':
				raise ValueError, "'TranscriptID' attribute is not of type INTEGER or STRING."
			if gene_attrs["TranscriptID"].dtype.kind == 'S':
				gene_id_mapping = self.get_transcript_id_mapping(config.transcriptome)
				gene_attrs["TranscriptID"] = np.array([gene_id_mapping[gene] for gene in gene_attrs["TranscriptID"]])

		# Send the dataset to BigQuery
		if cell_attrs != None:
			print "Uploading cell annotations"
			self._export_attrs_to_bigquery(cell_attrs, config.transcriptome, "Cells__" + config.project + "__" + config.dataset)
		if gene_attrs != None:
			print "Uploading gene annotations"
			self._export_attrs_to_bigquery(gene_attrs, condfig.transcriptome, "Genes__" + config.project + "__" + config.dataset)
		# Save the config
		config.put()
		print "Done."

	def _export_attrs_to_bigquery(self, attrs, transcriptome, tablename):
		"""
		Export a set of attributes to a table in BigQuery.

		Args:
			attrs (dict): 			A dictionary of attributes. Keys are attribute names. Values are numpy arrays, all the same length.
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')
			tablename (str): 		Name of the BigQuery table (e.g. 'Cells:Myproject@somedataset.loom')
			append (bool):			If True, append values instead of replacing existing values

		Returns:
			Nothing

		Tables for custom annotations are named like so: {Cells|Genes}:<project_name>@<datatset>.loom. For example, dataset "midbrain_embryo" in
		project "Midbrain" have annotations in Cells:Midbrain@midbrain_embryo.loom and Genes:Midbrain@midbrain_embryo.loom. Since project
		names can be used across transcriptome builds, projects can group together multi-species datasets.
		"""
		fields = attrs.keys()
		formats = []
		schema = []
		for ix in xrange(len(fields)):
			kind = attrs[fields[ix]].dtype.kind
			if kind == "S" or kind == "U":
				formats.append("%s")
				schema.append(bigquery.table.SchemaField(fields[ix], 'STRING'))
			elif kind == "b":
				formats.append("%s")
				schema.append(bigquery.table.SchemaField(fields[ix], 'BOOLEAN'))
			elif kind == "f":
				formats.append("%f")
				schema.append(bigquery.table.SchemaField(fields[ix], 'FLOAT'))
			elif kind == "i" or kind == "u":
				formats.append("%d")
				schema.append(bigquery.table.SchemaField(fields[ix], 'INTEGER'))
			else:
				raise TypeError, "Unsupported numpy datatype of kind '%s'" % kind

		# Prepare the table in BigQuery
		client = bigquery.Client(project=_cloud_project)
		bq_dataset = client.dataset(transcriptome)
		if not bq_dataset.exists():
			bq_dataset.create()
		table = bq_dataset.table(name=tablename)
		table.schema = schema

		if not table.exists():
			table.create()
		table.update()

		# Upload the data
		rows = []
		for ix in xrange(attrs[attrs.keys()[0]].shape[0]):
			row = []
			for a in xrange(len(fields)):
				row.append(formats[a] % (attrs[fields[a]][ix]))
			rows.append(row)

		with tempfile.NamedTemporaryFile(suffix = ".csv") as tf:
			csvwriter = csv.writer(tf, delimiter=',', doublequote = True, quoting = csv.QUOTE_ALL)
			csvwriter.writerows(rows)
			table.upload_from_file(tf, "CSV", rewind=True, write_disposition='WRITE_APPEND')

	def get_transcript_id_mapping(self, transcriptome):
		"""
		Get a dictionary that maps gene names to TranscriptID for the given transcriptome

		Args:
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')

		Returns:
			mapping (dict):		Mapping of gene names ("GeneName" column in "Transcript" table) to TranscriptID

		Performs a SQL query for each call. Best practice is to call it once, then use the resulting mapping for many conversions.
		"""
		connection = self.mysql_connection

		cursor = connection.cursor()
		cursor.execute("""
			SELECT GeneName, TranscriptID FROM cells10k.Transcript t1
			JOIN cells10k.Transcriptome t2 ON t1.TranscriptomeID = t2.TranscriptomeID 
			WHERE t2.name = %s
		""", transcriptome)
		rows = cursor.fetchall()
		cursor.close()

		mapping = {}
		for j in xrange(len(rows)):
			mapping[rows[j][0]] = rows[j][1]
		cursor.close()
		return mapping

	def get_cell_id_mapping(self, transcriptome):
		"""
		Get a dictionary that maps cell string identifiers to CellID for the given transcriptome

		Args:
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')

		Returns:
			mapping (dict):		Mapping of gene names ("GeneName" column in "Transcript" table) to TranscriptID

		Performs a SQL query for each call. Best practice is to call it once, then use the resulting mapping for many conversions.
		The resulting dictionary can be used to map identifiers in the style "1772067-089_A01" to integer CellIDs
		"""
		connection = self.mysql_connection

		# Get the transcriptome ID
		try:
			cursor = connection.cursor()
			cursor.execute('SELECT ID from jos_aaatranscriptome WHERE name = %s', transcriptome)
			transcriptome_id = cursor.fetchone()[0]
		except:
			raise ValueError, ("Could not find transcriptome ID for '%s'" % transcriptome)
		cursor.close()

		cursor = connection.cursor()
		cursor.execute("""
			SELECT jos_aaacell.id as CellID, ChipID, ChipWell
			FROM jos_aaacell
			JOIN jos_aaachip ON jos_aaachip.id = jos_aaacell.jos_aaachipid
			JOIN cells10k.ExprBlob ON jos_aaacell.id = cells10k.ExprBlob.CellID
			WHERE cells10k.ExprBlob.TranscriptomeID = %s
		""", transcriptome_id)
		rows = cursor.fetchall()
		cursor.close()

		mapping = {}
		for j in xrange(len(rows)):
			mapping[rows[j][1] + "_" + rows[j][2]] = rows[j][0]
		cursor.close()
		return mapping

	def list_transcriptomes(self):
		"""
		Get a list of valid transcriptomes

		Args:

		Returns:
			list of strings, valid transcriptomes
		"""
		cursor = self.mysql_connection.cursor()
		cursor.execute("""
			SELECT Name FROM cells10k.Transcriptome;
		""")
		rows = cursor.fetchall()
		return [r[0] for r in rows]


class _Query(object):
	def __init__(self, sql):
		client = bigquery.Client()
		request = client.run_sync_query(sql)
		request.timeout_ms = 60 * 1000 # One minute
		request.run()
		retries = 60 # One hour
		while retries > 0 and not request.complete:
			retries -= 1
			time.sleep(60)
			request.reload()
		if not request.complete:
			raise IOError, "Request did not complete in time"

		self.request = request
		self.schema = request.schema

	def as_dict(self):			
		"""
		Return the result as a dictionary of column names -> column values.
		"""
		(row_data, total_rows, page_token) = self.request.fetch_data()

		# Create empty numpy arrays to hold all the data
		result = {}
		type_conv = {"STRING": "string", "INTEGER": "int", "BOOLEAN": "bool", "FLOAT": "float"}
		for column in self.request.schema:
			result[column.name] = np.empty((total_rows,), dtype=type_conv[column.field_type])

		row_count = 0
		for row in row_data:
			for ix in len(self.request.schema):
				result[self.request.schema[ix].name][row_count] = row[ix]
			row_count += 1
		while page_token != None:
			(row_data, total_rows, page_token) = request.fetch_data(page_token = page_token)
			for row in row_data:
				for ix in len(self.request.schema):
					result[self.request.schema[ix].name][row_count] = row[ix]
				row_count += 1
		return result

	def as_matrix(self):
		"""
		Return result as a single numpy matrix.

		This will only work if the result is columns of the same types.
		"""
		(row_data, total_rows, page_token) = self.request.fetch_data()
		
		type_conv = {"STRING": "string", "INTEGER": "int", "BOOLEAN": "bool", "FLOAT": "float"}
		result = np.array((total_rows, len(row_data[0])), dtype = type_conv[self.request.schema[0].field_type])

		row_count = 0
		for row in row_data:
			for ix in len(row_data):
				result[row_count, ix] = row[ix]
			row_count += 1
		while page_token != None:
			(row_data, total_rows, page_token) = request.fetch_data(page_token = page_token)
			for row in row_data:
				for ix in len(row_data):
					result[row_count, ix] = row[ix]
				row_count += 1

		return result



class BigQueryToLoomPipeline(object):
	"""
	Pipeline to create .loom files from annotations in BigQuery and store them in Cloud Storage
	"""
	def __init__(self):
		pass

	# Check for work, then sleep a little, for ever
	def run(self):
		time.sleep(60*10)
		for t in transcriptomes:
			for d in datasets:
				self.create_loom_from_dataset(t, d)
				self.prepare_loom(t, d)
				self.loom_to_storage(t, d)

	def create_loom_from_dataset(self, config):
		"""
		Fetch a dataset from BigQuery and save it as a .loom file

		Args:
			config (DatasetConfig):	Configuration object for the dataset

		Returns:
			Nothing, but a .loom file is created.
		"""
		dname = dataset.split("__")[1]

		config.set_status("creating", "Collecting data and annotations.")

		client = bigquery.Client()

		genes_sql = ("SELECT * FROM [%s.Genes] all " % transcriptome) + \
				  ("JOIN [%s.Genes__%s] ds ON all.TranscriptID = ds.TranscriptID " % (transcriptome, dataset)) + \
				  ("ORDER BY all.TranscriptID")
		genes = _Query(genes_sql).as_dict()
		ngenes = len(genes[genes.keys()[0]])
		# Convert keys
		genes_converted = {}
		for key in genes.keys():
			if key.startswith("ds_"):
				genes_converted[dname + key[2:]] = genes[key]
			else:
				genes_converted[key] = genes[key]

		cells_sql = ("SELECT * FROM [%s.Cells] all " % transcriptome) + \
				  ("JOIN [%s.Cells__%s] ds ON all.CellID = ds.CellID " % (transcriptome, dataset)) + \
				  ("ORDER BY all.CellID")
		cells = _Query(cells_sql).as_dict()
		ncells = len(cells[cells.keys()[0]])
		# Convert keys
		cells_converted = {}
		for key in cells.keys():
			if key.startswith("ds_"):
				cells_converted[dname + key[2:]] = cells[key]
			else:
				cells_converted[key] = cells[key]

		count_sql = ("SELECT Count FROM [%s.Counts] m " % transcriptome) + \
				("JOIN [%s.Cells__%s] c ON m.CellID = c.CellID " % (transcriptome,dataset)) +\
				("JOIN [%s.Genes__%s] g ON m.TranscriptID = g.TranscriptID " % (transcriptome,dataset)) +\
				("ORDER BY g.TranscriptID, c.CellID")
		matrix = _Query(count_sql).as_matrix().reshape(ngenes, ncells)
		loom.create(config.get_loom_filename(), matrix, genes_converted, cells_converted)

	def prepare_loom(self, config):
		"""
		Prepare a loom file for browsing: clustering, projection, regression

		Args:
			config (DatasetConfig):	Configuration object for the dataset

		Returns:
			Nothing, but modifies the .loom file to add the following attributes:

			For cells:

				_PC1, _PC2			First and second principal component
				_tSNE1, _tSNE2		tSNE coordinates 1 and 2
				_Ordering			Ordering based on clustering
				_Cluster 			Cluster label
				_TotalRNA			Total number of RNA molecules (across included genes only)

			For genes:

				_Ordering			Ordering based on clustering
				_Cluster 			Cluster label
				_LogMean			Log of mean expression level
				_LogCV				Log of CV
				_Excluded			1 if the gene was excluded by feature selection, 0 otherwise
				_Noise				Excess noise above the noise model		

		"""

		# Connect
		config.set_status("creating", "Preparing the dataset: Step 0 (connecting).")
		ds = loom.connect(config.get_loom_filename())

		# feature selection
		config.set_status("creating", "Preparing the dataset: Step 1 (feature selection).")
		ds.feature_selection(config.n_features)

		# Projection
		config.set_status("creating", "Preparing the dataset: Step 2 (projection to 2D).")
		ds.project_to_2d()

		# Clustering
		if config.cluster_method == "BackSPIN":
			config.set_status("creating", "Preparing the dataset: Step 3 (BackSPIN clustering).")
			bsp = BackSPIN()
			result = bsp.backSPIN(ds)
			result.apply(dataset)
		elif config.cluster_method == "AP":
			config.set_status("creating", "Preparing the dataset: Step 3A (Affinity propagation on cells).")
			# Cells
			S = -ds.corr_matrix(axis = 1)
			preference = np.median(S) * 10
			cluster_centers_indices, labels = affinity_propagation(S, preference=preference)
			ds.set_attr("_Cluster", labels, axis = 1)
			ordering = np.argsort(labels)
			ds.set_attr("_Ordering", ordering, axis = 1)
			ds.permute(ordering, axis = 1)

			config.set_status("creating", "Preparing the dataset: Step 3B (Affinity propagation on genes).")
			# Genes
			S = -ds.corr_matrix(axis = 0)
			preference = np.median(S) * 10
			cluster_centers_indices, labels = affinity_propagation(S, preference=preference)
			ds.set_attr("_Cluster", labels, axis = 0)
			ordering = np.argsort(labels)
			ds.set_attr("_Ordering", ordering, axis = 0)
			ds.permute(ordering, axis = 0)

		# Regression
		config.set_status("creating", "Preparing the dataset: Step 4 (bayesian regression).")
		ds.bayesian_regression(config.regression_label)

		# Heatmap tiles
		config.set_status("creating", "Preparing the dataset: Step 5 (preparing heatmap tiles).")
		ds.prepare_heatmap()

		config.set_status("done")

if __name__ == '__main__':
	print "Starting the Loom pipeline..."
	lp = LoomPipeline()
	lp.run()
