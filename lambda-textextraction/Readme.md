# lambda-textextract

이 Repsitory는 [서버리스로 이미지에서 텍스트 추출하기](https://github.com/kyopark2014/serverless-textextraction)의 Lambda의 코드관리를 위함입니다.

여기서는 Synchrnous와 Asynchronous방식과 Synchrnous 방식 모두를 구현하여 비교합니다. 

## S3 저장

API Gateway를 통해 올라온 파일을 S3에 저장합니다. 

```java
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
```    


## Permission

아래와 같이 Textract와 S3에 대한 퍼미션을 추가 합니다. 

```java
        {
            "Effect": "Allow",
            "Action": [
                "textract:*"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:Put*",
                "s3:Get*",
                "s3:List*",
                "s3:Delete*"
            ],
            "Resource": "*"
        }
```      

## Synchronous 방식

Syncrhrous의 경우에는 Bucket 정보만 Textract에 제공합니다. Textract는 Bucket정보를 가지고 이미지를 로드하여 텍스트를 추출합니다. 추출된 데이터는 JSON 형태로 전달됩니다. 

```java
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
```

이때, 추출된 결과에서 text에 대한 정보는 아래와 같습니다. 

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

여기서 텍스트만을 아래와 같이 추출합니다. 

```java
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
```

## Asynchrnous 방식

Asynchrous로 요청하기 위해서는 아래와 같이 Textract가 SNS로 publish 할 수 있어야 합니다. 
따라서, request시 SNSTopicArn을 함께 전송합니다. 이것은 SNS에서 생성한 Token의 ARN 입니다.


```java
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
            RoleArn: 'arn:aws:iam::****:role/textract-sns',
            SNSTopicArn: 'arn:aws:sns:ap-northeast-2:****:sns-textract'
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
```

또한, RoleArn도 제공하여야 하는데, 여기서는 textract-sns라는 role을 IAM에서 정의후 사용하였습니다. 

```java
        {
            "Effect": "Allow",
            "Action": "textract:*",
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "sns:Publish",
                "sns:Subscribe",
                "sns:CreateTopic",
                "sns:GetTopicAttributes",
                "sns:SetTopicAttributes",
                "sns:TagResource",
                "sns:UntagResource",
                "sns:ListTagsForResource",
                "sns:ListSubscriptionsByTopic"
            ],
            "Resource": [
                "arn:aws:sns:ap-northeast-2:677146750822:sns-textract"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "sns:Publish"
            ],
            "Resource": "arn:aws:sns:*:*:AmazonTextract*"
        }
```

Asynchrous의 result에 대한 lambda 코드는 아래 repository를 참고 바랍니다. 

https://github.com/kyopark2014/lambda-textract-result
