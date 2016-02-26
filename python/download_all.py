import numpy as np
import pymysql
import pymysql.cursors
import sys
import os
import loom

if args.length != 8:
	print "Usage: download_all.py server port username password species transcriptomeId filename"
	sys.exit(1)

(server, port, username, password, species, tid, filename) = args

print "Connecting to %s:%s" % (server, port)
connection = pymysql.connect(
	host=server,   # Change to the server IP
	port=int(port),          # Change to the server port
	user=username,            # Change to the correct username
	password=password,        # Change to the correct password
	db='joomla',
	charset='utf8mb4'
)

# Download the gene annotations and make row_attrs (mouse only; change TranscriptomeID to get human)
print "Downloading gene attributes"
try:
	cursor = connection.cursor()
	cursor.execute("""
		SELECT * FROM cells10k.Transcript
		WHERE TranscriptomeID = %s
		ORDER BY ExprBlobIdx
	""" % tid)
	transcriptome_headers = map(lambda x: x[0],cursor.description)
	transcriptome = cursor.fetchall()
	row_attrs = {}
	for i in xrange(len(transcriptome_headers)):
			row_attrs[transcriptome_headers[i]] = []
			for j in xrange(len(transcriptome)):
					row_attrs[transcriptome_headers[i]].append(transcriptome[j][i])
	cursor.close()
except:
	print "Connection failed"
	sys.exit(1)

# Download the complete matrix (for mouse only; change to Hs to get human)
# Also creates the col_attrs
ds = None
nrows = 0
while True:
	print "Downloading cells %s through %s" % (nrows + 1, nrows + 1000)
	cursor = connection.cursor()
	cursor.execute("""
	SELECT  h.chipid,
					c.chipwell,
					p.plateid,
					c.platewell,
					h.species, 
					h.datedissected,
					h.datecollected,
					h.donorid,
					h.strain,
					h.age,
					h.sex,
					h.tissue,
					h.treatment,
					h.weight,
					c.diameter,
					c.area,
					c.red,
					c.blue,
					c.green,
					h.comments,
					h.spikemolecules,
					Data 
	FROM jos_aaacell c 
	LEFT JOIN jos_aaachip h 
			ON c.jos_aaachipid=h.id 
	LEFT JOIN jos_aaaproject p 
			ON h.jos_aaaprojectid=p.id
	RIGHT JOIN cells10k.ExprBlob e
			ON e.CellID=c.id 
	WHERE c.valid=1 AND h.species = "%s"
	LIMIT 1000 OFFSET %s
	""" % (species, nrows))
	if cursor.rowcount <= 0:
			break
	nrows += cursor.rowcount
	matrix = []
	headers = map(lambda x: x[0],cursor.description)
	col_attrs = {}
	for i in xrange(len(headers)-1):
			col_attrs[headers[i]] = []
	dt = np.dtype('int32')
	dt = dt.newbyteorder('>')
	for row in cursor:
			data = np.frombuffer(row[-1], dt)
			matrix.append(data)
			for i in xrange(len(headers)-1):
					col_attrs[headers[i]].append(row[i])
	cursor.close()
	matrix = np.array(matrix).transpose()
	col_attrs["CellID"] = map(lambda x: x[0]+'-'+x[1],zip(col_attrs["chipid"],col_attrs["chipwell"]))
	if ds == None:
			loom.create(filename, matrix,row_attrs,col_attrs)
			ds = loom.connect(filename)
	else:
			ds.add_columns(matrix, col_attrs)
print "Created .loom file with %s genes and %s cells" % ds.shape
