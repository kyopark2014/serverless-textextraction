const aws = require('aws-sdk');

exports.handler = async (event, context) => {
    // console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env))
    console.log('## EVENT: ' + JSON.stringify(event))
    
    // console.log('## EVENT: ' + JSON.stringify(event.params))
    // console.log('## EVENT: ' + JSON.stringify(event.context))

    var textData="";

    var job = JSON.parse(event['Records'][0]['Sns']['Message']);
    console.log('job: '+job);

    var jobId = job['JobId'];
    console.log('jobId: '+jobId);

    var data;
    if(jobId) {
        const TEXTRACT = new aws.Textract();
        
        const getParms = {
            JobId: jobId 
        }
        try {
            data = await TEXTRACT.getDocumentAnalysis(getParms).promise();
            console.log('result: '+ JSON.stringify(data));
        } catch(error) {
            console.log(error);
        }  
    }

    console.log('Blocks[0]: '+JSON.stringify(data.Blocks[0]));
    console.log('Blocks[1]: '+JSON.stringify(data.Blocks[1]));

    if(data) {
        // text extraction
        console.log('start text extraction');
        for (var i = 0; i < data.Blocks.length; i++) {
            if(data.Blocks[i].BlockType == 'LINE') {
                textData += (data.Blocks[i].Text+' ');
            }
        }
        console.log('text: '+textData);
    }
    
    const response = {
        statusCode: 200,
    //    body: JSON.stringify(JSON.stringify(rsult));
    };
    return response;
};