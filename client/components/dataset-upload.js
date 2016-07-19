import React from 'react';
import { Grid, Col, Row } from 'react-bootstrap';
import { CreateDataSetForm } from './dataset-upload-createdatasetform';

const CreateDataSetInstructions = function () {
	return (
		<div>
			<h2>Create a new dataset</h2>
			<h3>Instructions</h3>
			<p>To generate a dataset, the user must supply the names of: </p>
			<ul>
				<li>the dataset to be created</li>
				<li>the user the dataset belongs to</li>
				<li>the project the dataset belongs to</li>
			</ul>
			<p>Furthermore, the pipeline also needs: </p>
			<ul>
				<li>a CSV file of cell attributes from which the dataset is generated</li>
				<li><i>(optionally) </i> a CSV file of gene attributes</li>
			</ul>
			<p>Before uploading these CSV files a minimal check will be applied, hopefully catching the most likely
				scenarios.If the CSV file contains semi-colons instead of commas (most likely the result of regional
				settings in whatever software was used to generate the file), they will automatically be replaced
				before submitting.Please double-check if the result is correct in that case.
			</p>
			<p><i>Note: </i> you can still submit a file with a wrong file extension or (what appears to be)
				malformed content, as validation might turn up false positives.We assume you know what you are doing,
				just be careful!
			</p>
			<p>Finally, the pipeline requires the following parameters: </p>
			<ul>
				<li>The number of features - at least 100 and not more than the total number of genes in the transcriptome</li>
				<li>The clustring method to apply - Affinity Propagation or BackSPIN</li>
				<li>Regression label - must be one of the column attributes
				(either from the file supplied by the user or from the standard cell attributes) </li>
			</ul>
		</div>
	);
};

export const CreateDataSet = function () {
	return (
		<Grid>
			<Row>
				<Col xs={12} md={8}>
					<CreateDataSetInstructions />
					<br />
					<CreateDataSetForm />
				</Col>
			</Row>
		</Grid>
	);
};


