const aws = require('aws-sdk');
const cd = require('content-disposition');
const {v4: uuidv4} = require('uuid');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const path = require('path');
const bucket = "s3-storytime-textract";

exports.handler = async (event, context) => {
    // console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env))
    // console.log('## EVENT: ' + JSON.stringify(event))
    
    const body = Buffer.from(event["body-json"], "base64");
    // console.log('## EVENT: ' + JSON.stringify(event.params))
    // console.log('## EVENT: ' + JSON.stringify(event.context))

    var id, timestamp, ext, key;  
    var origName="";

    var contentType;
    if(event.params.header['Content-Type']) {
        contentType = event.params.header["Content-Type"];
    } 
    else if(event.params.header['content-type']) {
        contentType = event.params.header["content-type"];
    }
    // console.log('contentType = '+contentType); 

    var contentDisposition;
    if(event.params.header['Content-Disposition']) {
        contentDisposition = event.params.header["Content-Disposition"];  
    } 
    else if(event.params.header['content-disposition']) {
        contentDisposition = event.params.header["content-disposition"];  
    }
    // console.log('disposition = '+contentDisposition);

    if(contentDisposition) {
      origName = cd.parse(contentDisposition).parameters.filename;

      ext = path.parse(origName).ext;
    }
    
    if(!ext) {
      if(contentType == 'image/jpeg') ext = '.jpeg';
      else if(contentType == 'image/jpg') ext = '.jpg';
      else if(contentType == 'image/png') ext = '.png';
      else ext = '.jpeg';  // default
    }
    // console.log('ext: ', ext);

    id = uuidv4(); // generate uuid

    if(origName) {
        key = origName;
    }
    else {
        origName = key;
        key = origName;
    }

    var date = new Date();        
    timestamp = Math.floor(date.getTime()/1000).toString();

    // putObject to S3
    console.log('start upload: ' + id);
    try {
        const destparams = {
            Bucket: bucket, 
            Key: key,  // use uuid for filename in order to escape duplicated filename 
            Body: body,
            ContentType: contentType
        };
        const {putResult} = await s3.putObject(destparams).promise(); 
  
        console.log('finish upload: ' + id);
    } catch (error) {
        console.log(error);
        return;
    } 

    // asynchronous approach
    const TEXTRACT = new aws.Textract();
    const params = { 
        DocumentLocation: {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        },
        FeatureTypes: [
            'TABLES', 'FORMS'
        ],
        NotificationChannel: {
            RoleArn: 'arn:aws:iam::677146750822:role/textract-sns',
            SNSTopicArn: 'arn:aws:sns:ap-northeast-2:677146750822:sns-textract'
        } 
    };
    try {
        const result = await TEXTRACT.startDocumentAnalysis(params).promise();
        console.log('result: '+ JSON.stringify(result));
             
        var jobId = result.JobId;
        console.log('jobId: '+jobId);
    } catch(error) {
        console.log(error);
    }

    // synchronous approach
    var textData, data;    
    var startEventTime = new Date().getTime();     

    const synchronousParams = {
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key
          },
        },
    }
    try {
        data = await TEXTRACT.detectDocumentText(synchronousParams).promise();
        console.log('result: '+ JSON.stringify(data));             
    } catch(error) {
        console.log(error);
    }
    if(data) {
        // text extraction
        console.log('start text extraction synchronously');
        for (var i = 0; i < data.Blocks.length; i++) {
            if(data.Blocks[i].BlockType == 'LINE') {
                textData += (data.Blocks[i].Text+' ');
            }
        }
        console.log('text: '+textData);
    }
    var finishEventTime = new Date().getTime();     

    var elapsedTime = (Math.floor((finishEventTime-startEventTime)/100)/10).toString();
    console.log('elapsed time for synchronous textract: '+elapsedTime);
    
    const eventInfo = {
        Id: id,
        Timestamp: timestamp,
        Bucket: bucket, 
        Key: key,
        Time: elapsedTime,
        TextData: textData,
    };    
    const response = {
        statusCode: 200,
        headers: {
          'ETag': id,
          'Timestamp': timestamp
        },
        body: JSON.stringify(eventInfo)
    };
    return response;
};