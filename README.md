# 서버리스로 이미지에서 텍스트 추출하기 

여기서는 이미지에서 텍스트를 추출할때 Textract를 사용하는 방법에 대해 설명합니다. 유사한 기능을 하는 AWS 서비스중에 Rekognition은 현재 이미지당 글자수 제한이 있지만, Textract는 이런 제한이 없습니다. 

Textract로 이미지 1장에 대한 변환시 아래와 같은 결과를 얻을 수 있었습니다.

[Text Extraction]

[Lambda for Textextraction](https://github.com/kyopark2014/serverless-textextraction/tree/main/lambda-textextraction)에서는 Synchronous하게 텍스트를 추출하는 방법에 대해 설명합니다. 


[텍스트 추출에 이용한 이미지]

![longwords-rotate](https://user-images.githubusercontent.com/52392004/158514855-70ba231c-bcf7-4026-a9a1-5c5cd115236e.jpeg)



[Async로 할 경우]

소요시간은 15초 입니다.

2022-03-16T02:09:03.394Z	e9ea449c-f624-40d8-9194-b9786b1dfaab	INFO	result: {
    "JobId": "157a95b2c75977f499bbb6139749a81d6d051708f94dda71f00dfd57769cafc7"
}

2022-03-16T02:09:18.045Z	d416c5fc-f431-442a-b474-9f6e00c0d3e8	INFO	text: Cinderella and the mice went to ask Gabrielle about the last time she remembered seeing the bracelet, but she couldn't remember. "I can help you look," a soft voice said. It was Babette, stepping out of her little house. Jaq and Gus looked suspiciously at Babette, but Cinderella spoke up for her. "That would be wonderful. Thank you, Babette!" Gus and Jaq reluctantly agreed. "We check the mouse-size places and Cinderelly check the princess-size places." The three mice scurried from room to room. They looked behind curtains, on top of cabinets, and even in the tea room. Gus checked inside an entire tea set. "Gus-Gus, Cinderelly's bracelet isn't in a teapot," Jaq laughed. Gus looked embarrassed, but Babette spoke up quietly. "It never hurts to check."

[Asynchronous로 할 경우]

소요시간은 2.1초 입니다. 

2022-03-16T02:42:40.886Z	1a18b74d-b54a-431c-8f1e-16a01402d285	INFO	elapsed time for synchronous textract: 2.1


## Synchronous 방법 

Synchronous 방법으로 텍스트 추출시에 구조는 아래와 같습니다. 사용자가 API Gateway를 통해 이미지를 업로드하면 Lambda가 S3에 저장하고 이 정보를 Textrect에 전달하여 분석합니다. 분석한 결과는 로그로 추출하지만 SNS를 통해 이메일등으로 발송 할 수 있습니다. 

<img width="425" alt="image" src="https://user-images.githubusercontent.com/52392004/158508387-cef50a38-3233-4c42-abd5-05a221fd12a8.png">

Textrect 조회시 사용하는 파라메터에는 아래와 같은 정보가 있습니다. 

```java
    const synchronousParams = {
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key
          },
        },
    }
```    


Textract에 Synchronous로 요청시는 detectDocumentText를 사용합니다. 

```java
    try {
        data = await TEXTRACT.detectDocumentText(synchronousParams).promise();
        console.log('result: '+ JSON.stringify(data));             
    } catch(error) {
        console.log(error);
    }
```    

이때 주어지는 데이터의 형태는 아래와 같습니다. 따라서, Blocks에서 BlockType이 "LINE"인 것을 모아서 Text만 extraction 할 수 있습니다. 

```java
{
    "Blocks": [
        {
            "BlockType": "LINE",
            "Confidence": 98.88526153564453,
            "Text": "remembered seeing the bracelet, but she couldn't remember.",
            "Geometry": {
                "BoundingBox": {
                    "Width": 0.07995972037315369,
                    "Height": 0.538274347782135,
                    "Left": 0.14604748785495758,
                    "Top": 0.3591235280036926
                },
                "Polygon": [
                    {
                        "X": 0.14604748785495758,
                        "Y": 0.8973978161811829
                    },
                    {
                        "X": 0.1676093488931656,
                        "Y": 0.3591235280036926
                    },
                    {
                        "X": 0.22600719332695007,
                        "Y": 0.3596041798591614
                    },
                    {
                        "X": 0.20634333789348602,
                        "Y": 0.8972249627113342
                    }
                ]
            },
```      

상세한 구현 사항은 아래 lambda-textextract repository를 참고 합니다. 

https://github.com/kyopark2014/lambda-textextract


## Asynchronous 방법

Asynchronous 방법으로 구현시는 사용자가 API Gateway로 올린 이미지를 S3에 저장후 Synchronous와 마찬가지로 Textrect에 요청합니다. Textract는 Job ID를 Lambda (Textract)에 전달하고, 결과는 분석이 완료한 후에 SNS로 publish 합니다. Lambda (result)는 SNS에서 event가 trigger되면, Job Id를 event에서 확인후 다시 Textract에 결과를 조회합니다. 결과는 Json형태로 전달되면 이를 사용하기 위해서 text로 변환 합니다. 

<img width="533" alt="image" src="https://user-images.githubusercontent.com/52392004/158508654-3e820243-8d2f-4c37-adfc-020d267f8ffe.png">

Asynchrhonous 방법으로 구현시는 사용자가 API Gateway로 올린 이미지를 S3에 저장후 Synchronous와 마찬가지로 Textrect에 요청합니다. Textract는 Job ID를 Lambda (Textract)에 전달하고, 결과는 분석이 완료한 후에 SNS로 publish 합니다. Lambda (result)는 SNS에서 event가 trigger되면, Job Id를 event에서 확인후 다시 Textract에 결과를 조회합니다. 결과는 Json형태로 전달되면 이를 사용하기 위해서 text로 변환 합니다.


[Lambda for Textexraction](https://github.com/kyopark2014/serverless-textextraction/tree/main/lambda-textextraction)에서는 Asynchronous하게 텍스트를 추출하는 방법에 대해 설명합니다. 또한 [Lambda for Textextraction Result](https://github.com/kyopark2014/serverless-textextraction/tree/main/lambda-textract-result)는 Asyncronous하게 동작시 결과를 추출하는 방법에 대해 설명합니다.

Asynchronous인 경우에는 textract에 NofitionChannel 정보를 아래와 같이 전달합니다. 

```java
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
            RoleArn: 'arn:aws:iam::****:role/textract-sns',
            SNSTopicArn: 'arn:aws:sns:ap-northeast-2:****:sns-textract'
        } 
    };
```

Textract에 아래와 같이 분석을 요청 합니다. 

```java
    try {
        const result = await TEXTRACT.startDocumentAnalysis(params).promise();
        console.log('result: '+ JSON.stringify(result));
             
        var jobId = result.JobId;
        console.log('jobId: '+jobId);
    } catch(error) {
        console.log(error);
    }
```

결과는 아래와 같이 job ID를 가지고 getDocumentAnalysis로 조회합니다. 

```java
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

상세한 구현 사항은 아래 lambda-textextract와 lambda-textract-result repository들을 참고 합니다. 

https://github.com/kyopark2014/serverless-textextraction/tree/main/lambda-textextraction

https://github.com/kyopark2014/serverless-textextraction/tree/main/lambda-textract-result
