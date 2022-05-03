# lambda-textract-result

이 Repsitory는 [서버리스로 이미지에서 텍스트 추출하기](https://github.com/kyopark2014/serverless-textextraction)의 Asynchronous 방식에서 데이터를 추출하는 Lambda의 코드관리를 위함입니다.

Textract에서 추출한 test정보는 event의 형태로 Lambda로 전달됩니다. 이때, 전달되는 event의 정보는 아래와 같습니다. 

```java
{
    "Records": [
        {
            "EventSource": "aws:sns",
            "EventVersion": "1.0",
            "EventSubscriptionArn": "arn:aws:sns:ap-northeast-2:****:sns-textract:21064a5a-de4b-4fa1-928d-c81788bc395e",
            "Sns": {
                "Type": "Notification",
                "MessageId": "8c712e9d-f4ae-5507-9d95-7436cb8374e3",
                "TopicArn": "arn:aws:sns:ap-northeast-2:677146750822:sns-textract",
                "Subject": null,
                "Message": "{\"JobId\":\"c1316c8f2c4b15e92482a195de1ab50465b0fee3e4bbfb7c98ab36505143ae1c\",\"Status\":\"SUCCEEDED\",\"API\":\"StartDocumentAnalysis\",\"Timestamp\":1647394029289,\"DocumentLocation\":{\"S3ObjectName\":\"long-words.jpeg\",\"S3Bucket\":\"s3-storytime-textract\"}}",
                "Timestamp": "2022-03-16T01:27:09.386Z",
                "SignatureVersion": "1",
                "Signature": "aM7O9plBQ5YoeqrQkMHa8F6Qsn4k+fJg7QOUzF5IGQGuvsW3GXUzan9LbYoMvlAUttmm/Z9zhmWsFJ7mvsAyVrmO0HAlXr2iAY9yogg8IEQBD1wO5hdCu5yIkiOqeEy9AupjJNUtmNUND84aANzsRrdERP1TMVBvcW9zwvcOpQ5grd9xLHlUpSuZ9n/SMOS3agFFV03QPTePoJIDfj2QZqkZEycZ5PkmLcC4hZ8XQXM0yRiRr8PvIjfUvwhYf0bR5JSbgSzSkVx2XfCtpTXXH50HXKRhuCchnYNmx6M2/mv0WCip7gxXbHWwx54sxv6enHClKLgM29tG8/v1+x8B7w==",
                "SigningCertUrl": "https://sns.ap-northeast-2.amazonaws.com/SimpleNotificationService-7ff5318490ec183fbaddaa2a969abfda.pem",
                "UnsubscribeUrl": "https://sns.ap-northeast-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:ap-northeast-2:677146750822:sns-textract:21064a5a-de4b-4fa1-928d-c81788bc395e",
                "MessageAttributes": {}
            }
        }
    ]
}
```

여기서, 아래와 같이 job ID를 추출합니다. 

```java
    var job = JSON.parse(event['Records'][0]['Sns']['Message']);
    console.log('job: '+job);

    var jobId = job['JobId'];
    console.log('jobId: '+jobId);
````

jobId를 이용하여 Textract에 결과를 요청합니다. 

```java
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
```

결과는 JSON 형태로 전달되며 아래와 같이 text만 추출합니다. 

```java
        // text extraction
        console.log('start text extraction');
        for (var i = 0; i < data.Blocks.length; i++) {
            if(data.Blocks[i].BlockType == 'LINE') {
                textData += (data.Blocks[i].Text+' ');
            }
        }
        console.log('text: '+textData);
```        
    
